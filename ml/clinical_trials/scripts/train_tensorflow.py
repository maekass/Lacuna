"""Run the offline TensorFlow completion benchmark."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lacuna_ct.fetch_training_data import (
    build_training_records,
    load_cached_records,
    save_records,
)
from lacuna_ct.tensorflow_benchmark import benchmark_completion_tensorflow


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Benchmark an offline TensorFlow completion proxy against the "
            "existing logistic baseline on the same CT.gov holdout."
        )
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=5,
        help="Maximum ClinicalTrials.gov API pages to fetch.",
    )
    parser.add_argument(
        "--no-save-model",
        action="store_true",
        help="Write metrics only; do not save the .keras model.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = repo_root()
    cache = root / "ml/clinical_trials/data/cached_training.json"
    output_dir = root / "ml/clinical_trials/output/tensorflow-completion-benchmark-v1"

    try:
        records = build_training_records(
            use_network=True,
            max_pages=args.max_pages,
        )
        save_records(records, cache)
        training_source = "ctgov_live"
        print(f"Fetched {len(records)} trials from ClinicalTrials.gov")
    except Exception as exc:
        if not cache.exists():
            raise SystemExit(
                "ClinicalTrials.gov fetch failed and no live-data cache exists. "
                "This benchmark intentionally refuses the synthetic seed so its "
                "metrics cannot be mistaken for empirical performance. Run "
                "'npm run ml:ct:ingest' on a networked machine first. "
                f"Fetch error: {exc}"
            ) from exc
        records = load_cached_records(cache)
        training_source = "ctgov_cached"
        print(
            f"Network fetch failed ({exc}); loaded {len(records)} cached "
            "ClinicalTrials.gov records"
        )

    result = benchmark_completion_tensorflow(
        records,
        output_dir=output_dir,
        training_source=training_source,
        save_model=not args.no_save_model,
    )

    print(json.dumps(result, indent=2))
    print(f"Metrics → {output_dir / 'metrics.json'}")
    if not args.no_save_model:
        print(
            "Model → "
            f"{output_dir / 'completion-tensorflow-benchmark-v1.keras'}"
        )


if __name__ == "__main__":
    main()
