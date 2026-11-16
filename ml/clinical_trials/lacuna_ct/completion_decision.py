"""Decision-tool evaluation for the completion-proxy classifier.

Implements ``preregistration/completion-decision-v1.json``:

* triage metrics (precision/recall/lift at top-k% stop risk) with bootstrap
  CIs and a net-benefit table, for the served v3 champion and the v4 candidate;
* the pre-registered decision export gate (AUC CI, Brier, ECE, lift@10% CI);
* v4 candidate = v3 recipe + leakage-tested point-in-time sponsor track
  record, compared with v3 on the same temporal holdout (paired bootstrap)
  and promoted only under the existing rule;
* minimum-follow-up censoring filter (metrics with and without);
* external cohort (different condition queries, no NCT overlap) and
  calibration by phase and sponsor class.

The v3 artifact is loaded from the registry and its sha256 is verified, so v3
numbers come from the exact served model.
"""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import platform
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from lacuna_ct import completion_features as cf
from lacuna_ct import completion_production as cp
from lacuna_ct import decision_metrics as dm
from lacuna_ct import point_in_time as pit
from lacuna_ct.benchmark_stats import paired_bootstrap_comparison
from lacuna_ct.fetch_training_data import TrialRecord
from lacuna_ct.train import passes_export_gate

CANDIDATE_VERSION = "4.0.0-logreg-pit"
V3_VERSION = cp.BASELINE_VERSION
STOPPED_STATUSES = ("TERMINATED", "WITHDRAWN", "SUSPENDED")


# --------------------------------------------------------------------------- #
# Features + model
# --------------------------------------------------------------------------- #


NEW_FEATURE_NAMES: tuple[str, ...] = (*pit.SPONSOR_FEATURE_NAMES, *pit.V0_FEATURE_NAMES)


def v4_design_matrix(
    records: Sequence[TrialRecord],
    sponsor_rows: Sequence[Sequence[float]],
    v0_rows: Sequence[Sequence[float]],
) -> np.ndarray:
    rows = []
    for record, sponsor, v0 in zip(records, sponsor_rows, v0_rows):
        rows.append([*cf.model_row(cp.record_to_trial(record)), *sponsor, *v0])
    return np.asarray(rows, dtype=object)


def v0_matrix(
    records: Sequence[TrialRecord], first_versions: Mapping[str, Mapping[str, Any]], medians: Sequence[float]
) -> tuple[list[list[float]], np.ndarray]:
    rows, usable = [], []
    for r in records:
        row, ok = pit.v0_feature_row(first_versions.get(r.nct_id), medians)
        rows.append(row)
        usable.append(ok)
    return rows, np.asarray(usable)


def change_count_features(changes: Sequence[Mapping[str, Any]]) -> dict[str, float]:
    statuses = [c.get("status") for c in changes]
    return {
        "amendment_count_full_history": float(max(len(changes) - 1, 0)),
        "status_changes_full_history": float(sum(1 for a, b in zip(statuses, statuses[1:]) if a != b)),
    }


def build_v4_logistic() -> Pipeline:
    n_numeric = len(cf.NUMERIC_FEATURE_NAMES) + len(NEW_FEATURE_NAMES)
    return Pipeline(
        [
            (
                "features",
                ColumnTransformer(
                    [
                        ("tfidf", cp._tfidf(), 0),
                        ("num", StandardScaler(), list(range(1, 1 + n_numeric))),
                    ]
                ),
            ),
            (
                "clf",
                LogisticRegression(max_iter=1500, class_weight="balanced", random_state=cp.SPLIT_SEED),
            ),
        ]
    )


# --------------------------------------------------------------------------- #
# Evaluation helpers
# --------------------------------------------------------------------------- #


def full_metrics(
    y: np.ndarray,
    p: np.ndarray,
    ids: Sequence[str],
    prereg: Mapping[str, Any],
    *,
    n_boot: int,
) -> dict[str, Any]:
    m = cp.evaluate(y, p, n_boot=n_boot)
    legacy = m.pop("export_gate")
    m.pop("reliability_bins", None)
    m["legacy_accuracy_gate"] = legacy
    decision = dm.decision_metrics(
        y, p, ids, k_fractions=prereg["decision"]["k_fractions"], n_boot=n_boot
    )
    m["decision"] = decision
    m["net_benefit"] = dm.net_benefit_table(
        y, p, prereg["decision"]["net_benefit"]["threshold_probabilities"]
    )
    m["export_gate"] = dm.decision_gate(m, decision, prereg)
    return m


