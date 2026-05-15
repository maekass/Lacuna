"""
Primary disease and mechanism concepts anchored to MeSH, SNOMED CT, and ICD-10-CM.
Static crosswalks — replace with UMLS/API lookups in production.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class OntologyConcept:
    system: str
    code: str
    label: str
    uri: str = ""

    def as_dict(self, prefix: str) -> dict[str, str]:
        return {
            f"{prefix}_{self.system.lower()}_id": self.code,
            f"{prefix}_{self.system.lower()}_label": self.label,
        }


# Primary indication: sickle cell disease
SCD_CONDITION = {
    "mesh": OntologyConcept("MeSH", "D000755", "Anemia, Sickle Cell", "https://meshb.nlm.nih.gov/record/ui?ui=D000755"),
    "snomed": OntologyConcept("SNOMED", "417357006", "Sickle cell anemia", ""),
    "icd10": OntologyConcept("ICD10", "D57.1", "Sickle-cell disease without crisis", ""),
}

# Broader hemoglobinopathy (disambiguation sibling)
HB_DISORDER_MESH = OntologyConcept("MeSH", "D006453", "Hemoglobinopathies", "")

# Common sickle-cell MoA → MeSH (pharmacologic / biological action)
MOA_MESH: dict[str, OntologyConcept] = {
    "antioxidant": OntologyConcept("MeSH", "D000975", "Antioxidants", ""),
    "hbs polymerization inhibitor": OntologyConcept("MeSH", "D006461", "Hemoglobin, Sickle", ""),
    "p-selectin inhibitor": OntologyConcept("MeSH", "D019032", "P-Selectin", ""),
    "lentiviral gene therapy": OntologyConcept("MeSH", "D015316", "Genetic Therapy", ""),
    "crispr gene editing": OntologyConcept("MeSH", "D064113", "CRISPR-Cas Systems", ""),
    "crispr-cas9": OntologyConcept("MeSH", "D064113", "CRISPR-Cas Systems", ""),
    "base editing": OntologyConcept("MeSH", "D064113", "CRISPR-Cas Systems", ""),
    "zfn": OntologyConcept("MeSH", "D024322", "Zinc Fingers", ""),
    "bcl11a disruption": OntologyConcept("MeSH", "D015316", "Genetic Therapy", ""),
    "bcl11a repression": OntologyConcept("MeSH", "D015316", "Genetic Therapy", ""),
    "monoclonal antibody": OntologyConcept("MeSH", "D000911", "Antibodies, Monoclonal", ""),
    "small molecule": OntologyConcept("MeSH", "D013607", "Tablets", ""),
}

# Trial title / query tokens that suggest a different or broader indication
AMBIGUOUS_INDICATION_PATTERNS: list[tuple[str, str, str]] = [
    ("beta-thalassemia", "broader_hemoglobinopathy", "Title/query may include beta-thalassemia; verify condition module."),
    ("thalassemia", "broader_hemoglobinopathy", "Thalassemia mentioned — may be dual-indication or mis-tagged."),
    ("hemoglobinopathy", "broader_hemoglobinopathy", "Generic hemoglobinopathy — disambiguate vs SCD-only."),
    ("pain crisis", "scd_related", "SCD-related endpoint; condition may still be SCD."),
    ("kidney", "scd_complication", "Renal complication cohort — typically SCD with CKD risk."),
]


def primary_condition_fields() -> dict[str, str]:
    return {
        "condition_mesh_id": SCD_CONDITION["mesh"].code,
        "condition_mesh_label": SCD_CONDITION["mesh"].label,
        "condition_snomed_id": SCD_CONDITION["snomed"].code,
        "condition_snomed_label": SCD_CONDITION["snomed"].label,
        "condition_icd10_code": SCD_CONDITION["icd10"].code,
        "condition_icd10_label": SCD_CONDITION["icd10"].label,
    }


def lookup_moa_mesh(mechanism: str) -> dict[str, str]:
    key = (mechanism or "").strip().lower()
    concept = MOA_MESH.get(key)
    if concept is None:
        for fragment, c in MOA_MESH.items():
            if fragment in key:
                concept = c
                break
    if concept is None:
        return {"moa_mesh_id": "", "moa_mesh_label": mechanism or ""}
    return {"moa_mesh_id": concept.code, "moa_mesh_label": concept.label}


def indication_fields_for_fda() -> dict[str, str]:
    return {
        "indication_mesh_id": SCD_CONDITION["mesh"].code,
        "indication_mesh_label": SCD_CONDITION["mesh"].label,
        "indication_icd10_code": SCD_CONDITION["icd10"].code,
        "indication_disambiguation": "primary_scd",
    }
