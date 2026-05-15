"""Ontology anchoring and indication disambiguation."""

from __future__ import annotations

import pandas as pd

from src.ontology.enrich import enrich_clinical_trials
from src.ontology.indication_disambiguation import disambiguate_indication


def test_primary_scd_title() -> None:
    tag, _ = disambiguate_indication("Study of voxelotor in sickle cell disease")
    assert tag == "primary_scd"


def test_ambiguous_thalassemia() -> None:
    tag, note = disambiguate_indication("Gene therapy for beta-thalassemia and SCD")
    assert tag == "ambiguous"
    assert "thalassemia" in note.lower() or "beta" in note.lower()


def test_enrich_adds_mesh_columns() -> None:
    df = pd.DataFrame(
        {
            "nct_id": ["NCT1"],
            "title": ["Sickle cell anemia trial"],
            "status": ["ACTIVE"],
            "start_date": ["2024-01-01"],
            "phase": [""],
        }
    )
    out = enrich_clinical_trials(df)
    assert out["condition_mesh_id"].iloc[0] == "D000755"
    assert "indication_disambiguation" in out.columns
