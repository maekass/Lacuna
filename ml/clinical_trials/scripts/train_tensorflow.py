"""Run the governed offline TensorFlow completion benchmark."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lacuna_ct.fetch_training_data import (
    build_training_records,
    load_cached_records,
    save_records,
)
from lacuna_ct.tensorflow_benchmark import (
    DEFAULT_TENSORFLOW_SEEDS,
    benchmark_completion_tensorflow,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _parse_seeds(raw: str) -> tuple[int, ...]:
    try:
        seeds = tuple(int(part.strip()) for part in raw.split(",") if part.strip())
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            "Seeds must be a comma-separated list of integers."
        ) from exc
    if not seeds:
        raise argparse.ArgumentTypeError("At least one seed is required.")
    if len(set(seeds)) != len(seeds):
        raise argparse.ArgumentTypeError("Seeds must be unique.")
    return seeds


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Benchmark an offline TensorFlow completion challenger against the "
            "existing logistic baseline on a frozen ClinicalTrials.gov snapshot."
        )
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=None,
        help=(
            "Path to a cached ClinicalTrials.gov JSON snapshot. Defaults to "
            "ml/clinical_trials/data/cached_training.json."
        ),
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help=(
            "Explicitly refresh the cache from ClinicalTrials.gov before the run. "
            "Default behavior never mutates the benchmark dataset."
        ),
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=5,
        help="Maximum API pages per query when --refresh is used.",
    )
    parser.add_argument(
        "--seeds",
        type=_parse_seeds,
        default=DEFAULT_TENSORFLOW_SEEDS,
        help=(
            "Comma-separated TensorFlow seeds. Default: "
            + ",".join(str(seed) for seed in DEFAULT_TENSORFLOW_SEEDS)
        ),
    )
    parser.add_argument(
        "--bootstrap-resamples",
        type=int,
        default=2000,
        help="Paired bootstrap resamples for held-out metric deltas.",
    )
    parser.add_argument(
        "--no-save-model",
        action="store_true",
        help="Write metrics/manifests only; do not save the canonical .keras model.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.bootstrap_resamples < 200:
        raise SystemExit("--bootstrap-resamples must be at least 200.")

    root = repo_root()
    default_cache = root / "ml/clinical_trials/data/cached_training.json"
    data_path = args.data or default_cache
    output_dir = root / "ml/clinical_trials/output/tensorflow-completion-benchmark-v1"

    if args.refresh:
        records = build_training_records(
            use_network=True,
            max_pages=args.max_pages,
        )
        save_records(records, data_path)
        training_source = "ctgov_live_snapshot"
        print(
            f"Refreshed {len(records)} ClinicalTrials.gov records → {data_path}"
        )
    else:
        if not data_path.exists():
            raise SystemExit(
                "Frozen ClinicalTrials.gov snapshot not found. Run "
                "'npm run ml:ct:ingest' first, or re-run this command with "
                "'--refresh'. The benchmark will not silently fall back to "
                "synthetic data or mutate its dataset."
            )
        records = load_cached_records(data_path)
        training_source = "ctgov_cached"
        print(f"Loaded frozen snapshot with {len(records)} records from {data_path}")

    result = benchmark_completion_tensorflow(
        records,
        output_dir=output_dir,
        training_source=training_source,
        save_model=not args.no_save_model,
        seeds=args.seeds,
        bootstrap_resamples=args.bootstrap_resamples,
    )

    print(json.dumps(result, indent=2))
    print(f"Metrics → {output_dir / 'metrics.json'}")
    print(f"Split manifest → {output_dir / 'split.json'}")
    print(f"Run manifest → {output_dir / 'run-manifest.json'}")
    if not args.no_save_model:
        canonical_seed = result["tensorflow"]["canonical_seed"]
        print(
            "Canonical model → "
            f"{output_dir / f'completion-tensorflow-benchmark-v1-seed-{canonical_seed}.keras'}"
        )


if __name__ == "__main__":
    main()
