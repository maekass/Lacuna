#!/usr/bin/env python3
"""Generate demo health CSVs for SLE and sarcoidosis under data/demo/. Run from repo root."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd

from src.data_collection.csv_writer import write_csv
from src.data_collection.demo_tables import epidemiology_df, fda_sarc, fda_sle, pipeline_sarc, pipeline_sle
from src.data_collection.disease_fallbacks import FALLBACK_TRIALS
from src.disease_registry import FOCUS_DISEASE_IDS, get_disease

DEMO = ROOT / "data" / "demo"


def main() -> int:
    DEMO.mkdir(parents=True, exist_ok=True)
    for did in FOCUS_DISEASE_IDS:
        if did == "scd":
            continue
        spec = get_disease(did)
        trials = pd.DataFrame(FALLBACK_TRIALS[did])
        trials["disease_id"] = did
        write_csv(epidemiology_df(did), DEMO / spec.epidemiology_artifact, artifact=spec.epidemiology_artifact, pull=None)
        write_csv(trials, DEMO / spec.trials_artifact, artifact=spec.trials_artifact, pull=None)
        write_csv(
            pipeline_sle() if did == "sle" else pipeline_sarc(),
            DEMO / spec.pipeline_artifact,
            artifact=spec.pipeline_artifact,
            pull=None,
        )
        write_csv(
            fda_sle() if did == "sle" else fda_sarc(),
            DEMO / spec.fda_artifact,
            artifact=spec.fda_artifact,
            pull=None,
        )
        print(f"✓ {spec.display_name} demo bundle")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
