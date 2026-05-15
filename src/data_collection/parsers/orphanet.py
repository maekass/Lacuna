"""
Orphadata epidemiology API (product9_prev).
https://api.orphadata.com/rd-epidemiology/orphacodes/{orphacode}
"""

from __future__ import annotations

from typing import Any

import requests

PARSER_VERSION = "2026.05.3"
ORPHANET_EPI_URL = "https://api.orphadata.com/rd-epidemiology/orphacodes/{orphacode}"


def parse_prevalence_entries(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten Orphadata epidemiology `Prevalence[]` rows."""
    results = payload.get("data", {}).get("results", {})
    if not isinstance(results, dict):
        return []
    entries = results.get("Prevalence") or []
    if not isinstance(entries, list):
        return []
    out: list[dict[str, Any]] = []
    for row in entries:
        if not isinstance(row, dict):
            continue
        out.append(
            {
                "geographic": str(row.get("PrevalenceGeographic", "")),
                "prevalence_type": str(row.get("PrevalenceType", "")),
                "prevalence_class": str(row.get("PrevalenceClass", "")),
                "val_moy_per_100k": _to_float(row.get("ValMoy")),
                "validation_status": str(row.get("PrevalenceValidationStatus", "")),
                "source": str(row.get("Source", ""))[:200],
            }
        )
    return out


def select_us_point_prevalence_per_100k(entries: list[dict[str, Any]]) -> float | None:
    """Prefer validated U.S. point prevalence (ValMoy per 100,000)."""
    us_point = [
        e
        for e in entries
        if e.get("geographic") == "United States"
        and "point" in str(e.get("prevalence_type", "")).lower()
        and e.get("val_moy_per_100k") is not None
    ]
    if not us_point:
        return None
    validated = [e for e in us_point if "validated" in str(e.get("validation_status", "")).lower()]
    pick = validated[0] if validated else us_point[0]
    return float(pick["val_moy_per_100k"])


def _to_float(val: Any) -> float | None:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def fetch_orphanet_epidemiology(
    orphacode: int,
    *,
    timeout: int = 30,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Fetch epidemiology for an ORPHA code. Returns (entries, meta)."""
    url = ORPHANET_EPI_URL.format(orphacode=orphacode)
    meta: dict[str, Any] = {
        "source_url": url,
        "params": {"orphacode": orphacode},
        "http_status": None,
        "parser_version": PARSER_VERSION,
        "orphacode": orphacode,
    }
    try:
        resp = requests.get(url, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            meta["error"] = resp.text[:200]
            return [], meta
        payload = resp.json()
        entries = parse_prevalence_entries(payload)
        meta["row_count"] = len(entries)
        meta["us_point_prevalence_per_100k"] = select_us_point_prevalence_per_100k(entries)
        preferred = payload.get("data", {}).get("results", {}).get("Preferred term")
        if preferred:
            meta["preferred_term"] = preferred
        return entries, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return [], meta
