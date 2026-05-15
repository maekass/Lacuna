"""
Column schemas for every registered CSV. Validated on write via csv_writer.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

# type: required | optional | datetime_str
SCHEMAS: dict[str, dict[str, Any]] = {
    "cdc_sickle_cell_data.csv": {
        "required": ["date", "scd_births_per_1000", "scd_prevalence_us", "new_treatments_approved", "clinical_trials_active"],
        "optional": [],
        "dtypes": {
            "scd_births_per_1000": "numeric",
            "scd_prevalence_us": "numeric",
            "new_treatments_approved": "numeric",
            "clinical_trials_active": "numeric",
        },
    },
    "clinical_trials_scd.csv": {
        "required": ["nct_id", "title", "status", "start_date", "phase"],
        "optional": [
            "condition_mesh_id",
            "condition_mesh_label",
            "condition_snomed_id",
            "condition_snomed_label",
            "condition_icd10_code",
            "condition_icd10_label",
            "indication_disambiguation",
            "indication_query",
        ],
        "dtypes": {},
    },
    "fda_approvals_scd.csv": {
        "required": ["drug_name", "company", "approval_date", "mechanism", "phase", "efficacy"],
        "optional": [
            "moa_mesh_id",
            "moa_mesh_label",
            "indication_mesh_id",
            "indication_mesh_label",
            "indication_icd10_code",
            "indication_disambiguation",
        ],
        "dtypes": {},
    },
    "gene_therapy_pipeline_scd.csv": {
        "required": [
            "company",
            "ticker",
            "gene_therapy_name",
            "technology",
            "clinical_phase",
            "target_mechanism",
            "probability_of_success",
            "estimated_cost",
        ],
        "optional": [
            "moa_mesh_id",
            "moa_mesh_label",
            "indication_mesh_id",
            "indication_mesh_label",
            "indication_icd10_code",
            "indication_disambiguation",
        ],
        "dtypes": {"probability_of_success": "numeric", "estimated_cost": "numeric"},
    },
    "stock_prices_companies.csv": {"required": [], "optional": [], "dtypes": {}, "flexible": True},
    "stock_prices_etfs.csv": {"required": [], "optional": [], "dtypes": {}, "flexible": True},
    "company_financials.csv": {
        "required": ["company", "ticker"],
        "optional": [],
        "dtypes": {},
        "flexible": True,
    },
}


class SchemaValidationError(ValueError):
    """Raised when a DataFrame fails schema checks before CSV write."""

    def __init__(self, artifact: str, errors: list[str]):
        self.artifact = artifact
        self.errors = errors
        super().__init__(f"{artifact}: " + "; ".join(errors))


def validate_dataframe(df: pd.DataFrame, artifact: str) -> None:
    """Raise SchemaValidationError if df does not match the registered schema."""
    spec = SCHEMAS.get(artifact)
    if spec is None:
        return
    if spec.get("flexible") and df.empty:
        raise SchemaValidationError(artifact, ["DataFrame is empty"])
    errors: list[str] = []
    cols = set(df.columns.astype(str))
    for col in spec.get("required", []):
        if col not in cols:
            errors.append(f"missing required column: {col}")
    if not spec.get("flexible") and df.empty and spec.get("required"):
        errors.append("DataFrame has zero rows")
    for col, kind in spec.get("dtypes", {}).items():
        if col not in df.columns:
            continue
        if kind == "numeric" and not pd.api.types.is_numeric_dtype(df[col]):
            errors.append(f"column {col} must be numeric")
    if errors:
        raise SchemaValidationError(artifact, errors)
