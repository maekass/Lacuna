#!/usr/bin/env python3
"""Train ML artifacts and refresh data/demo/ml + data/demo/models. Run from repo root."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.seed_demo_data import demo_bundle_present, seed_from_demo
from src.models.ml_artifacts import DEMO_ML_DIR, DEMO_MODELS_DIR, RAW_DIR, train_all


def main() -> None:
    if demo_bundle_present():
        seed_from_demo(RAW_DIR)
    if not (RAW_DIR / "cdc_sickle_cell_data.csv").is_file():
        raise SystemExit(
            "Missing data/raw CSVs. Run collect_all_data.py or ensure data/demo/ is present."
        )
    train_all(raw_dir=RAW_DIR, ml_dir=DEMO_ML_DIR, models_dir=DEMO_MODELS_DIR)


if __name__ == "__main__":
    main()
