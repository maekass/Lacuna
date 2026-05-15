"""Indication disambiguation for trial titles and search queries."""

from __future__ import annotations

from src.disease_registry import get_disease
from src.ontology.concepts import AMBIGUOUS_PATTERNS_BY_DISEASE, HB_DISORDER_MESH


def disambiguate_indication(
    text: str,
    *,
    query: str = "",
    disease_id: str = "scd",
) -> tuple[str, str]:
    blob = f"{text} {query}".lower()
    spec = get_disease(disease_id)
    for pattern, tag, note in AMBIGUOUS_PATTERNS_BY_DISEASE.get(disease_id, []):
        if pattern in blob:
            if tag == "broader_hemoglobinopathy":
                return (
                    "ambiguous",
                    f"{note} SNOMED alt: {HB_DISORDER_MESH.code} ({HB_DISORDER_MESH.label}).",
                )
            return (tag, note)

    primary_tokens = {
        "scd": ("sickle cell", "scd"),
        "sle": ("systemic lupus", "lupus erythematosus", " sle"),
        "sarc": ("sarcoidosis", "sarcoid "),
    }
    for token in primary_tokens.get(disease_id, ()):
        if token in blob:
            return (f"primary_{disease_id}", f"Anchored to MeSH {spec.mesh_id}.")

    return ("ambiguous", "No explicit disease token; verify condition module in source registry.")
