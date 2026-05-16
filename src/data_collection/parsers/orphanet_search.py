"""
Orphadata disease index and name / ORPHA lookup (product1 cross-referencing).
https://api.orphadata.com/
"""

from __future__ import annotations

from typing import Any

import requests

PARSER_VERSION = "2026.05.6"
ORPHANET_CODES_URL = "https://api.orphadata.com/rd-cross-referencing/orphacodes"
ORPHANET_NAME_URL = "https://api.orphadata.com/rd-cross-referencing/orphacodes/names/{name}"
ORPHANET_CODE_URL = "https://api.orphadata.com/rd-cross-referencing/orphacodes/{orphacode}"


def parse_orphanet_index(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = payload.get("data", {}).get("results", [])
    if not isinstance(results, list):
        return []
    out: list[dict[str, Any]] = []
    for row in results:
        if not isinstance(row, dict):
            continue
        code = row.get("ORPHAcode")
        term = row.get("Preferred term") or row.get("Preferred_term")
        if code is not None and term:
            out.append({"orpha_code": int(code), "preferred_term": str(term)})
    return out


def fetch_orphanet_index(*, timeout: int = 90) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    meta: dict[str, Any] = {"source_url": ORPHANET_CODES_URL, "http_status": None}
    try:
        resp = requests.get(ORPHANET_CODES_URL, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            meta["error"] = resp.text[:200]
            return [], meta
        rows = parse_orphanet_index(resp.json())
        meta["row_count"] = len(rows)
        return rows, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return [], meta


def search_orphanet_index(
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
        term = str(row.get("preferred_term", "")).lower()
        if q in term:
            hits.append(row)
            if len(hits) >= limit:
                break
    return hits


def parse_crossref(payload: dict[str, Any]) -> dict[str, Any]:
    """Extract ontology anchors from Orphanet cross-referencing payload."""
    results = payload.get("data", {}).get("results", {})
    if not isinstance(results, dict):
        return {}
    preferred = str(results.get("Preferred term", ""))
    orpha = results.get("ORPHAcode")
    icd10: list[str] = []
    omim: list[str] = []
    umls: list[str] = []
    for ref in results.get("ExternalReference") or []:
        if not isinstance(ref, dict):
            continue
        source = str(ref.get("Source", ""))
        code = str(ref.get("Reference", "")).strip()
        if not code:
            continue
        if source == "ICD-10":
            icd10.append(code)
        elif source == "OMIM":
            omim.append(code)
        elif source == "UMLS":
            umls.append(code)
    return {
        "preferred_term": preferred,
        "orpha_code": int(orpha) if orpha is not None else None,
        "disorder_group": str(results.get("DisorderGroup", "")),
        "typology": str(results.get("Typology", "") or ""),
        "icd10_codes": icd10[:5],
        "omim_codes": omim[:5],
        "umls_codes": umls[:3],
        "orphanet_url": results.get("OrphanetURL") or results.get("OrphanetURL".lower(), ""),
    }


def fetch_orphanet_crossref(orphacode: int, *, timeout: int = 30) -> tuple[dict[str, Any], dict[str, Any]]:
    url = ORPHANET_CODE_URL.format(orphacode=orphacode)
    meta: dict[str, Any] = {"source_url": url, "orphacode": orphacode, "http_status": None}
    try:
        resp = requests.get(url, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            return {}, meta
        parsed = parse_crossref(resp.json())
        meta["preferred_term"] = parsed.get("preferred_term")
        return parsed, meta
    except Exception as exc:
        meta["error"] = str(exc)
        return {}, meta


def fetch_orphanet_by_name(name: str, *, timeout: int = 30) -> tuple[dict[str, Any], dict[str, Any]]:
    """Exact name path match (Orphanet API); use index search for partial matches."""
    from urllib.parse import quote

    url = ORPHANET_NAME_URL.format(name=quote(name.strip()))
    meta: dict[str, Any] = {"source_url": url, "http_status": None}
    try:
        resp = requests.get(url, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            return {}, meta
        return parse_crossref(resp.json()), meta
    except Exception as exc:
        meta["error"] = str(exc)
        return {}, meta
