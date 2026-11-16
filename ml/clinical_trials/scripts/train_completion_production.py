#!/usr/bin/env python3
"""Train + evaluate the completion-proxy v3 baseline and challenger.

Requires a frozen CT.gov snapshot created by ``npm run ml:ct:ingest``. Writes
the versioned model registry served by ``services/python-api``.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/train_completion_production.py
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lacuna_ct.completion_production import run
from lacuna_ct.fetch_training_data import load_cached_records, verify_cache_metadata

ROOT = Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "ml/clinical_trials/data/cached_training.json")
    parser.add_argument(
        "--registry",
        type=Path,
        default=ROOT / "services/python-api/model_registry/completion",
    )
    parser.add_argument(
        "--archive",
        type=Path,
        default=ROOT / "ml/clinical_trials/output/completion-proxy-v3",
        help="Gitignored location for non-champion artifacts.",
    )
    parser.add_argument("--bootstrap-resamples", type=int, default=2000)
    args = parser.parse_args()

    records = load_cached_records(args.data)
    meta = verify_cache_metadata(records, args.data)
    evaluation = run(
        records,
        snapshot_meta=meta,
        registry_dir=args.registry,
        archive_dir=args.archive,
        n_boot=args.bootstrap_resamples,
    )
    summary = {
        "split": evaluation["split"],
        "counts": evaluation["counts"],
        "models": {
            k: {m: v[m] for m in ("roc_auc", "roc_auc_ci_lower", "roc_auc_ci_upper", "brier", "log_loss", "expected_calibration_error", "accuracy", "export_gate")}
            for k, v in evaluation["models"].items()
        },
        "reference_predictors": evaluation["reference_predictors"],
        "paired": {k: evaluation["paired_bootstrap_challenger_minus_baseline"][k] for k in ("roc_auc_delta", "brier_delta", "log_loss_delta")},
        "promotion": evaluation["promotion"],
        "leaky_v2_reference": evaluation["leakage_audit"]["v2_recipe_with_enrollment_reference"],
        "enrollment_alone_auc": evaluation["leakage_audit"]["enrollment_log10_alone_holdout_auc"],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
