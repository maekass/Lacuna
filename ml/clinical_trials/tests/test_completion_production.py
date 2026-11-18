"""Tests for the completion-proxy v3 production pipeline and drift checks."""

from __future__ import annotations

import unittest
from pathlib import Path

import numpy as np

from lacuna_ct import completion_features as cf
from lacuna_ct.completion_production import (
    BASELINE_VERSION,
    CHALLENGER_VERSION,
    calibration_split,
    labeled_records,
    promotion_decision,
    run,
    temporal_split,
)
from lacuna_ct.drift import (
    PSI_ALERT,
    build_reference_profile,
    compare_to_reference,
    psi,
)
from lacuna_ct.fetch_training_data import TrialRecord, _sponsor_class

REPO = Path(__file__).resolve().parents[3]
NAMES = ["phase_num", "count", "flag"]


def _record(i: int, *, year: int | None, completed: int | None, enrollment: int = 50) -> TrialRecord:
    return TrialRecord(
        nct_id=f"NCT{i:08d}",
        title=f"Study {i} of drug",
        phase="PHASE2",
        status="COMPLETED" if completed else "TERMINATED",
        condition="Endometriosis",
        sponsor="Acme Pharma Inc",
        enrollment=enrollment,
        interventions="Drug A, Placebo",
        label_wh=1,
        label_terminated=None,
        source_query="endometriosis",
        label_completed=completed,
        start_year=year,
    )


