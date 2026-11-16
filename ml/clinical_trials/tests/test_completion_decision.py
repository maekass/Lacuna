"""Tests for the completion decision tool: triage metrics, decision gate,
point-in-time features (one leakage test per feature), censoring filter,
shadow log integrity and shadow scoring."""

from __future__ import annotations

import json
import math
import tempfile
import unittest
from datetime import date
from pathlib import Path

import numpy as np

from lacuna_ct import completion_decision as cdec
from lacuna_ct import decision_metrics as dm
from lacuna_ct import point_in_time as pit
from lacuna_ct import shadow_log
from lacuna_ct.fetch_training_data import TrialRecord
from lacuna_ct.shadow_scoring import first_predictions, score

REPO = Path(__file__).resolve().parents[3]
PREREG = dm.load_preregistration()


def _rec(nct: str, sponsor: str = "Acme Pharma Inc", completed: int | None = 1, **kw) -> TrialRecord:
    base = dict(
        nct_id=nct,
        title="Study of drug",
        phase="PHASE2",
        status="COMPLETED" if completed == 1 else ("TERMINATED" if completed == 0 else "RECRUITING"),
        condition="Asthma",
        sponsor=sponsor,
        enrollment=50,
        interventions="Drug",
        label_wh=0,
        label_terminated=None,
        source_query="asthma",
        label_completed=completed,
        start_year=2020,
    )
    base.update(kw)
    return TrialRecord(**base)


# --------------------------------------------------------------------------- #
# Decision metrics + gate
# --------------------------------------------------------------------------- #


class DecisionMetricTests(unittest.TestCase):
    def setUp(self) -> None:
        rng = np.random.default_rng(0)
        self.n = 400
        self.y = (rng.random(self.n) > 0.15).astype(int)  # ~15% stopped
        self.ids = [f"NCT{i:08d}" for i in range(self.n)]

    def test_perfect_ranking(self) -> None:
        p = np.where(self.y == 1, 0.9, 0.1)
        out = dm.decision_metrics(self.y, p, self.ids, k_fractions=[0.1], n_boot=200)["top_10pct"]
        stopped = int((1 - self.y).sum())
        self.assertEqual(out["reviewed"], math.ceil(0.1 * self.n))
        self.assertEqual(out["precision_at_k"], 1.0)
        self.assertAlmostEqual(out["recall_at_k"], out["reviewed"] / stopped)
        self.assertAlmostEqual(out["lift_at_k"], 1.0 / (stopped / self.n))
        lo, hi = out["lift_at_k_ci_95"]
        self.assertLessEqual(lo, out["lift_at_k"])
        self.assertGreaterEqual(hi, out["lift_at_k"])

    def test_inverted_ranking_has_zero_precision(self) -> None:
        p = np.where(self.y == 1, 0.1, 0.9)  # stopped trials look safest
        out = dm.decision_metrics(self.y, p, self.ids, k_fractions=[0.05], n_boot=100)["top_5pct"]
        self.assertEqual(out["precision_at_k"], 0.0)
        self.assertEqual(out["lift_at_k"], 0.0)

    def test_constant_scores_tie_break_by_id(self) -> None:
        p = np.full(self.n, 0.8)
        point = dm.top_k_point(1 - self.y, 1 - p, self.ids, 0.1)
        expected = int((1 - self.y)[: point["reviewed"]].sum())  # ids are already sorted
        self.assertEqual(point["stopped_in_reviewed"], expected)

    def test_fast_bootstrap_ranking_matches_reference(self) -> None:
        rng = np.random.default_rng(3)
        risk = rng.random(self.n).round(2)  # many ties
        stopped = 1 - self.y
        tiebreak = np.argsort(np.argsort(np.asarray(self.ids)))
        p, r, lift = dm._fast_top_k(stopped, risk, tiebreak, 0.1)
        ref = dm.top_k_point(stopped, risk, self.ids, 0.1)
        self.assertAlmostEqual(p, ref["precision_at_k"])
        self.assertAlmostEqual(r, ref["recall_at_k"])
        self.assertAlmostEqual(lift, ref["lift_at_k"])

    def test_net_benefit_matches_formula(self) -> None:
        p = np.where(self.y == 1, 0.9, 0.3)
        rows = dm.net_benefit_table(self.y, p, [0.2])
        risk = 1 - p
        tp = int(np.sum((risk >= 0.2) & (self.y == 0)))
        fp = int(np.sum((risk >= 0.2) & (self.y == 1)))
        self.assertAlmostEqual(rows[0]["net_benefit_model"], tp / self.n - fp / self.n * 0.25)
        self.assertEqual(rows[0]["net_benefit_review_none"], 0.0)


