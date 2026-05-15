"""
Primary disease and mechanism concepts anchored to MeSH, SNOMED CT, and ICD-10-CM.
"""

from __future__ import annotations

from dataclasses import dataclass

from src.disease_registry import get_disease


@dataclass(frozen=True)
class OntologyConcept:
    system: str
    code: str
    label: str
    uri: str = ""


HB_DISORDER_MESH = OntologyConcept("MeSH", "D006453", "Hemoglobinopathies", "")

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
    "type i ifn inhibitor": OntologyConcept("MeSH", "D007372", "Interferons", ""),
    "interferon pathway": OntologyConcept("MeSH", "D007372", "Interferons", ""),
    "b-cell modulation": OntologyConcept("MeSH", "D000911", "Antibodies, Monoclonal", ""),
    "jak inhibitor": OntologyConcept("MeSH", "D053610", "Janus Kinase Inhibitors", ""),
    "jak-stat": OntologyConcept("MeSH", "D053610", "Janus Kinase Inhibitors", ""),
    "il-17 pathway": OntologyConcept("MeSH", "D053728", "Interleukin-17", ""),
    "tnf inhibitor": OntologyConcept("MeSH", "D000911", "Antibodies, Monoclonal", ""),
}

AMBIGUOUS_PATTERNS_BY_DISEASE: dict[str, list[tuple[str, str, str]]] = {
    "scd": [
        ("beta-thalassemia", "broader_hemoglobinopathy", "May include beta-thalassemia; verify condition."),
        ("thalassemia", "broader_hemoglobinopathy", "Thalassemia mentioned — disambiguate."),
        ("hemoglobinopathy", "broader_hemoglobinopathy", "Generic hemoglobinopathy."),
    ],
    "sle": [
        ("cutaneous lupus", "sle_subtype", "Cutaneous lupus subset — may differ from systemic SLE cohort."),
        ("lupus nephritis", "sle_organ", "Renal lupus — typically SLE with nephritis."),
        ("discoid", "sle_subtype", "Discoid lupus — verify systemic vs cutaneous."),
    ],
    "sarc": [
        ("tuberculosis", "confounder", "TB can mimic sarcoidosis — verify diagnosis."),
        ("berylliosis", "confounder", "Occupational granulomatous disease — disambiguate."),
    ],
}


def primary_condition_fields(disease_id: str = "scd") -> dict[str, str]:
    spec = get_disease(disease_id)
    return {
        "condition_mesh_id": spec.mesh_id,
        "condition_mesh_label": spec.mesh_label,
        "condition_snomed_id": spec.snomed_id,
        "condition_snomed_label": spec.snomed_label,
        "condition_icd10_code": spec.icd10_code,
        "condition_icd10_label": spec.icd10_label,
        "disease_id": spec.disease_id,
    }


def indication_fields_for_fda(disease_id: str = "scd") -> dict[str, str]:
    fields = primary_condition_fields(disease_id)
    return {
        "indication_mesh_id": fields["condition_mesh_id"],
        "indication_mesh_label": fields["condition_mesh_label"],
        "indication_icd10_code": fields["condition_icd10_code"],
        "indication_disambiguation": f"primary_{disease_id}",
        "disease_id": disease_id,
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
