"""Regression tests for ClinicalTrials.gov parsers — run when API shapes change."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.data_collection.parsers.clinical_trials import (
    PARSER_VERSION,
    parse_legacy_full_studies,
    parse_v2_studies,
)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def legacy_payload() -> dict:
    return json.loads((FIXTURES / "clinical_trials_legacy_minimal.json").read_text(encoding="utf-8"))


@pytest.fixture
def v2_payload() -> dict:
    return json.loads((FIXTURES / "clinical_trials_v2_minimal.json").read_text(encoding="utf-8"))


def test_parser_version_is_semver_like() -> None:
    parts = PARSER_VERSION.split(".")
    assert len(parts) >= 2


def test_legacy_parser_extracts_nct_and_phase(legacy_payload: dict) -> None:
    rows = parse_legacy_full_studies(legacy_payload)
    assert len(rows) == 1
    assert rows[0]["nct_id"] == "NCT00445978"
    assert rows[0]["phase"] == "Phase 2"
    assert rows[0]["status"] == "COMPLETED"
    assert "Sickle Cell" in rows[0]["title"]


def test_v2_parser_formats_phases(v2_payload: dict) -> None:
    rows = parse_v2_studies(v2_payload)
    assert len(rows) == 1
    assert rows[0]["nct_id"] == "NCT03745287"
    assert "Phase 1" in rows[0]["phase"] and "Phase 2" in rows[0]["phase"]
    assert rows[0]["start_date"] == "2018-11-19"


def test_legacy_empty_envelope_returns_empty() -> None:
    assert parse_legacy_full_studies({}) == []


def test_v2_empty_studies_returns_empty() -> None:
    assert parse_v2_studies({"studies": []}) == []


def test_legacy_phase_list_as_array() -> None:
    data = {
        "FullStudiesResponse": {
            "FullStudies": [
                {
                    "Study": {
                        "ProtocolSection": {
                            "IdentificationModule": {"NCTId": "NCT1", "BriefTitle": "T"},
                            "StatusModule": {"OverallStatus": "RECRUITING", "StartDateStruct": {}},
                            "DesignModule": {"PhaseList": {"Phase": ["Phase 1", "Phase 2"]}},
                        }
                    }
                }
            ]
        }
    }
    rows = parse_legacy_full_studies(data)
    assert rows[0]["phase"] == "Phase 1; Phase 2"
