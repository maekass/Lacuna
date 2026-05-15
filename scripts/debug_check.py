#!/usr/bin/env python3
"""Quick diagnostics: demo bundle, data/raw, optional Streamlit. Run from repo root."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.seed_demo_data import (  # noqa: E402
    DEMO_DIR,
    csv_has_data_rows,
    demo_bundle_present,
    seed_from_demo,
    sync_ml_from_demo,
)
from src.models.ml_artifacts import ml_bundle_present  # noqa: E402
from src.quant_framework.quant_artifacts import quant_bundle_present  # noqa: E402

RAW = ROOT / "data" / "raw"
REQUIRED = [
    "gene_therapy_pipeline_scd.csv",
    "cdc_sickle_cell_data.csv",
    "clinical_trials_scd.csv",
    "stock_prices_companies.csv",
    "market_size_scd.csv",
]


def main() -> int:
    failed = False
    print("=== debug_check ===\n")

    print(f"demo bundle ({DEMO_DIR}):")
    if not demo_bundle_present():
        print("  FAIL: data/demo/ missing or empty (merge cursor branch or run build_demo_bundle.py)")
        failed = True
    else:
        for name in REQUIRED:
            p = DEMO_DIR / name
            ok = csv_has_data_rows(p, min_rows=4 if name.startswith("stock_prices_") else 1)
            print(f"  {'OK' if ok else 'FAIL'} {name}")

    print(f"\ndata/raw ({RAW}):")
    if not RAW.is_dir():
        print("  (no data/raw — normal before first collect or bootstrap)")
    else:
        for name in REQUIRED:
            p = RAW / name
            ok = p.is_file() and csv_has_data_rows(
                p, min_rows=4 if name.startswith("stock_prices_") else 1
            )
            print(f"  {'OK' if ok else 'MISSING/EMPTY'} {name}")

    # CI checkout has data/demo but not gitignored data/raw; seed so smoke paths match deploy.
    if demo_bundle_present() and not csv_has_data_rows(RAW / "gene_therapy_pipeline_scd.csv"):
        n = seed_from_demo(RAW)
        print(f"\nSeeded {n} CSVs from demo bundle into data/raw for validation.")

    print("\nML bundle (data/demo/ml):")
    if ml_bundle_present():
        print("  OK demo training CSVs + metrics")
    else:
        print("  FAIL: run python3 scripts/train_models.py")
        failed = True

    from src.models.ml_artifacts import runtime_ml_present

    print("\nML runtime (data/processed + data/models):")
    sync_ml_from_demo()
    if runtime_ml_present():
        print("  OK tracked training CSVs and fitted joblib models")
    else:
        print("  FAIL: missing data/processed or data/models — run train_models.py")
        failed = True

    print("\nQuant bundle (data/demo/quant):")
    from src.data_collection.seed_demo_data import sync_quant_from_demo

    if quant_bundle_present():
        sync_quant_from_demo()
        print("  OK quant CSVs")
    else:
        print("  FAIL: run python3 scripts/train_quant.py")
        failed = True

    print("\nRunning smoke_test_dashboard.check_data ...")
    from scripts.smoke_test_dashboard import check_data

    data_errors = check_data()
    if data_errors:
        failed = True
        for e in data_errors:
            print(f"  FAIL {e}")
    else:
        print("  OK")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