def light_metrics(
    y: np.ndarray, p: np.ndarray, ids: Sequence[str], prereg: Mapping[str, Any], *, n_boot: int
) -> dict[str, Any]:
    """Same as ``full_metrics`` but used for report-only cohorts (no gate)."""
    m = full_metrics(y, p, ids, prereg, n_boot=n_boot)
    m["export_gate"]["note"] = "report-only cohort; the gate is decided on the unfiltered temporal holdout"
    return m


def single_feature_auc(values: np.ndarray, y: np.ndarray) -> dict[str, float]:
    if len(np.unique(values)) < 2:
        return {"roc_auc": 0.5, "max_direction_auc": 0.5, "constant": True}
    auc = float(roc_auc_score(y, values))
    return {"roc_auc": auc, "max_direction_auc": max(auc, 1 - auc), "constant": False}


def label_completeness_by_start_year(records: Sequence[TrialRecord]) -> dict[str, Any]:
    by_year: dict[int, Counter] = {}
    for r in records:
        if r.start_year is None:
            continue
        c = by_year.setdefault(int(r.start_year), Counter())
        c["all"] += 1
        if r.label_completed is not None:
            c["labeled"] += 1
            c["stopped"] += 1 - int(r.label_completed)
    return {
        str(y): {
            "trials": c["all"],
            "labeled": c["labeled"],
            "labeled_fraction": c["labeled"] / c["all"],
            "stopped_share_of_labeled": (c["stopped"] / c["labeled"]) if c["labeled"] else None,
        }
        for y, c in sorted(by_year.items())
        if y >= 2015
    }


def load_v3(registry_dir: Path) -> tuple[Any, dict[str, Any], dict[str, Any]]:
    manifest = json.loads((registry_dir / "manifest.json").read_text(encoding="utf-8"))
    entry = manifest["versions"][V3_VERSION]
    path = registry_dir / entry["artifact"]
    if cp.file_sha256(path) != entry["artifact_sha256"]:
        raise ValueError("v3 artifact sha256 does not match manifest")
    return joblib.load(path), entry, manifest


def rank_thresholds(p_completed: np.ndarray, ids: Sequence[str], k_fractions: Sequence[float]) -> dict[str, float]:
    """Risk cut points that put the top k% of the holdout in each bucket."""
    risk = 1 - np.asarray(p_completed, dtype=float)
    order = dm.rank_order(risk, ids)
    out = {}
    for k in k_fractions:
        m = dm.top_k_size(len(risk), k)
        out[f"top_{int(round(k * 100))}pct"] = float(risk[order[m - 1]])
    return out


# --------------------------------------------------------------------------- #
# Main run
# --------------------------------------------------------------------------- #


