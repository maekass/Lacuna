"""
openFDA drugsfda API — first approval dates and sponsors.
https://open.fda.gov/apis/drug/drugsfda/
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd
import requests

PARSER_VERSION = "2026.05.8"
DRUGSFDA_URL = "https://api.fda.gov/drug/drugsfda.json"


def _first_orig_approval_date(submissions: list[dict[str, Any]]) -> str | None:
    """Earliest APPROVED original (ORIG) submission date on the application."""
    dates: list[str] = []
    for sub in submissions or []:
        if str(sub.get("submission_type", "")).upper() != "ORIG":
            continue
        if str(sub.get("submission_status", "")).upper() != "AP":
            continue
        d = str(sub.get("submission_status_date", "")).strip()
        if len(d) == 8 and d.isdigit():
            dates.append(d)
    if not dates:
        return None
    earliest = min(dates)
    return f"{earliest[:4]}-{earliest[4:6]}-{earliest[6:8]}"


def _norm_brand(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).strip()).upper()


def lookup_brand_in_drugsfda(brand: str, *, timeout: int = 25) -> dict[str, Any]:
    """
    Return sponsor, application_number, first_approval_date (YYYY-MM-DD) for a brand name search.
    """
    brand_clean = str(brand).strip().strip("—").strip()
    if not brand_clean:
        return {}
    q = brand_clean.replace('"', '\\"')
    params = {"search": f'openfda.brand_name:"{q}"', "limit": 3}
    meta: dict[str, Any] = {
        "source_url": DRUGSFDA_URL,
        "params": params,
        "http_status": None,
        "parser_version": PARSER_VERSION,
    }
    try:
        resp = requests.get(DRUGSFDA_URL, params=params, timeout=timeout)
        meta["http_status"] = resp.status_code
        if resp.status_code != 200:
            meta["error"] = resp.text[:200]
            return meta
        payload = resp.json()
        results = payload.get("results") or []
        if not results:
            meta["row_count"] = 0
            return meta
        # Prefer application whose product brand matches (case-insensitive).
        want = _norm_brand(brand_clean)
        for app in results:
            products = app.get("products") or []
            brands = {_norm_brand(p.get("brand_name", "")) for p in products if isinstance(p, dict)}
            if want in brands or any(want in b for b in brands):
                subs = app.get("submissions") or []
                ap_date = _first_orig_approval_date(subs if isinstance(subs, list) else [])
                return {
                    **meta,
                    "row_count": 1,
                    "sponsor_name": str(app.get("sponsor_name", "") or "").strip(),
                    "application_number": str(app.get("application_number", "") or "").strip(),
                    "first_approval_date": ap_date or "",
                }
        # Fallback: first result
        app = results[0]
        subs = app.get("submissions") or []
        ap_date = _first_orig_approval_date(subs if isinstance(subs, list) else [])
        return {
            **meta,
            "row_count": 1,
            "sponsor_name": str(app.get("sponsor_name", "") or "").strip(),
            "application_number": str(app.get("application_number", "") or "").strip(),
            "first_approval_date": ap_date or "",
        }
    except Exception as exc:
        meta["error"] = str(exc)
        return meta


def enrich_fda_dataframe_with_drugsfda(df: pd.DataFrame) -> pd.DataFrame:
    """Fill approval_date / company / optional application_number from drugsfda when missing or placeholder."""
    if df.empty:
        return df
    out = df.copy()
    if "application_number" not in out.columns:
        out["application_number"] = ""
    if "approval_date_source" not in out.columns:
        out["approval_date_source"] = ""

    cache: dict[str, dict[str, Any]] = {}
    for idx in out.index:
        brand = str(out.at[idx, "drug_name"]).strip()
        nk = _norm_brand(brand)
        if not nk or nk == "—":
            continue
        if nk not in cache:
            cache[nk] = lookup_brand_in_drugsfda(brand)
        info = cache[nk]

        ap = str(info.get("first_approval_date", "") or "").strip()
        sponsor = str(info.get("sponsor_name", "") or "").strip()
        app_no = str(info.get("application_number", "") or "").strip()

        cur_ap = str(out.at[idx, "approval_date"]).strip()
        if ap and (not cur_ap or cur_ap in ("—", "-", "nan")):
            out.at[idx, "approval_date"] = ap
            out.at[idx, "approval_date_source"] = "openFDA drugsfda (ORIG/AP submission_status_date)"
        if app_no:
            out.at[idx, "application_number"] = app_no
        cur_co = str(out.at[idx, "company"]).strip()
        if sponsor and (not cur_co or cur_co in ("—", "-")):
            out.at[idx, "company"] = sponsor

    return out
