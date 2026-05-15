"""
Indication disambiguation for trial titles and search queries.
"""

from __future__ import annotations

from src.ontology.concepts import AMBIGUOUS_INDICATION_PATTERNS, HB_DISORDER_MESH, SCD_CONDITION


def disambiguate_indication(
    text: str,
    *,
    query: str = "",
) -> tuple[str, str]:
    """
    Returns (indication_disambiguation, notes).
    Values: primary_scd | ambiguous | broader_hemoglobinopathy | scd_related | scd_complication
    """
    blob = f"{text} {query}".lower()
    for pattern, tag, note in AMBIGUOUS_INDICATION_PATTERNS:
        if pattern in blob:
            if tag == "broader_hemoglobinopathy":
                return (
                    "ambiguous",
                    f"{note} SNOMED alt: {HB_DISORDER_MESH.code} ({HB_DISORDER_MESH.label}).",
                )
            return (tag, note)
    if "sickle cell" in blob or "scd" in blob.split():
        return ("primary_scd", f"Anchored to MeSH {SCD_CONDITION['mesh'].code}.")
    return ("ambiguous", "No explicit sickle cell token; verify condition module in source registry.")
