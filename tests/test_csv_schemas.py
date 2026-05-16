"""Schema validation on write paths."""

from __future__ import annotations

import pandas as pd
import pytest

from src.data_collection.csv_schemas import SchemaValidationError, validate_dataframe


def test_clinical_trials_requires_nct_id() -> None:
    df = pd.DataFrame({"title": ["x"]})
    with pytest.raises(SchemaValidationError) as exc:
        validate_dataframe(df, "clinical_trials_scd.csv")
    assert "nct_id" in str(exc.value)


def test_clinical_trials_valid_minimal() -> None:
    df = pd.DataFrame(
        {
            "nct_id": ["NCT1"],
            "title": ["t"],
            "status": ["COMPLETED"],
            "start_date": ["2020-01-01"],
            "phase": ["Phase 2"],
        }
    )
    validate_dataframe(df, "clinical_trials_scd.csv")