def _metrics(auc_lo=0.6, brier=0.10, base=0.11, ece=0.03) -> dict:
    return {"roc_auc_ci_lower": auc_lo, "brier": brier, "base_rate_brier": base, "expected_calibration_error": ece}


class DecisionGateTests(unittest.TestCase):
    def _decision(self, lift_lo: float) -> dict:
        return {"top_10pct": {"lift_at_k_ci_95": [lift_lo, lift_lo + 1]}}

    def test_passes_when_all_checks_pass(self) -> None:
        gate = dm.decision_gate(_metrics(), self._decision(1.2), PREREG)
        self.assertTrue(gate["passes"], gate)
        self.assertEqual(gate["gate_version"], "decision-gate-v1")

    def test_each_check_can_fail_alone(self) -> None:
        cases = {
            "auc_ci_lower": (_metrics(auc_lo=0.55), 1.2),
            "brier_vs_base_rate": (_metrics(brier=0.11), 1.2),
            "calibration_ece": (_metrics(ece=0.051), 1.2),
            "lift_at_primary_k_ci_lower": (_metrics(), 1.0),
        }
        for name, (metrics, lift) in cases.items():
            gate = dm.decision_gate(metrics, self._decision(lift), PREREG)
            self.assertFalse(gate["passes"], name)
            self.assertEqual(gate["failed_checks"], [name])

    def test_accuracy_is_not_part_of_the_gate(self) -> None:
        metrics = {**_metrics(), "accuracy": 0.1, "majority_baseline_accuracy": 0.9}
        self.assertTrue(dm.decision_gate(metrics, self._decision(1.5), PREREG)["passes"])

    def test_preregistered_values_are_pinned(self) -> None:
        th = PREREG["export_gate"]["thresholds"]
        self.assertEqual(th["lift_at_primary_k_ci_lower_min_exclusive"], 1.0)
        self.assertEqual(th["auc_ci_lower_min_exclusive"], 0.55)
        self.assertEqual(th["ece_max_inclusive"], 0.05)
        self.assertEqual(PREREG["decision"]["primary_k"], 0.1)
        self.assertEqual(PREREG["decision"]["k_fractions"], [0.05, 0.1, 0.2])
        self.assertTrue(PREREG["written_before_test_evaluation"])


# --------------------------------------------------------------------------- #
# Point-in-time features: one leakage test per feature
# --------------------------------------------------------------------------- #


class DateAndCensoringTests(unittest.TestCase):
    def test_parse_dates(self) -> None:
        self.assertEqual(pit.parse_ctgov_date("2024"), date(2024, 1, 1))
        self.assertEqual(pit.parse_ctgov_date("2024-05"), date(2024, 5, 1))
        self.assertEqual(pit.parse_ctgov_date("2024-05-17"), date(2024, 5, 17))
        self.assertIsNone(pit.parse_ctgov_date("May 2024"))
        self.assertIsNone(pit.parse_ctgov_date(None))

    def test_min_follow_up_filter(self) -> None:
        ref = date(2026, 11, 16)
        self.assertTrue(pit.passes_min_follow_up(date(2024, 11, 16), ref, 24))
        self.assertFalse(pit.passes_min_follow_up(date(2024, 11, 17), ref, 24))
        self.assertFalse(pit.passes_min_follow_up(None, ref, 24))
        self.assertEqual(pit.add_months(date(2024, 1, 31), 1), date(2024, 2, 29))


