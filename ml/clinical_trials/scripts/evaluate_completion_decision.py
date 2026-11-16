#!/usr/bin/env python3
"""Run the pre-registered decision evaluation (v3 champion vs v4 candidate).

Needs the frozen training snapshot plus the files written by
``fetch_completion_decision_data.py`` and ``fetch_completion_history.py``.
Writes ``services/python-api/model_registry/completion/decision_evaluation.json``.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/evaluate_completion_decision.py
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lacuna_ct import completion_decision as cdec
from lacuna_ct import point_in_time as pit
from lacuna_ct.fetch_training_data import TrialRecord, load_cached_records, verify_cache_metadata

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "ml/clinical_trials/data"
REGISTRY = ROOT / "services/python-api/model_registry/completion"


def summarize(ev: dict) -> dict:
    def pick(m: dict) -> dict:
        d10 = m["decision"]["top_10pct"]
        return {
            "n": m["n"],
            "roc_auc": [m["roc_auc"], m["roc_auc_ci_lower"], m["roc_auc_ci_upper"]],
            "brier": m["brier"],
            "log_loss": m["log_loss"],
            "ece": m["expected_calibration_error"],
            "lift10": [d10["lift_at_k"], *d10["lift_at_k_ci_95"]],
            "recall10": [d10["recall_at_k"], *d10["recall_at_k_ci_95"]],
            "precision10": [d10["precision_at_k"], *d10["precision_at_k_ci_95"]],
            "gate": m["export_gate"]["passes"],
            "gate_reason": m["export_gate"]["reason"],
        }

    h = ev["holdout"]
    out = {
        "holdout": {v: pick(h[v]) for v in (cdec.V3_VERSION, cdec.CANDIDATE_VERSION)},
        "paired_auc_delta": h["paired_bootstrap_v4_minus_v3"]["roc_auc_delta"],
        "promotion": ev["promotion"],
        "leakage": ev["point_in_time"]["new_feature_leakage_audit"],
        "excluded_demo": ev["point_in_time"]["excluded_change_count_features_leakage_demo"],
        "external": {v: pick(ev["external"]["primary_all_years"][v]) for v in (cdec.V3_VERSION, cdec.CANDIDATE_VERSION)},
    }
    if cdec.V3_VERSION in ev["censoring"]:
        out["censored"] = {v: pick(ev["censoring"][v]) for v in (cdec.V3_VERSION, cdec.CANDIDATE_VERSION)}
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bootstrap-resamples", type=int, default=2000)
    args = parser.parse_args()

    records = load_cached_records(DATA / "cached_training.json")
    snapshot_meta = verify_cache_metadata(records, DATA / "cached_training.json")
    supplement, sup_meta = pit.load_frozen(DATA / "completion_supplement.json")
    ext, ext_meta = pit.load_frozen(DATA / "external_cohort.json")
    fv, fv_meta = pit.load_frozen(DATA / "first_versions.json")
    provenance = json.loads((REGISTRY / "decision_data_provenance.json").read_text(encoding="utf-8"))
    evaluation = cdec.run(
        records,
        snapshot_meta=snapshot_meta,
        supplement=supplement,
        supplement_meta=sup_meta,
        external_records=[TrialRecord(**r) for r in ext["records"]],
        external_supplement=ext["supplement"],
        external_meta=ext_meta,
        history_probe=provenance["history_api_probe"],
        first_versions=fv["first_versions"],
        holdout_changes=fv["holdout_changes"],
        first_versions_meta=fv_meta,
        registry_dir=REGISTRY,
        archive_dir=ROOT / "ml/clinical_trials/output/completion-proxy-v4",
        n_boot=args.bootstrap_resamples,
    )
    print(json.dumps(summarize(evaluation), indent=2))
    if evaluation["promotion"]["champion_version"] == cdec.V3_VERSION:
        cdec.update_registry(REGISTRY, evaluation)
        print("manifest updated: v3 stays champion; decision gate + rank thresholds recorded")
    else:
        print("v4 promoted by the pre-registered rule; serving it needs API featurizer work (manifest unchanged)")


if __name__ == "__main__":
    main()