def _features(rng: np.random.Generator, n: int, *, shift: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    phase = rng.choice([0.0, 1.0, 2.0, 3.0, 4.0], size=n, p=[0.3, 0.15, 0.25, 0.2, 0.1])
    if shift:
        phase = np.where(rng.random(n) < shift, 3.0, phase)
    count = rng.poisson(2 + 6 * shift, size=n).astype(float) + rng.random(n)
    flag = (rng.random(n) < 0.4 + 0.5 * shift).astype(float)
    scores = np.clip(rng.beta(8 - 5 * shift, 2 + 3 * shift, size=n), 0, 1)
    return np.column_stack([phase, count, flag]), scores


class DriftTests(unittest.TestCase):
    def setUp(self) -> None:
        rng = np.random.default_rng(0)
        ref_x, ref_s = _features(rng, 5000)
        self.profile = build_reference_profile(ref_x, NAMES, ref_s)

    def test_psi_zero_for_identical_distribution(self) -> None:
        self.assertAlmostEqual(psi([0.2, 0.3, 0.5], [0.2, 0.3, 0.5]), 0.0)

    def test_quiet_on_same_distribution(self) -> None:
        cur_x, cur_s = _features(np.random.default_rng(1), 2000)
        report = compare_to_reference(self.profile, cur_x, NAMES, cur_s)
        self.assertEqual(report["status"], "stable", report["drifted"] + report["warned"])
        self.assertEqual(report["drifted"], [])
        for item in report["features"].values():
            self.assertLess(item["psi"], 0.1)
        self.assertLess(report["prediction_score"]["psi"], 0.1)

    def test_detects_shifted_features_and_scores(self) -> None:
        cur_x, cur_s = _features(np.random.default_rng(2), 2000, shift=0.6)
        report = compare_to_reference(self.profile, cur_x, NAMES, cur_s)
        self.assertEqual(report["status"], "drift")
        self.assertIn("count", report["drifted"])
        self.assertIn("prediction_score", report["drifted"])
        self.assertGreater(report["features"]["count"]["psi"], PSI_ALERT)

    def test_unseen_categorical_level_counts_as_drift(self) -> None:
        cur_x, cur_s = _features(np.random.default_rng(3), 2000)
        cur_x[:, 0] = 9.0  # level never seen in the reference
        report = compare_to_reference(self.profile, cur_x, NAMES, cur_s)
        self.assertIn("phase_num", report["drifted"])

    def test_empty_current_window_raises(self) -> None:
        with self.assertRaises(ValueError):
            compare_to_reference(self.profile, np.zeros((0, 3)), NAMES, np.zeros(0))


class FeaturizerTests(unittest.TestCase):
    def test_api_copy_is_identical(self) -> None:
        ml_copy = (REPO / "ml/clinical_trials/lacuna_ct/completion_features.py").read_text()
        api_copy = (REPO / "services/python-api/app/completion_features.py").read_text()
        self.assertEqual(ml_copy, api_copy)

    def test_leaky_fields_do_not_change_features(self) -> None:
        base = {
            "title": "A trial",
            "condition": "Endometriosis",
            "interventions": "Drug A",
            "sponsor": "Univ Hospital",
            "phase": "PHASE3",
        }
        leaky = {
            **base,
            "status": "WITHDRAWN",
            "enrollment": 0,
            "has_results": True,
            "start_year": 2030,
            "why_stopped": "funding",
        }
        self.assertEqual(cf.model_row(base), cf.model_row(leaky))
        for field in ("enrollment", "has_results", "status", "start_year"):
            self.assertIn(field, cf.EXCLUDED_FIELDS)

    def test_list_and_string_inputs_match(self) -> None:
        a = cf.model_row({"title": "x", "condition": "A, B", "interventions": "D1, D2", "sponsor": "s"})
        b = cf.model_row({"title": "x", "condition": ["A", "B"], "interventions": ["D1", "D2"], "sponsor": "s"})
        self.assertEqual(a, b)

    def test_sponsor_class_matches_ingest(self) -> None:
        for name in ("Harvard University", "Acme Pharma", "City Clinic", "NIH", "Foo GmbH"):
            self.assertEqual(cf.sponsor_class(name), _sponsor_class(name))


class SplitAndPromotionTests(unittest.TestCase):
    def test_temporal_split_and_calibration_stay_inside_train(self) -> None:
        records = [_record(i, year=2000 + i % 20, completed=int(i % 3 != 0)) for i in range(400)]
        records.append(_record(999, year=None, completed=1))
        records.append(_record(998, year=2010, completed=None))
        labeled = labeled_records(records)
        self.assertEqual(len(labeled), 400)
        labels = np.asarray([r.label_completed for r in labeled])
        train_idx, test_idx, split = temporal_split(labeled)
        cutoff = split["cutoff_year"]
        self.assertTrue(all(labeled[i].start_year <= cutoff for i in train_idx))
        self.assertTrue(all(labeled[i].start_year > cutoff for i in test_idx))
        fit_idx, cal_idx = calibration_split(train_idx, labels)
        self.assertEqual(set(fit_idx) | set(cal_idx), set(train_idx))
        self.assertFalse(set(cal_idx) & set(test_idx))
        self.assertFalse(set(fit_idx) & set(cal_idx))

    def test_duplicate_nct_ids_fail(self) -> None:
        with self.assertRaises(ValueError):
            labeled_records([_record(1, year=2010, completed=1), _record(1, year=2011, completed=0)])

    def _metrics(self, passes: bool) -> dict:
        return {"export_gate": {"passes": passes, "reason": "ok" if passes else "accuracy <= majority"}}

    def _paired(self, lower: float) -> dict:
        return {"roc_auc_delta": {"point": lower + 0.01, "ci_95_lower": lower, "ci_95_upper": lower + 0.02}}

    def test_challenger_promoted_only_when_ci_and_gate_pass(self) -> None:
        d = promotion_decision(self._metrics(True), self._metrics(True), self._paired(0.01))
        self.assertEqual(d["champion_version"], CHALLENGER_VERSION)

    def test_baseline_stays_when_ci_includes_zero(self) -> None:
        d = promotion_decision(self._metrics(True), self._metrics(True), self._paired(-0.001))
        self.assertEqual(d["champion_version"], BASELINE_VERSION)
        self.assertFalse(d["promoted_challenger"])

    def test_baseline_stays_when_challenger_fails_gate(self) -> None:
        d = promotion_decision(self._metrics(True), self._metrics(False), self._paired(0.05))
        self.assertEqual(d["champion_version"], BASELINE_VERSION)
        self.assertTrue(d["reasons_challenger_not_promoted"])

    def test_refuses_synthetic_snapshot(self) -> None:
        with self.assertRaises(ValueError):
            run([], snapshot_meta={"source": "synthetic_seed"}, registry_dir=Path("/nonexistent"), archive_dir=Path("/nonexistent"))


class DriftScriptTests(unittest.TestCase):
    """Exercise the CLI against the committed champion with synthetic input."""

    SCRIPT = REPO / "ml/clinical_trials/scripts/check_completion_drift.py"

    def _run(self, rows: list[dict], *extra: str) -> tuple[int, dict | None]:
        import json
        import os
        import subprocess
        import sys
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / "rows.json"
            report = Path(tmp) / "report.json"
            data.write_text(json.dumps(rows))
            env = {**os.environ, "PYTHONPATH": str(REPO / "ml/clinical_trials")}
            proc = subprocess.run(
                [sys.executable, str(self.SCRIPT), "--input", str(data), "--report", str(report), *extra],
                env=env,
                capture_output=True,
                text=True,
            )
            payload = json.loads(report.read_text()) if report.exists() else None
            return proc.returncode, payload

    def test_shifted_input_fails_with_exit_1(self) -> None:
        rows = [
            {
                "title": "Long " * 40,
                "condition": ", ".join(f"C{j}" for j in range(12)),
                "interventions": ", ".join(f"D{j}" for j in range(15)),
                "sponsor": "Acme Pharma Inc",
                "phase": "PHASE4",
                "study_type": "OBSERVATIONAL",
            }
            for _ in range(300)
        ]
        code, report = self._run(rows)
        self.assertEqual(code, 1)
        assert report is not None
        self.assertEqual(report["status"], "drift")
        self.assertIn("intervention_count", report["drifted"])
        code, _ = self._run(rows, "--no-fail")
        self.assertEqual(code, 0)

    def test_too_few_rows_refuses_with_exit_2(self) -> None:
        code, report = self._run([{"title": "x"}] * 5)
        self.assertEqual(code, 2)
        self.assertIsNone(report)


if __name__ == "__main__":
    unittest.main()
