"""
Assemble live disease metrics for Orphanet search (epidemiology, trials, ontology).
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from src.data_collection.live_trials import fetch_clinical_trials
from src.data_collection.parsers.epidemiology_series import build_epidemiology_dataframe, prevalence_us_from_rate
from src.data_collection.parsers.orphanet import fetch_orphanet_epidemiology, select_us_point_prevalence_per_100k
from src.data_collection.parsers.orphanet_search import fetch_orphanet_crossref
from src.disease_registry.registry import DiseaseSpec


def fetch_disease_metrics(
    orpha_code: int,
    preferred_term: str,
    *,
    max_trials: int = 40,
) -> dict[str, Any]:
    """Pull Orphanet cross-ref, epidemiology, and ClinicalTrials.gov sample for one ORPHA code."""
    cross, _ = fetch_orphanet_crossref(orpha_code)
    term = cross.get("preferred_term") or preferred_term
    query = term

    epi_entries, epi_meta = fetch_orphanet_epidemiology(orpha_code)
    us_rate = select_us_point_prevalence_per_100k(epi_entries) if epi_entries else None

    trials_df = fetch_clinical_trials(query, max_trials=max_trials)
    active = 0
    if not trials_df.empty and "status" in trials_df.columns:
        tokens = ("RECRUITING", "ACTIVE", "ENROLLING", "NOT_YET_RECRUITING")
        active = int(
            trials_df["status"]
            .astype(str)
            .str.upper()
            .apply(lambda s: any(tok in s for tok in tokens))
            .sum()
        )

    spec_stub = DiseaseSpec(
        disease_id=f"orpha{orpha_code}",
        code=f"ORPHA{orpha_code}",
        display_name=term,
        clinical_trials_query=query,
        disparity_note="",
        mesh_id="—",
        mesh_label="—",
        snomed_id="—",
        snomed_label="—",
        icd10_code=(cross.get("icd10_codes") or ["—"])[0],
        icd10_label=(cross.get("icd10_codes") or ["—"])[0],
        prevalence_us=int(prevalence_us_from_rate(us_rate, 2024)) if us_rate else 0,
        orpha_code=orpha_code,
        search_terms=(query,),
        companies={},
        openfda_query=query[:80],
    )
    epi_df = (
        build_epidemiology_dataframe(spec_stub, us_prevalence_per_100k=us_rate, trials=trials_df)
        if us_rate
        else pd.DataFrame()
    )

    us_prev_n = int(prevalence_us_from_rate(us_rate, 2024)) if us_rate else None

    return {
        "orpha_code": orpha_code,
        "preferred_term": term,
        "clinical_trials_query": query,
        "disorder_group": cross.get("disorder_group", ""),
        "icd10_codes": cross.get("icd10_codes", []),
        "omim_codes": cross.get("omim_codes", []),
        "orphanet_url": cross.get("orphanet_url", ""),
        "us_point_prevalence_per_100k": us_rate,
        "us_prevalence_estimate": us_prev_n,
        "prevalence_entries": epi_entries[:8],
        "epidemiology_meta": epi_meta,
        "epidemiology_df": epi_df,
        "trials_df": trials_df,
        "trials_in_sample": int(len(trials_df)),
        "trials_active_in_sample": active,
    }
