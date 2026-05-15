"""Add ontology columns to health / pipeline artifacts before CSV write."""

from __future__ import annotations

import pandas as pd

from src.disease_registry import get_disease
from src.ontology.concepts import indication_fields_for_fda, lookup_moa_mesh, primary_condition_fields
from src.ontology.indication_disambiguation import disambiguate_indication


def _disease_id_from_artifact(artifact: str) -> str:
    for part in ("clinical_trials_", "fda_approvals_", "epidemiology_", "pipeline_", "gene_therapy_pipeline_"):
        if part in artifact:
            suffix = artifact.replace(part, "").replace(".csv", "")
            if suffix == "scd" or suffix in ("sle", "sarc"):
                return suffix if suffix != "gene_therapy" else "scd"
    if "cdc_sickle" in artifact or "scd" in artifact:
        return "scd"
    return "scd"


def enrich_clinical_trials(df: pd.DataFrame, disease_id: str) -> pd.DataFrame:
    spec = get_disease(disease_id)
    out = df.copy()
    for k, v in primary_condition_fields(disease_id).items():
        out[k] = v
    disambig = []
    for _, row in out.iterrows():
        tag, _ = disambiguate_indication(
            str(row.get("title", "")),
            query=spec.clinical_trials_query,
            disease_id=disease_id,
        )
        disambig.append(tag)
    out["indication_disambiguation"] = disambig
    out["indication_query"] = spec.clinical_trials_query
    return out


def enrich_pipeline(df: pd.DataFrame, disease_id: str) -> pd.DataFrame:
    out = df.copy()
    for k, v in indication_fields_for_fda(disease_id).items():
        if k != "indication_disambiguation":
            out[k] = v
    moa_ids, moa_labels = [], []
    for _, row in out.iterrows():
        mech = str(row.get("target_mechanism", row.get("technology", "")))
        m = lookup_moa_mesh(mech)
        moa_ids.append(m["moa_mesh_id"])
        moa_labels.append(m["moa_mesh_label"])
    out["moa_mesh_id"] = moa_ids
    out["moa_mesh_label"] = moa_labels
    out["disease_id"] = disease_id
    return out


def enrich_fda_approvals(df: pd.DataFrame, disease_id: str) -> pd.DataFrame:
    out = df.copy()
    for k, v in indication_fields_for_fda(disease_id).items():
        out[k] = v
    moa_ids, moa_labels = [], []
    for _, row in out.iterrows():
        m = lookup_moa_mesh(str(row.get("mechanism", "")))
        moa_ids.append(m["moa_mesh_id"])
        moa_labels.append(m["moa_mesh_label"])
    out["moa_mesh_id"] = moa_ids
    out["moa_mesh_label"] = moa_labels
    return out


def enrich_epidemiology(df: pd.DataFrame, disease_id: str) -> pd.DataFrame:
    out = df.copy()
    fields = primary_condition_fields(disease_id)
    for k, v in fields.items():
        out[k.replace("condition_", "population_") if k.startswith("condition_") else k] = v
    return out


def enrich_artifact(artifact: str, df: pd.DataFrame) -> pd.DataFrame:
    disease_id = _disease_id_from_artifact(artifact)
    if artifact.startswith("clinical_trials_"):
        return enrich_clinical_trials(df, disease_id)
    if artifact.startswith("fda_approvals_"):
        return enrich_fda_approvals(df, disease_id)
    if artifact.startswith("pipeline_") or artifact.startswith("gene_therapy_pipeline_"):
        return enrich_pipeline(df, disease_id)
    if artifact.startswith("epidemiology_") or artifact.startswith("cdc_sickle"):
        return enrich_epidemiology(df, disease_id)
    return df
