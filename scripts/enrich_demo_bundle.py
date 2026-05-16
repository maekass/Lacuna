#!/usr/bin/env python3
"""Add ontology columns to committed demo health CSVs. Run from repo root."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd

from src.data_collection.csv_schemas import validate_dataframe
from src.ontology.enrich import enrich_artifact

DEMO = ROOT / "data" / "demo"
ARTIFACTS = [
    "clinical_trials_scd.csv",
    "gene_therapy_pipeline_scd.csv",
    "fda_approvals_scd.csv",
    "cdc_sickle_cell_data.csv",
]


def main() -> int:
    for name in ARTIFACTS:
        path = DEMO / name
        if not path.is_file():
            print(f"skip {name} (missing)")
            continue
        df = enrich_artifact(name, pd.read_csv(path))
        validate_dataframe(df, name)
        df.to_csv(path, index=False)
        print(f"✓ {name} ({len(df)} rows, {len(df.columns)} cols)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
