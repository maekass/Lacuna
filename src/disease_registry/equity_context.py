"""
Citation-backed equity context snippets for focus indications (population framing, not market).
Replace or extend with peer-reviewed sources as your workflow matures.
"""

from __future__ import annotations

# Short labels + primary public URLs for dashboard "Stratified context" expander.
EQUITY_SNIPPETS: dict[str, list[dict[str, str]]] = {
    "scd": [
        {
            "title": "CDC — Sickle cell disease data & statistics",
            "url": "https://www.cdc.gov/sickle-cell/data/index.html",
            "note": "U.S. surveillance and education framing; use for population burden, not investment thesis.",
        },
        {
            "title": "WHO — Sickle cell disease key facts",
            "url": "https://www.who.int/news-room/fact-sheets/detail/sickle-cell-disease",
            "note": "Global burden context; complements Orphanet prevalence for rare-disease registry work.",
        },
    ],
    "sle": [
        {
            "title": "CDC — Systemic lupus erythematosus (SLE)",
            "url": "https://www.cdc.gov/lupus/facts/index.html",
            "note": "U.S. population messaging; SLE disproportionately affects women, with higher burden among Black women—verify with primary literature for analyses.",
        },
        {
            "title": "NIH — Handout on health: Systemic lupus erythematosus",
            "url": "https://www.niams.nih.gov/health-topics/lupus",
            "note": "Patient-oriented reference; useful for terminology and organ-system framing.",
        },
    ],
    "sarc": [
        {
            "title": "NIH — Sarcoidosis",
            "url": "https://www.nhlbi.nih.gov/health/sarcoidosis",
            "note": "Overview of organ involvement; U.S. sarcoidosis burden varies by race, sex, and geography—cite cohort studies for quantitative stratification.",
        },
    ],
}


def equity_snippets_for(disease_id: str) -> list[dict[str, str]]:
    return list(EQUITY_SNIPPETS.get(disease_id, []))


def render_equity_snippets_markdown(disease_id: str) -> str:
    rows = equity_snippets_for(disease_id)
    if not rows:
        return ""
    parts = ["**Stratified / citation context** (population framing — verify in primary sources)\n"]
    for r in rows:
        parts.append(f"- [{r['title']}]({r['url']}) — {r['note']}")
    return "\n".join(parts)