class SponsorTrackRecordLeakageTests(unittest.TestCase):
    """Each sponsor feature must use only outcomes public before the anchor date."""

    def setUp(self) -> None:
        self.records = [
            _rec("NCT00000001", completed=0),  # stopped, public 2019
            _rec("NCT00000002", completed=1),  # completed, public 2020
            _rec("NCT00000003", completed=0),  # stopped, public 2023 (after target anchor)
            _rec("NCT00000009", completed=None),  # target, still running
            _rec("NCT00000010", sponsor="Other Univ", completed=0),
        ]
        self.sup = {
            "NCT00000001": {"last_update_post_date": "2019-03-01"},
            "NCT00000002": {"last_update_post_date": "2020-06-01"},
            "NCT00000003": {"last_update_post_date": "2023-01-01"},
            "NCT00000009": {"start_date": "2022-01", "study_first_submit_date": "2021-12-01", "last_update_post_date": "2026-01-01"},
            "NCT00000010": {"last_update_post_date": "2018-01-01"},
        }

    def _features(self, records, sup) -> list[float]:
        hist = pit.build_sponsor_history(records, sup)
        rows, _ = pit.sponsor_feature_matrix([records[3]], sup, hist, 0.2)
        return rows[0]

    def test_counts_only_outcomes_public_before_anchor(self) -> None:
        f = self._features(self.records, self.sup)
        self.assertAlmostEqual(f[0], math.log1p(2))  # sponsor_prior_trials_log1p
        self.assertAlmostEqual(f[1], (1 + 5 * 0.2) / (2 + 5))  # sponsor_prior_stop_rate_smoothed
        self.assertEqual(f[2], 1.0)  # sponsor_has_prior

    def test_future_outcomes_do_not_change_any_feature(self) -> None:
        base = self._features(self.records, self.sup)
        changed = list(self.records)
        changed[2] = _rec("NCT00000003", completed=1)  # flip a post-anchor outcome
        changed.append(_rec("NCT00000004", completed=0))  # outcome public exactly at the anchor
        sup = {**self.sup, "NCT00000004": {"last_update_post_date": "2021-12-01"}}
        hist = pit.build_sponsor_history(changed, sup)
        rows, _ = pit.sponsor_feature_matrix([changed[3]], sup, hist, 0.2)
        self.assertEqual(rows[0], base)

    def test_target_own_label_never_used(self) -> None:
        base = self._features(self.records, self.sup)
        for label in (0, 1):
            recs = list(self.records)
            recs[3] = _rec("NCT00000009", completed=label)
            # even if its own outcome were public long before its anchor
            sup = {**self.sup, "NCT00000009": {**self.sup["NCT00000009"], "last_update_post_date": "2000-01-01"}}
            hist = pit.build_sponsor_history(recs, sup)
            n, s = hist.counts(pit.normalize_sponsor(recs[3].sponsor), date(2021, 12, 1), "NCT00000009")
            self.assertEqual(n, 2)
            self.assertEqual(pit.sponsor_features(n, s, 0.2), base)

    def test_other_sponsors_ignored_and_names_normalized(self) -> None:
        recs = list(self.records)
        recs[4] = _rec("NCT00000010", sponsor="  ACME   pharma inc ", completed=0)
        f = self._features(recs, self.sup)
        self.assertAlmostEqual(f[0], math.log1p(3))

    def test_anchor_is_min_of_start_and_first_submit(self) -> None:
        self.assertEqual(pit.anchor_date("2022-01", "2021-12-01"), date(2021, 12, 1))
        self.assertEqual(pit.anchor_date("2020-05", "2021-12-01"), date(2020, 5, 1))
        self.assertIsNone(pit.anchor_date(None, None))

    def test_no_anchor_means_no_history(self) -> None:
        hist = pit.build_sponsor_history(self.records, self.sup)
        self.assertEqual(hist.counts("acme pharma inc", None, "x"), (0, 0))


