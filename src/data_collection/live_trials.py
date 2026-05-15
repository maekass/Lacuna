"""Live ClinicalTrials.gov fetch (v2 with legacy fallback)."""

from __future__ import annotations

import pandas as pd
import requests

from src.data_collection.parsers.clinical_trials import parse_legacy_full_studies, parse_v2_studies


def fetch_clinical_trials(query: str, *, max_trials: int = 40) -> pd.DataFrame:
    """Return trial rows for a condition query; empty DataFrame on failure."""
    trials: list[dict[str, str]] = []
    legacy_url = "https://clinicaltrials.gov/api/query/full_studies"
    legacy_params = {"expr": query, "min_rnk": 1, "max_rnk": max_trials, "fmt": "json"}
    try:
        response = requests.get(legacy_url, params=legacy_params, timeout=30)
        if response.status_code == 200:
            trials = parse_legacy_full_studies(response.json(), max_trials=max_trials)
    except Exception:
        pass

    if not trials:
        v2_url = "https://clinicaltrials.gov/api/v2/studies"
        v2_params = {"query.cond": query, "pageSize": min(max_trials, 100)}
        try:
            r2 = requests.get(v2_url, params=v2_params, timeout=30)
            if r2.status_code == 200:
                trials = parse_v2_studies(r2.json(), max_trials=max_trials)
        except Exception:
            pass

    if not trials:
        return pd.DataFrame()
    return pd.DataFrame(trials)
