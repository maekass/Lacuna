"""Unit tests for openFDA drugsfda helper (no live HTTP)."""

from __future__ import annotations

import pandas as pd

from src.data_collection.parsers import openfda_drugsfda as d


def test_first_orig_approval_date_earliest() -> None:
    subs = [
        {"submission_type": "ORIG", "submission_status": "AP", "submission_status_date": "20200115"},
        {"submission_type": "ORIG", "submission_status": "AP", "submission_status_date": "20190101"},
        {"submission_type": "SUPPL", "submission_status": "AP", "submission_status_date": "20220101"},
    ]
    assert d._first_orig_approval_date(subs) == "2019-01-01"


def test_first_orig_approval_date_empty() -> None:
    assert d._first_orig_approval_date([]) is None
    assert d._first_orig_approval_date([{"submission_type": "SUPPL", "submission_status": "AP"}]) is None


def test_enrich_fda_dataframe_with_drugsfda(monkeypatch) -> None:
    def fake_lookup(brand: str, **kwargs):
        return {
            "first_approval_date": "2020-06-01",
            "sponsor_name": "Demo Sponsor Inc",
            "application_number": "NDA999999",
            "row_count": 1,
        }

    monkeypatch.setattr(d, "lookup_brand_in_drugsfda", fake_lookup)
    df = pd.DataFrame(
        [
            {"drug_name": "TestDrug", "approval_date": "—", "company": "—"},
        ]
    )
    out = d.enrich_fda_dataframe_with_drugsfda(df)
    assert out.loc[0, "approval_date"] == "2020-06-01"
    assert out.loc[0, "company"] == "Demo Sponsor Inc"
    assert out.loc[0, "application_number"] == "NDA999999"
    assert "drugsfda" in str(out.loc[0, "approval_date_source"]).lower()