V0 = {
    "v0_status": "NOT_YET_RECRUITING",
    "v0_enrollment": 120,
    "v0_site_count": 4,
    "v0_start_date": "2022-03",
    "v0_completion_date": "2024-03",
    "v0_first_submit_date": "2022-01-01",
}
MEDIANS = [1.5, 0.7, 0.0, 30.0, 1.0]


class FirstVersionLeakageTests(unittest.TestCase):
    """Each v0 feature reads only version-0 fields and cannot encode the outcome."""

    def test_values(self) -> None:
        row, ok = pit.v0_feature_row(V0, MEDIANS)
        self.assertTrue(ok)
        self.assertAlmostEqual(row[0], math.log10(120))
        self.assertAlmostEqual(row[1], math.log1p(4))
        self.assertEqual(row[2], 1.0)
        self.assertAlmostEqual(row[3], (date(2024, 3, 1) - date(2022, 3, 1)).days / 30.4375)
        self.assertAlmostEqual(row[4], (date(2022, 3, 1) - date(2022, 1, 1)).days / 30.4375)

    def test_each_feature_depends_only_on_its_v0_field(self) -> None:
        base, _ = pit.v0_feature_row(V0, MEDIANS)
        edits = {
            0: {"v0_enrollment": 10},
            1: {"v0_site_count": 40},
            2: {"v0_status": "RECRUITING"},
            3: {"v0_completion_date": "2030-01"},
        }
        for idx, edit in edits.items():
            row, _ = pit.v0_feature_row({**V0, **edit}, MEDIANS)
            changed = [i for i in range(5) if row[i] != base[i]]
            self.assertEqual(changed, [idx], edit)
        row, _ = pit.v0_feature_row({**V0, "v0_first_submit_date": "2021-01-01"}, MEDIANS)
        self.assertEqual([i for i in range(5) if row[i] != base[i]], [4])

    def test_current_record_and_outcome_fields_are_ignored(self) -> None:
        base, _ = pit.v0_feature_row(V0, MEDIANS)
        noisy = {
            **V0,
            "overall_status": "WITHDRAWN",
            "enrollment": 0,
            "status": "TERMINATED",
            "n_versions": 40,
            "label_completed": 0,
        }
        self.assertEqual(pit.v0_feature_row(noisy, MEDIANS)[0], base)

    def test_post_outcome_version_0_is_imputed_without_indicator(self) -> None:
        rows = {s: pit.v0_feature_row({**V0, "v0_status": s}, MEDIANS) for s in ("COMPLETED", "WITHDRAWN", "TERMINATED", "SUSPENDED")}
        for status, (row, ok) in rows.items():
            self.assertFalse(ok, status)
            self.assertEqual(row, MEDIANS, status)  # identical for every final status
        self.assertEqual(pit.v0_feature_row(None, MEDIANS), (MEDIANS, False))

    def test_withdrawn_zero_enrollment_pattern_absent_from_v0(self) -> None:
        # Current-record enrollment is reset to 0 on withdrawal; v0 keeps the plan.
        row, _ = pit.v0_feature_row({**V0, "v0_enrollment": None}, MEDIANS)
        self.assertEqual(row[0], MEDIANS[0])

    def test_medians_ignore_unusable_rows(self) -> None:
        med = pit.v0_training_medians([V0, {**V0, "v0_status": "COMPLETED", "v0_enrollment": 10**6}, None])
        self.assertAlmostEqual(med[0], math.log10(120))

    def test_change_count_features_are_demo_only(self) -> None:
        ch = [{"status": "NOT_YET_RECRUITING"}, {"status": "RECRUITING"}, {"status": "RECRUITING"}, {"status": "WITHDRAWN"}]
        self.assertEqual(
            cdec.change_count_features(ch),
            {"amendment_count_full_history": 3.0, "status_changes_full_history": 2.0},
        )
        self.assertNotIn("amendment_count_full_history", cdec.NEW_FEATURE_NAMES)


