"""
CDC-cited sickle cell disease epidemiology anchors (static public facts, not a live CDC API).
https://www.cdc.gov/sickle-cell/data/index.html
"""

from __future__ import annotations

PARSER_VERSION = "2026.05.3"
CDC_SCD_FACTS_URL = "https://www.cdc.gov/sickle-cell/data/index.html"

# Cited on CDC sickle cell disease data pages (review periodically).
CDC_SCD_PREVALENCE_US = 100_000
CDC_BLACK_BIRTHS_ONE_IN = 365  # ~1 in 365 Black or African-American births


def scd_births_per_1000_black() -> float:
    """Births with SCD per 1,000 Black or African-American births (CDC ratio)."""
    return round(1000.0 / CDC_BLACK_BIRTHS_ONE_IN, 2)


def cdc_scd_source_meta() -> dict[str, str]:
    return {
        "source_url": CDC_SCD_FACTS_URL,
        "parser_version": PARSER_VERSION,
        "extractor": "cdc_scd_facts",
        "notes": (
            f"U.S. prevalence anchor ~{CDC_SCD_PREVALENCE_US:,} persons; "
            f"Black/African-American birth ratio 1 in {CDC_BLACK_BIRTHS_ONE_IN} (CDC)."
        ),
    }
