"""
Assemble live disease metrics: Orphanet, CDC NNDSS, and ClinicalTrials.gov.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd

from src.data_collection.live_trials import fetch_clinical_trials
from src.data_collection.parsers.cdc_nndss import (
    cdc_label_profile_url,
    fetch_nndss_us_snapshot,
)
from src.data_collection.parsers.epidemiology_series import build_epidemiology_dataframe, prevalence_us_from_rate
from src.data_collection.parsers.orphanet import (
    fetch_orphanet_epidemiology,
    select_best_non_us_point_prevalence,
    select_us_point_prevalence_per_100k,
)
from src.data_collection.parsers.orphanet_search import fetch_orphanet_by_name, fetch_orphanet_crossref
from src.disease_registry.registry import DiseaseSpec


def cdc_disease_id(cdc_label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", cdc_label.lower()).strip("-")[:80]
    return f"cdc:{slug}"


def _trial_activity(trials_df: pd.DataFrame) -> tuple[int, int]:
    if trials_df.empty:
        return 0, 0
    n = int(len(trials_df))
    active = 0
    if "status" in trials_df.columns:
        tokens = ("RECRUITING", "ACTIVE", "ENROLLING", "NOT_YET_RECRUITING")
        active = int(
            trials_df["status"]
            .astype(str)
            .str.upper()
            .apply(lambda s: any(tok in s for tok in tokens))
            .sum()
        )
    return n, active


def _orphanet_bundle(orpha_code: int, preferred_term: str) -> dict[str, Any]:
    cross, _ = fetch_orphanet_crossref(orpha_code)
    term = cross.get("preferred_term") or preferred_term
    epi_entries, epi_meta = fetch_orphanet_epidemiology(orpha_code)
    us_rate = select_us_point_prevalence_per_100k(epi_entries) if epi_entries else None
    alt_prev = (
        None
        if us_rate is not None
        else (select_best_non_us_point_prevalence(epi_entries) if epi_entries else None)
    )
    us_prev_n = int(prevalence_us_from_rate(us_rate, 2024)) if us_rate else None
    return {
        "orpha_code": orpha_code,
        "preferred_term": term,
        "disorder_group": cross.get("disorder_group", ""),
        "typology": cross.get("typology", ""),
        "icd10_codes": cross.get("icd10_codes", []),
        "omim_codes": cross.get("omim_codes", []),
        "umls_codes": cross.get("umls_codes", []),
        "orphanet_url": cross.get("orphanet_url", ""),
        "us_point_prevalence_per_100k": us_rate,
        "us_prevalence_estimate": us_prev_n,
        "orphanet_non_us_point_prevalence": alt_prev,
        "prevalence_entries": epi_entries[:8],
        "epidemiology_meta": epi_meta,
        "clinical_trials_query": term,
    }


def _resolve_orpha_from_name(name: str) -> int | None:
    cross, meta = fetch_orphanet_by_name(name)
    code = cross.get("orpha_code")
    if code is not None:
        return int(code)
    if meta.get("http_status") == 200 and cross:
        return cross.get("orpha_code")
    return None


def fetch_disease_metrics(
    preferred_term: str,
    *,
    orpha_code: int | None = None,
    cdc_label: str | None = None,
    trial_query_fallback: str | None = None,
    max_trials: int = 40,
) -> dict[str, Any]:
    """
    Unified metrics pull. Provide orpha_code and/or cdc_label (NNDSS notifiable condition).
    """
    term = preferred_term.strip() or (cdc_label or "")
    if cdc_label and not term:
        term = cdc_label

    resolved_orpha = int(orpha_code) if orpha_code else None
    if resolved_orpha is None and cdc_label:
        # Best-effort Orphanet enrichment for CDC-listed labels (first segment before comma).
        probe = cdc_label.split(",")[0].strip()
        resolved_orpha = _resolve_orpha_from_name(probe)

    orpha_block: dict[str, Any] = {}
    if resolved_orpha is not None:
        orpha_block = _orphanet_bundle(resolved_orpha, term)

    cdc_block: dict[str, Any] = {}
    if cdc_label:
        snap, snap_meta = fetch_nndss_us_snapshot(cdc_label)
        cdc_block = {
            "cdc_label": cdc_label,
            "cdc_nndss": snap,
            "cdc_nndss_meta": snap_meta,
            "cdc_profile_url": cdc_label_profile_url(cdc_label),
        }

    query = orpha_block.get("clinical_trials_query") or term
    trials_df = fetch_clinical_trials(query, max_trials=max_trials)
    trials_n, active_n = _trial_activity(trials_df)
    trials_used_fallback_query = False
    fb = (trial_query_fallback or "").strip()
    if trials_df.empty and fb and fb.lower() != query.lower():
        trials_df = fetch_clinical_trials(fb, max_trials=max_trials)
        trials_n, active_n = _trial_activity(trials_df)
        if not trials_df.empty:
            trials_used_fallback_query = True

    display = orpha_block.get("preferred_term") or cdc_label or term
    us_rate = orpha_block.get("us_point_prevalence_per_100k")

    spec_stub = DiseaseSpec(
        disease_id=cdc_disease_id(cdc_label) if cdc_label and not resolved_orpha else f"orpha{resolved_orpha or 0}",
        code=f"ORPHA{resolved_orpha}" if resolved_orpha else "CDC",
        display_name=display,
        clinical_trials_query=query,
        disparity_note="",
        mesh_id="—",
        mesh_label="—",
        snomed_id="—",
        snomed_label="—",
        icd10_code=(orpha_block.get("icd10_codes") or ["—"])[0],
        icd10_label=(orpha_block.get("icd10_codes") or ["—"])[0],
        prevalence_us=int(orpha_block.get("us_prevalence_estimate") or 0),
        orpha_code=int(resolved_orpha) if resolved_orpha else 0,
        search_terms=(query,),
        companies={},
        openfda_query=query[:80],
    )
    epi_df = (
        build_epidemiology_dataframe(spec_stub, us_prevalence_per_100k=us_rate, trials=trials_df)
        if us_rate
        else pd.DataFrame()
    )

    sources: list[str] = []
    if cdc_label:
        sources.append("cdc_nndss")
    if resolved_orpha:
        sources.append("orphanet")

    out: dict[str, Any] = {
        **orpha_block,
        **cdc_block,
        "preferred_term": display,
        "clinical_trials_query": query,
        "metric_sources": sources,
        "disease_id": cdc_disease_id(cdc_label)
        if cdc_label and not resolved_orpha
        else f"orpha:{resolved_orpha}",
        "epidemiology_df": epi_df,
        "trials_df": trials_df,
        "trials_in_sample": trials_n,
        "trials_active_in_sample": active_n,
        "trials_used_search_fallback_query": trials_used_fallback_query,
    }
    if resolved_orpha:
        out["orpha_code"] = resolved_orpha
    return out
