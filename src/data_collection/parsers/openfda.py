"""
openFDA drug label API parser (indications_and_usage search).
https://open.fda.gov/apis/drug/label/
"""

from __future__ import annotations

from typing import Any

import requests

PARSER_VERSION = "2026.05.2"
OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"


def _first(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        return str(val[0]) if val else ""
    return str(val)


def parse_label_results(payload: dict[str, Any], *, max_rows: int = 25) -> list[dict[str, str]]:
    """Map openFDA label `results[]` to fda_approvals schema rows."""
    rows: list[dict[str, str]] = []
    for item in payload.get("results", [])[:max_rows]:
        brand = _first(item.get("openfda", {}).get("brand_name") if isinstance(item.get("openfda"), dict) else None)
        if not brand:
            brand = _first(item.get("brand_name"))
        generic = _first(item.get("openfda", {}).get("generic_name") if isinstance(item.get("openfda"), dict) else None)
        manufacturer = _first(item.get("openfda", {}).get("manufacturer_name") if isinstance(item.get("openfda"), dict) else None)
        substance = _first(item.get("active_ingredient")) or generic or brand
        rows.append(
            {
                "drug_name": brand or generic or "—",
                "company": manufacturer or "—",
                "approval_date": "—",  # label endpoint rarely has approval date; see drugsfda later
                "mechanism": (substance[:120] if substance else "—"),
                "phase": "Label (openFDA)",
                "efficacy": (_first(item.get("indications_and_usage"))[:200] or "—"),
            }
        )
    return rows


def fetch_labels_for_query(
    query: str,
    *,
    limit: int = 20,
    timeout: int = 30,
) -> tuple[list[dict[str, str]], dict[str, Any]]:
    """
    Search drug labels by indication text. Returns (rows, meta) where meta has pull metadata.
  """
    params = {"search": f'indications_and_usage:"{query}"', "limit": min(limit, 100)}
    meta: dict[str, Any] = {
        "source_url": OPENFDA_LABEL_URL,
        "params": params,
        "http_status": None,
        "parser_version": PARSER_VERSION,
    }
    try:
        resp = requests.get(OPENFDA_LABEL_URL, params=params, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            return [], meta
        payload = resp.json()
        rows = parse_label_results(payload, max_rows=limit)
        meta["row_count"] = len(rows)
        return rows, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return [], meta