class V4DesignMatrixLeakageTests(unittest.TestCase):
    def test_status_enrollment_and_results_do_not_reach_the_model(self) -> None:
        a = _rec("NCT00000001", completed=1, enrollment=300, has_results=True)
        b = _rec("NCT00000001", completed=0, enrollment=0, has_results=False)
        xa = cdec.v4_design_matrix([a], [[0.0, 0.2, 0.0]], [MEDIANS])
        xb = cdec.v4_design_matrix([b], [[0.0, 0.2, 0.0]], [MEDIANS])
        self.assertEqual(xa.tolist(), xb.tolist())
        self.assertEqual(xa.shape[1], 1 + 7 + len(cdec.NEW_FEATURE_NAMES))


# --------------------------------------------------------------------------- #
# Shadow log + scoring
# --------------------------------------------------------------------------- #


def _shadow(nct: str, p: float, bucket: str = "below_top_20pct", at: str = "2026-11-16T00:00:00+00:00", decision=None) -> dict:
    return shadow_log.make_record(
        nct_id=nct,
        model_id="completion-proxy-v3",
        model_version="3.0.0-logreg",
        artifact_sha256="a" * 64,
        probability_completed=p,
        rank_bucket=bucket,
        source="test",
        predicted_at=at,
        reviewer_decision=decision,
    )


class ShadowLogTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "log.jsonl"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_api_copy_is_identical(self) -> None:
        ml = (REPO / "ml/clinical_trials/lacuna_ct/shadow_log.py").read_bytes()
        api = (REPO / "services/python-api/app/shadow_log.py").read_bytes()
        self.assertEqual(ml, api)

    def test_append_is_append_only_and_chained(self) -> None:
        shadow_log.append_record(self.path, _shadow("NCT00000001", 0.9))
        before = self.path.read_bytes()
        shadow_log.append_record(self.path, _shadow("NCT00000002", 0.4))
        after = self.path.read_bytes()
        self.assertTrue(after.startswith(before))
        records = shadow_log.read_log(self.path)
        self.assertEqual(records[0]["prev_sha256"], shadow_log.GENESIS)
        self.assertEqual(len(records), 2)
        self.assertEqual(shadow_log.verify_log(self.path), 2)

    def test_tampering_is_detected(self) -> None:
        for i in range(3):
            shadow_log.append_record(self.path, _shadow(f"NCT0000000{i}", 0.5 + i / 10))
        lines = self.path.read_bytes().splitlines(keepends=True)
        variants = {
            "edit": lines[0] + lines[1].replace(b'"probability_completed":0.6', b'"probability_completed":0.1') + lines[2],
            "delete": lines[0] + lines[2],
            "reorder": lines[1] + lines[0] + lines[2],
        }
        for name, body in variants.items():
            self.path.write_bytes(body)
            with self.assertRaises(shadow_log.ShadowLogError, msg=name):
                shadow_log.verify_log(self.path)

    def test_rank_bucket_and_override(self) -> None:
        th = {"top_5pct": 0.4, "top_10pct": 0.3, "top_20pct": 0.2}
        self.assertEqual(shadow_log.rank_bucket(0.45, th), "top_5pct")
        self.assertEqual(shadow_log.rank_bucket(0.3, th), "top_10pct")
        self.assertEqual(shadow_log.rank_bucket(0.25, th), "top_20pct")
        self.assertEqual(shadow_log.rank_bucket(0.1, th), "below_top_20pct")
        flagged = _shadow("NCT00000001", 0.6, "top_10pct", decision="no_review")
        self.assertTrue(flagged["model_flags_for_review"])
        self.assertTrue(flagged["reviewer_override"])
        agree = _shadow("NCT00000001", 0.9, "below_top_20pct", decision="no_review")
        self.assertFalse(agree["reviewer_override"])
        self.assertIsNone(_shadow("NCT00000001", 0.9)["reviewer_override"])
        with self.assertRaises(ValueError):
            _shadow("NCT00000001", 0.9, "top_1pct")

    def test_committed_log_verifies(self) -> None:
        path = REPO / "ml/clinical_trials/shadow/completion_predictions.jsonl"
        if path.exists():
            self.assertGreater(shadow_log.verify_log(path), 0)


