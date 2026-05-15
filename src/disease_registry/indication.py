"""
Resolve dashboard indication: registry focus diseases or Orphanet search (ORPHA code).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from src.disease_registry.registry import DiseaseSpec, get_disease


@dataclass(frozen=True)
class IndicationView:
    """Unified view for registry and ad-hoc Orphanet-selected diseases."""

    disease_id: str
    display_name: str
    clinical_trials_query: str
    disparity_note: str
    mesh_id: str
    mesh_label: str
    snomed_id: str
    snomed_label: str
    icd10_code: str
    icd10_label: str
    orpha_code: int | None
    is_registry: bool
    metrics: dict[str, Any] | None = None

    @property
    def epidemiology_artifact(self) -> str:
        if self.is_registry:
            return get_disease(self.disease_id).epidemiology_artifact
        return ""

    @property
    def trials_artifact(self) -> str:
        if self.is_registry:
            return get_disease(self.disease_id).trials_artifact
        return ""

    @property
    def pipeline_artifact(self) -> str:
        if self.is_registry:
            return get_disease(self.disease_id).pipeline_artifact
        return ""

    @property
    def fda_artifact(self) -> str:
        if self.is_registry:
            return get_disease(self.disease_id).fda_artifact
        return ""

    @property
    def companies(self) -> dict[str, str]:
        if self.is_registry:
            return get_disease(self.disease_id).companies
        return {}

    @classmethod
    def from_registry(cls, disease_id: str) -> IndicationView:
        spec = get_disease(disease_id)
        return cls(
            disease_id=spec.disease_id,
            display_name=spec.display_name,
            clinical_trials_query=spec.clinical_trials_query,
            disparity_note=spec.disparity_note,
            mesh_id=spec.mesh_id,
            mesh_label=spec.mesh_label,
            snomed_id=spec.snomed_id,
            snomed_label=spec.snomed_label,
            icd10_code=spec.icd10_code,
            icd10_label=spec.icd10_label,
            orpha_code=spec.orpha_code,
            is_registry=True,
            metrics=None,
        )

    @classmethod
    def from_metrics(cls, metrics: dict[str, Any]) -> IndicationView:
        icd = metrics.get("icd10_codes") or []
        icd_primary = icd[0] if icd else "—"
        return cls(
            disease_id=str(metrics.get("disease_id", f"orpha:{metrics.get('orpha_code', 0)}")),
            display_name=str(metrics.get("preferred_term", "Unknown disorder")),
            clinical_trials_query=str(metrics.get("clinical_trials_query", metrics.get("preferred_term", ""))),
            disparity_note=(
                "Ad-hoc public lookup (Orphanet and/or CDC NNDSS) — verify burden and equity context "
                "with primary literature; not pre-loaded in the focus registry."
            ),
            mesh_id="—",
            mesh_label="—",
            snomed_id="—",
            snomed_label="—",
            icd10_code=icd_primary,
            icd10_label=icd_primary,
            orpha_code=int(metrics["orpha_code"]),
            is_registry=False,
            metrics=metrics,
        )


def is_orpha_disease_id(disease_id: str) -> bool:
    return disease_id.startswith("orpha:")


def is_cdc_disease_id(disease_id: str) -> bool:
    return disease_id.startswith("cdc:")


def is_ad_hoc_disease_id(disease_id: str) -> bool:
    return is_orpha_disease_id(disease_id) or is_cdc_disease_id(disease_id)


def registry_disease_id(disease_id: str) -> str:
    if is_ad_hoc_disease_id(disease_id):
        return "scd"
    return disease_id
