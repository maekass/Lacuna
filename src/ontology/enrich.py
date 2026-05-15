"""
Add ontology columns to health / pipeline artifacts before CSV write.
"""

from __future__ import annotations

import pandas as pd

from src.ontology.concepts import indication_fields_for_fda, lookup_moa_mesh, primary_condition_fields
from src.ontology.indication_disambiguation import disambiguate_indication

CLINICAL_TRIALS_QUERY = "sickle cell disease"


def enrich_clinical_trials(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    base = primary_condition_fields()
    for k, v in base.items():
        out[k] = v
    disambig = []
    notes = []
    for _, row in out.iterrows():
        tag, _ = disambiguate_indication(
            str(row.get("title", "")),
            query=CLINICAL_TRIALS_QUERY,
        )
        disambig.append(tag)
    out["indication_disambiguation"] = disambig
    out["indication_query"] = CLINICAL_TRIALS_QUERY
    return out


def enrich_gene_therapy_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    ind = indication_fields_for_fda()
    for k, v in ind.items():
        out[k] = v
    moa_ids = []
    moa_labels = []
    for _, row in out.iterrows():
        mech = str(row.get("target_mechanism", row.get("technology", "")))
        m = lookup_moa_mesh(mech)
        moa_ids.append(m["moa_mesh_id"])
        moa_labels.append(m["moa_mesh_label"])
    out["moa_mesh_id"] = moa_ids
    out["moa_mesh_label"] = moa_labels
    return out


def enrich_fda_approvals(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for k, v in indication_fields_for_fda().items():
        out[k] = v
    moa_ids = []
    moa_labels = []
    for _, row in out.iterrows():
        m = lookup_moa_mesh(str(row.get("mechanism", "")))
        moa_ids.append(m["moa_mesh_id"])
        moa_labels.append(m["moa_mesh_label"])
    out["moa_mesh_id"] = moa_ids
    out["moa_mesh_label"] = moa_labels
    return out


def enrich_cdc(df: pd.DataFrame) -> pd.DataFrame:
    """CDC placeholder — attach population concept for epidemiology joins."""
    out = df.copy()
    fields = primary_condition_fields()
    for k, v in fields.items():
        out[k.replace("condition_", "population_")] = v
    return out


_ENRICHERS = {
    "clinical_trials_scd.csv": enrich_clinical_trials,
    "gene_therapy_pipeline_scd.csv": enrich_gene_therapy_pipeline,
    "fda_approvals_scd.csv": enrich_fda_approvals,
    "cdc_sickle_cell_data.csv": enrich_cdc,
}


def enrich_artifact(artifact: str, df: pd.DataFrame) -> pd.DataFrame:
    fn = _ENRICHERS.get(artifact)
    if fn is None:
        return df
    return fn(df)
