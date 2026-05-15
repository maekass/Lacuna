import json
from pathlib import Path

import pandas as pd

from src.data_collection.parsers.cdc_scd import scd_births_per_1000_black
from src.data_collection.parsers.epidemiology_series import build_epidemiology_dataframe
from src.data_collection.parsers.orphanet import (
    PARSER_VERSION,
    parse_prevalence_entries,
    select_us_point_prevalence_per_100k as orphanet_us_rate,
)
from src.disease_registry import get_disease

FIXTURES = Path(__file__).parent / "fixtures"


def test_orphanet_parser_version() -> None:
    assert "2026" in PARSER_VERSION


def test_parse_orphanet_us_point_prevalence() -> None:
    payload = json.loads((FIXTURES / "orphanet_epidemiology_scd_minimal.json").read_text(encoding="utf-8"))
    entries = parse_prevalence_entries(payload)
    assert len(entries) >= 2
    rate = orphanet_us_rate(entries)
    assert rate == 30.0


def test_build_scd_epidemiology_columns() -> None:
    spec = get_disease("scd")
    trials = pd.DataFrame({"status": ["RECRUITING", "COMPLETED", "ACTIVE_NOT_RECRUITING"]})
    df = build_epidemiology_dataframe(spec, us_prevalence_per_100k=30.0, trials=trials)
    assert list(df.columns) == [
        "date",
        "scd_births_per_1000",
        "scd_prevalence_us",
        "new_treatments_approved",
        "clinical_trials_active",
    ]
    assert df["clinical_trials_active"].iloc[0] == 2
    assert df["scd_births_per_1000"].iloc[0] == scd_births_per_1000_black()


def test_build_sle_epidemiology() -> None:
    spec = get_disease("sle")
    df = build_epidemiology_dataframe(spec, us_prevalence_per_100k=53.6, trials=None)
    assert "prevalence_us" in df.columns
    assert "disease_id" in df.columns
    assert df["disease_id"].iloc[0] == "sle"
