#!/usr/bin/env python3
"""Build quant dashboard artifacts. Run from repo root."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.seed_demo_data import demo_bundle_present, seed_from_demo
from src.quant_framework.quant_artifacts import DEMO_QUANT_DIR, RAW_DIR, train_all

if __name__ == "__main__":
    if demo_bundle_present():
        seed_from_demo(RAW_DIR)
    train_all()