class ShadowScoringTests(unittest.TestCase):
    def test_first_prediction_only(self) -> None:
        recs = [
            _shadow("NCT00000001", 0.9, at="2026-11-17T00:00:00+00:00"),
            _shadow("NCT00000001", 0.1, at="2026-11-16T00:00:00+00:00"),
        ]
        firsts = first_predictions(recs)
        self.assertEqual(len(firsts), 1)
        self.assertEqual(firsts[0]["probability_completed"], 0.1)

    def test_unresolved_trials_give_no_metrics(self) -> None:
        recs = [_shadow(f"NCT{i:08d}", 0.8) for i in range(10)]
        out = score(recs, {f"NCT{i:08d}": {"overall_status": "RECRUITING"} for i in range(10)}, now=lambda: "t")
        entry = out["versions"]["3.0.0-logreg"]
        self.assertEqual(entry["resolved"], 0)
        self.assertIsNone(entry["metrics_on_resolved"])

    def test_scores_resolved_trials(self) -> None:
        rng = np.random.default_rng(1)
        recs, outcomes = [], {}
        for i in range(200):
            stopped = i % 4 == 0
            p = float(np.clip((0.3 if stopped else 0.85) + rng.normal(0, 0.1), 0.01, 0.99))
            recs.append(_shadow(f"NCT{i:08d}", p, "top_10pct" if p < 0.5 else "below_top_20pct", decision="review" if i < 5 else None))
            outcomes[f"NCT{i:08d}"] = {"overall_status": "TERMINATED" if stopped else "COMPLETED"}
        out = score(recs, outcomes, n_boot=200, now=lambda: "t")["versions"]["3.0.0-logreg"]
        self.assertEqual(out["resolved"], 200)
        self.assertGreater(out["metrics_on_resolved"]["roc_auc"], 0.9)
        self.assertGreater(out["metrics_on_resolved"]["decision"]["top_10pct"]["lift_at_k"], 2.0)
        self.assertEqual(out["reviewer"]["with_decision"], 5)

    def test_score_script_rejects_tampered_log(self) -> None:
        import subprocess
        import sys

        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "log.jsonl"
            shadow_log.append_record(log, _shadow("NCT00000001", 0.9))
            shadow_log.append_record(log, _shadow("NCT00000002", 0.8))
            outcomes = Path(tmp) / "outcomes.json"
            outcomes.write_text(json.dumps({"NCT00000001": {"overall_status": "COMPLETED"}}))
            cmd = [
                sys.executable,
                str(REPO / "ml/clinical_trials/scripts/score_shadow_log.py"),
                "--log", str(log), "--outcomes", str(outcomes), "--report", str(Path(tmp) / "r.json"),
            ]
            env = {"PYTHONPATH": str(REPO / "ml/clinical_trials"), "PATH": "/usr/bin:/bin"}
            ok = subprocess.run(cmd, env=env, capture_output=True, text=True)
            self.assertEqual(ok.returncode, 0, ok.stderr)
            report = json.loads((Path(tmp) / "r.json").read_text())
            self.assertEqual(report["versions"]["3.0.0-logreg"]["resolved"], 1)
            lines = log.read_bytes().splitlines(keepends=True)
            log.write_bytes(lines[1])
            bad = subprocess.run(cmd, env=env, capture_output=True, text=True)
            self.assertEqual(bad.returncode, 1)


if __name__ == "__main__":
    unittest.main()