def run(
    records: list[TrialRecord],
    *,
    snapshot_meta: Mapping[str, Any],
    supplement: Mapping[str, Mapping[str, Any]],
    supplement_meta: Mapping[str, Any],
    external_records: list[TrialRecord],
    external_supplement: Mapping[str, Mapping[str, Any]],
    external_meta: Mapping[str, Any],
    history_probe: Mapping[str, Any],
    first_versions: Mapping[str, Mapping[str, Any]],
    holdout_changes: Mapping[str, Sequence[Mapping[str, Any]]],
    first_versions_meta: Mapping[str, Any],
    registry_dir: Path,
    archive_dir: Path,
    n_boot: int,
    prereg: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    if snapshot_meta.get("source") != "clinicaltrials_gov_api_v2":
        raise ValueError("Refusing to evaluate on a non-CT.gov snapshot.")
    prereg = prereg or dm.load_preregistration()
    labeled = cp.labeled_records(records)
    labels = np.asarray([int(r.label_completed) for r in labeled])  # type: ignore[arg-type]
    ids = [r.nct_id for r in labeled]
    train_idx, test_idx, split = cp.temporal_split(labeled)
    fit_idx, cal_idx = cp.calibration_split(train_idx, labels)
    committed_split = json.loads((registry_dir / "split.json").read_text(encoding="utf-8"))
    if sorted(ids[i] for i in test_idx) != committed_split["test_nct_ids"]:
        raise ValueError("Holdout rows differ from the committed v3 split.json")
    if sorted(ids[i] for i in cal_idx) != committed_split["calibration_nct_ids"]:
        raise ValueError("Calibration rows differ from the committed v3 split.json")
    y_test = labels[test_idx]
    test_ids = [ids[i] for i in test_idx]

    # ---- v3 (served artifact) -------------------------------------------- #
    v3_model, v3_entry, manifest = load_v3(registry_dir)
    X3 = cp.design_matrix(labeled)
    p3 = v3_model.predict_proba(X3[test_idx])[:, 1]

    # ---- v4 candidate: v3 + sponsor track record -------------------------- #
    history = pit.build_sponsor_history(records, supplement)
    prior_stop = float(1 - labels[fit_idx].mean())
    sponsor_rows, sponsor_audit = pit.sponsor_feature_matrix(labeled, supplement, history, prior_stop)
    v0_medians = pit.v0_training_medians([first_versions.get(labeled[i].nct_id) for i in fit_idx])
    v0_rows, v0_usable = v0_matrix(labeled, first_versions, v0_medians)
    X4 = v4_design_matrix(labeled, sponsor_rows, v0_rows)
    v4_model = cp.fit_calibrated(build_v4_logistic(), X4, labels, fit_idx, cal_idx)
    p4 = v4_model.predict_proba(X4[test_idx])[:, 1]

    # ---- leakage audit for new features ---------------------------------- #
    S = np.column_stack([np.asarray(sponsor_rows, dtype=float), np.asarray(v0_rows, dtype=float)])
    alarm = float(prereg["candidate_v4"]["leakage_alarm"].split("> ")[1].split(" ")[0])
    feature_audit = {}
    for j, name in enumerate(NEW_FEATURE_NAMES):
        stats = single_feature_auc(S[test_idx, j], y_test)
        stats["train_fit_auc"] = single_feature_auc(S[fit_idx, j], labels[fit_idx])["roc_auc"]
        stats["alarm"] = stats["max_direction_auc"] > alarm
        feature_audit[name] = stats
    anchors_missing = sum(1 for a in sponsor_audit if a["anchor"] is None)
    # Excluded change-count features: leakage demonstration on the holdout only.
    excluded_demo: dict[str, Any] = {}
    have = [k for k, i in enumerate(test_idx) if ids[i] in holdout_changes]
    if have:
        yy = y_test[have]
        feats = [change_count_features(holdout_changes[ids[test_idx[k]]]) for k in have]
        for name in feats[0]:
            vals = np.asarray([f[name] for f in feats])
            excluded_demo[name] = {**single_feature_auc(vals, yy), "n": len(have), "used_as_model_input": False}
    v0_status_counts = Counter(
        str((first_versions.get(r.nct_id) or {}).get("v0_status") or "MISSING") for r in labeled
    )
    leakage_ok = not any(v["alarm"] for v in feature_audit.values())
    test_with_prior = int(np.sum(S[test_idx, 2] > 0))

    # ---- holdout metrics -------------------------------------------------- #
    m3 = full_metrics(y_test, p3, test_ids, prereg, n_boot=n_boot)
    m4 = full_metrics(y_test, p4, test_ids, prereg, n_boot=n_boot)
    paired = paired_bootstrap_comparison(y_test, p3, p4, n_resamples=n_boot)
    paired["direction"] = {
        "roc_auc_delta": "positive_favors_v4",
        "pr_auc_delta": "positive_favors_v4",
        "brier_delta": "negative_favors_v4",
        "log_loss_delta": "negative_favors_v4",
    }
    beats = float(paired["roc_auc_delta"]["ci_95_lower"]) > 0.0
    promote = beats and m4["export_gate"]["passes"] and leakage_ok
    reasons = []
    if not beats:
        reasons.append(f"paired ROC AUC delta CI lower {paired['roc_auc_delta']['ci_95_lower']:.4f} is not above 0")
    if not m4["export_gate"]["passes"]:
        reasons.append(f"v4 fails decision gate: {m4['export_gate']['reason']}")
    if not leakage_ok:
        reasons.append("v4 new-feature leakage alarm")
    promotion = {
        "rule": prereg["candidate_v4"]["promotion_rule"],
        "v4_beats_v3_by_paired_ci": beats,
        "v4_passes_decision_gate": bool(m4["export_gate"]["passes"]),
        "v4_leakage_alarm_clear": leakage_ok,
        "v3_passes_decision_gate": bool(m3["export_gate"]["passes"]),
        "champion_version": CANDIDATE_VERSION if promote else V3_VERSION,
        "promoted_candidate": promote,
        "reasons_candidate_not_promoted": reasons,
    }

    # base-rate (random) reference on the holdout
    train_rate = float(labels[train_idx].mean())
    p_base = np.full(len(y_test), train_rate)
    base_decision = dm.decision_metrics(
        y_test, p_base, test_ids, k_fractions=prereg["decision"]["k_fractions"], n_boot=n_boot
    )

    # ---- censoring filter ------------------------------------------------- #
    ref = datetime.fromisoformat(str(snapshot_meta["generated_at_utc"])).date()
    months = int(prereg["censoring"]["min_follow_up_months"])
    keep = np.asarray(
        [
            pit.passes_min_follow_up(pit.parse_ctgov_date((supplement.get(ids[i]) or {}).get("start_date")), ref, months)
            for i in test_idx
        ]
    )
    yf = y_test[keep]
    fids = [t for t, k in zip(test_ids, keep) if k]
    censoring = {
        "rule": prereg["censoring"]["rule"],
        "reference_date": ref.isoformat(),
        "holdout_rows_kept": int(keep.sum()),
        "holdout_rows_dropped": int((~keep).sum()),
        "kept_class_counts": {"completed": int(yf.sum()), "stopped": int(len(yf) - yf.sum())},
        "label_completeness_by_start_year": label_completeness_by_start_year(records),
    }
    if len(np.unique(yf)) == 2 and len(yf) >= 40:
        censoring[V3_VERSION] = light_metrics(yf, p3[keep], fids, prereg, n_boot=n_boot)
        censoring[CANDIDATE_VERSION] = light_metrics(yf, p4[keep], fids, prereg, n_boot=n_boot)
        censoring["paired_v4_minus_v3"] = paired_bootstrap_comparison(yf, p3[keep], p4[keep], n_resamples=n_boot)
    else:
        censoring["note"] = "too few filtered rows for metrics"

    # ---- external cohort -------------------------------------------------- #
    ext_labeled = cp.labeled_records(external_records)
    yx = np.asarray([int(r.label_completed) for r in ext_labeled])  # type: ignore[arg-type]
    xids = [r.nct_id for r in ext_labeled]
    pooled_sup = {**supplement, **external_supplement}
    ext_history = pit.build_sponsor_history([*records, *external_records], pooled_sup)
    ext_sponsor, _ = pit.sponsor_feature_matrix(ext_labeled, pooled_sup, ext_history, prior_stop)
    ext_v0, ext_usable = v0_matrix(ext_labeled, first_versions, v0_medians)
    px3 = v3_model.predict_proba(cp.design_matrix(ext_labeled))[:, 1]
    px4 = v4_model.predict_proba(v4_design_matrix(ext_labeled, ext_sponsor, ext_v0))[:, 1]
    cutoff = int(split["cutoff_year"])
    late = np.asarray([int(r.start_year) > cutoff for r in ext_labeled])  # type: ignore[arg-type]
    external: dict[str, Any] = {
        "provenance": {k: v for k, v in external_meta.items() if k != "per_query"},
        "per_query": external_meta.get("per_query"),
        "labeled_with_start_year": int(len(yx)),
        "class_counts": {"completed": int(yx.sum()), "stopped": int(len(yx) - yx.sum())},
        "sponsor_history_pool": "training snapshot + external cohort, outcomes public before each trial's anchor date",
        "primary_all_years": {
            V3_VERSION: light_metrics(yx, px3, xids, prereg, n_boot=n_boot),
            CANDIDATE_VERSION: light_metrics(yx, px4, xids, prereg, n_boot=n_boot),
            "paired_v4_minus_v3": paired_bootstrap_comparison(yx, px3, px4, n_resamples=n_boot),
        },
    }
    yl = yx[late]
    lids = [t for t, k in zip(xids, late) if k]
    external["secondary_start_year_gt_cutoff"] = {
        "n": int(late.sum()),
        "class_counts": {"completed": int(yl.sum()), "stopped": int(len(yl) - yl.sum())},
    }
    if len(np.unique(yl)) == 2 and len(yl) >= 40:
        external["secondary_start_year_gt_cutoff"].update(
            {
                V3_VERSION: light_metrics(yl, px3[late], lids, prereg, n_boot=n_boot),
                CANDIDATE_VERSION: light_metrics(yl, px4[late], lids, prereg, n_boot=n_boot),
            }
        )

    # ---- sensitivity: holdout rows with a usable version 0 ------------------ #
    use = v0_usable[test_idx]
    yu = y_test[use]
    uids = [t for t, k in zip(test_ids, use) if k]
    sensitivity = {
        "rule": "holdout rows whose version 0 exists and is non-terminal",
        "n": int(use.sum()),
        "excluded": int((~use).sum()),
        V3_VERSION: light_metrics(yu, p3[use], uids, prereg, n_boot=n_boot),
        CANDIDATE_VERSION: light_metrics(yu, p4[use], uids, prereg, n_boot=n_boot),
        "paired_v4_minus_v3": paired_bootstrap_comparison(yu, p3[use], p4[use], n_resamples=n_boot),
    }
    external["v0_usable_rows"] = int(ext_usable.sum())

    # ---- subgroups --------------------------------------------------------- #
    min_n = int(prereg["subgroups"]["min_group_n"])
    test_records = [labeled[i] for i in test_idx]

    def groups(rows: Sequence[TrialRecord]) -> dict[str, list[str]]:
        return {
            "phase": [str(r.phase).upper().replace(" ", "_") for r in rows],
            "sponsor_class": [cf.sponsor_class(r.sponsor) for r in rows],
        }

    subgroups = {}
    for cohort_name, rows, y, preds in (
        ("holdout", test_records, y_test, {V3_VERSION: p3, CANDIDATE_VERSION: p4}),
        ("external", ext_labeled, yx, {V3_VERSION: px3, CANDIDATE_VERSION: px4}),
    ):
        g = groups(rows)
        subgroups[cohort_name] = {
            version: {key: dm.subgroup_calibration(y, p, g[key], min_n=min_n) for key in g}
            for version, p in preds.items()
        }

    # ---- artifacts ---------------------------------------------------------- #
    archive_dir.mkdir(parents=True, exist_ok=True)
    v4_path = archive_dir / CANDIDATE_VERSION / "model.joblib"
    v4_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(v4_model, v4_path, compress=3)

    champion_p = p4 if promote else p3
    evaluation = {
        "model_id": cp.MODEL_ID,
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "git_sha_at_evaluation": cp._git_sha(),
        "preregistration": dm.preregistration_provenance(),
        "snapshot": {
            "snapshot_file_sha256": snapshot_meta.get("snapshot_file_sha256"),
            "canonical_record_sha256": snapshot_meta.get("canonical_record_sha256"),
            "generated_at_utc": snapshot_meta.get("generated_at_utc"),
        },
        "supplement": dict(supplement_meta),
        "split": {"cutoff_year": cutoff, "split_sha256": committed_split["split_sha256"], "n_test": int(len(test_idx))},
        "point_in_time": {
            "version_history_api": history_probe,
            "first_versions": {k: v for k, v in first_versions_meta.items() if k != "ids"},
            "v0_status_counts_labeled_snapshot": dict(v0_status_counts),
            "v0_usable_rows": {"labeled": int(v0_usable.sum()), "holdout": int(v0_usable[test_idx].sum())},
            "v0_training_medians": dict(zip(pit.V0_FEATURE_NAMES, v0_medians)),
            "new_feature_leakage_audit": feature_audit,
            "excluded_change_count_features_leakage_demo": excluded_demo,
            "sponsor_track_record": {
                "definition": prereg["candidate_v4"]["planned_point_in_time_features"]["sponsor_track_record"],
                "prior_stop_rate_p0_train_fit": prior_stop,
                "rows_missing_anchor_date": anchors_missing,
                "holdout_rows_with_prior_sponsor_history": test_with_prior,
            },
        },
        "holdout": {
            V3_VERSION: {**m3, "artifact_sha256": v3_entry["artifact_sha256"]},
            CANDIDATE_VERSION: {**m4, "artifact_sha256": cp.file_sha256(v4_path), "artifact_location": "gitignored archive"},
            "base_rate_random_reference": {"train_completion_rate": train_rate, "decision": base_decision},
            "paired_bootstrap_v4_minus_v3": paired,
        },
        "promotion": promotion,
        "sensitivity_usable_version_0": sensitivity,
        "censoring": censoring,
        "external": external,
        "subgroup_calibration": subgroups,
        "champion_rank_thresholds_risk": rank_thresholds(champion_p, test_ids, prereg["decision"]["k_fractions"]),
        "runtime": {
            "python": platform.python_version(),
            "scikit_learn": importlib.metadata.version("scikit-learn"),
            "numpy": importlib.metadata.version("numpy"),
        },
    }
    cp._write_json(registry_dir / "decision_evaluation.json", evaluation)
    return evaluation


def _compact(m: Mapping[str, Any]) -> dict[str, Any]:
    keep = (
        "n", "roc_auc", "roc_auc_ci_lower", "roc_auc_ci_upper", "brier", "brier_ci_95", "log_loss",
        "log_loss_ci_95", "expected_calibration_error", "base_rate_brier", "positive_rate",
    )
    out = {k: m[k] for k in keep if k in m}
    out["decision"] = {k: v for k, v in m["decision"].items() if k.startswith("top_")}
    out["export_gate"] = m["export_gate"]
    return out


def update_registry(registry_dir: Path, evaluation: Mapping[str, Any]) -> dict[str, Any]:
    """Record the decision gate, rank thresholds and v4 outcome in the manifest.

    Only versions that already have a committed artifact can be served; a
    promoted v4 would need its artifact and featurizer wired into the API, so
    this function refuses rather than silently serving it.
    """
    manifest_path = registry_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    promotion = evaluation["promotion"]
    if promotion["champion_version"] != V3_VERSION:
        raise NotImplementedError("v4 promoted: wire its featurizer into the API before serving")
    entry = manifest["versions"][V3_VERSION]
    hm = entry["holdout_metrics"]
    if "legacy_accuracy_gate" not in hm:
        hm["legacy_accuracy_gate"] = hm["export_gate"]
    m3 = evaluation["holdout"][V3_VERSION]
    hm["export_gate"] = m3["export_gate"]
    entry["decision_metrics"] = {k: v for k, v in m3["decision"].items() if k.startswith("top_")}
    entry["net_benefit"] = m3["net_benefit"]
    entry["rank_thresholds_risk"] = evaluation["champion_rank_thresholds_risk"]
    manifest["decision_tool"] = {
        "decision": "review the top k% of trials by risk_stopped = 1 - probability_completed",
        "primary_k": 0.1,
        "gate_version": m3["export_gate"]["gate_version"],
        "preregistration": evaluation["preregistration"],
        "evaluation": "decision_evaluation.json",
        "promotion_v4": promotion,
        "rank_bucket_note": "Buckets use risk cut points that put 5/10/20% of the temporal holdout in each bucket.",
    }
    manifest.setdefault("evaluated_not_served", {})[CANDIDATE_VERSION] = {
        "model_family": "logistic_regression_tfidf_numeric_point_in_time",
        "artifact_sha256": evaluation["holdout"][CANDIDATE_VERSION]["artifact_sha256"],
        "artifact_location": "gitignored archive (not served)",
        "calibration": cp.CALIBRATION_METHOD,
        "holdout_metrics": _compact(evaluation["holdout"][CANDIDATE_VERSION]),
    }
    cp._write_json(manifest_path, manifest)
    return manifest
