"""
CDC NNDSS Weekly Data disease universe via data.cdc.gov (Socrata Open Data API).
https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import requests

PARSER_VERSION = "2026.05.7"
NNDSS_DATASET_ID = "x9gk-5huc"
NNDSS_API_URL = f"https://data.cdc.gov/resource/{NNDSS_DATASET_ID}.json"
NNDSS_SOURCE_URL = "https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc"
NNDSS_ABOUT_URL = "https://www.cdc.gov/nndss/index.html"
US_RESIDENTS = "US RESIDENTS"


def _soql_escape(value: str) -> str:
    return value.replace("'", "''")


def parse_nndss_labels(payload: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in payload:
        label = str(row.get("label", "")).strip()
        if not label or label in seen:
            continue
        seen.add(label)
        out.append(
            {
                "cdc_label": label,
                "source": "cdc_nndss",
                "dataset_url": NNDSS_SOURCE_URL,
            }
        )
    return out


def fetch_nndss_disease_index(*, timeout: int = 60) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Distinct nationally notifiable conditions reported for U.S. residents."""
    params = {
        "$select": "label",
        "$where": f"states='{_soql_escape(US_RESIDENTS)}'",
        "$group": "label",
        "$order": "label",
        "$limit": 500,
    }
    meta: dict[str, Any] = {
        "source_url": NNDSS_API_URL,
        "params": params,
        "parser_version": PARSER_VERSION,
        "http_status": None,
    }
    try:
        resp = requests.get(NNDSS_API_URL, params=params, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            meta["error"] = resp.text[:200]
            return [], meta
        rows = parse_nndss_labels(resp.json())
        meta["row_count"] = len(rows)
        return rows, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return [], meta


def search_nndss_index(
    index: list[dict[str, Any]],
    query: str,
    *,
    limit: int = 25,
) -> list[dict[str, Any]]:
    q = query.strip().lower()
    if not q:
        return []
    hits: list[dict[str, Any]] = []
    for row in index:
        label = str(row.get("cdc_label", "")).lower()
        if q in label:
            hits.append(row)
            if len(hits) >= limit:
                break
    return hits


def fetch_nndss_us_snapshot(cdc_label: str, *, timeout: int = 30) -> tuple[dict[str, Any], dict[str, Any]]:
    """Latest weekly NNDSS row for U.S. residents and this condition label."""
    safe = _soql_escape(cdc_label)
    params = {
        "$where": f"states='{_soql_escape(US_RESIDENTS)}' AND label='{safe}'",
        "$order": "year DESC, week DESC",
        "$limit": 1,
    }
    meta: dict[str, Any] = {
        "source_url": NNDSS_API_URL,
        "params": params,
        "cdc_label": cdc_label,
        "http_status": None,
    }
    try:
        resp = requests.get(NNDSS_API_URL, params=params, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            return {}, meta
        rows = resp.json()
        if not rows:
            return {}, meta
        row = rows[0]
        return {
            "cdc_label": cdc_label,
            "report_year": row.get("year"),
            "report_week": row.get("week"),
            "current_week_cases": row.get("m2"),
            "current_week_flag": row.get("m2_flag"),
            "cumulative_cases": row.get("m1"),
            "cumulative_flag": row.get("m1_flag"),
            "dataset_url": NNDSS_SOURCE_URL,
            "about_url": NNDSS_ABOUT_URL,
        }, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return {}, meta


def cdc_label_profile_url(cdc_label: str) -> str:
    """Deep link to dataset filtered view (best-effort)."""
    return f"{NNDSS_SOURCE_URL}/data?search={quote(cdc_label)}"
