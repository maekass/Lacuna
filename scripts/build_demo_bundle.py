#!/usr/bin/env python3
"""Regenerate data/demo/*.csv from collectors (run from project root)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.bootstrap_data import run_full_pipeline

RAW = ROOT / "data" / "raw"
DEMO = ROOT / "data" / "demo"


def main() -> None:
    run_full_pipeline(RAW)
    DEMO.mkdir(parents=True, exist_ok=True)
    n = 0
    for src in sorted(RAW.glob("*.csv")):
        dest = DEMO / src.name
        dest.write_bytes(src.read_bytes())
        n += 1
    print(f"Copied {n} CSVs to {DEMO}")
    print("Optional: python3 scripts/train_models.py  # refresh data/demo/ml + data/demo/models")


if __name__ == "__main__":
    main()
