#!/usr/bin/env python3
"""Fetch ClinicalTrials.gov first registered versions (history version 0).

Uses the website's record-history endpoint ``/api/int/studies/{nct}/history``
(the official API v2 has no history endpoint). Requests are rate limited and
the run stops instead of retrying when the endpoint keeps refusing.

For the temporal-holdout rows the version list (``changes``) is also stored so
the evaluation can show why change-count features are excluded.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/fetch_completion_history.py
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from lacuna_ct import completion_production as cp
from lacuna_ct import point_in_time as pit
from lacuna_ct.fetch_training_data import TrialRecord, load_cached_records

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "ml/clinical_trials/data"
REGISTRY = ROOT / "services/python-api/model_registry/completion"


def fetch_changes(ids: list[str]) -> tuple[dict[str, list], dict]:
    headers = {"Accept": "application/json", "User-Agent": "Lacuna-ML-Research/1.0 (educational; mps5cy@virginia.edu)"}
    out, codes, fails = {}, {}, 0
    with httpx.Client(timeout=45.0, follow_redirects=True) as c:
        c.get("https://clinicaltrials.gov/api/v2/version", headers=headers)
        for nct in ids:
            r = c.get(pit.HISTORY_BASE.format(nct=nct), headers=headers)
            codes[str(r.status_code)] = codes.get(str(r.status_code), 0) + 1
            if r.status_code == 200:
                out[nct] = [
                    {k: ch.get(k) for k in ("version", "date", "status", "moduleLabels")}
                    for ch in r.json().get("changes") or []
                ]
                fails = 0
            else:
                fails += 1
                if fails >= 25:
                    break
            time.sleep(0.15)
    return out, {"requested": len(ids), "returned": len(out), "http_status_counts": codes}


def main() -> None:
    records = load_cached_records(DATA / "cached_training.json")
    labeled = cp.labeled_records(records)
    split = json.loads((REGISTRY / "split.json").read_text(encoding="utf-8"))
    ext, _ = pit.load_frozen(DATA / "external_cohort.json")
    ext_labeled = cp.labeled_records([TrialRecord(**r) for r in ext["records"]])
    ids = sorted({r.nct_id for r in labeled} | {r.nct_id for r in ext_labeled})
    started = datetime.now(timezone.utc).isoformat()
    v0, report = pit.fetch_first_versions(ids, workers=2, delay_s=0.2, progress=lambda n: print("v0", n, flush=True))
    print("v0 report", json.dumps(report), flush=True)
    changes, change_report = fetch_changes(split["test_nct_ids"])
    print("changes report", json.dumps(change_report), flush=True)
    meta = pit.write_frozen(
        DATA / "first_versions.json",
        {"first_versions": v0, "holdout_changes": changes},
        {
            "source": "clinicaltrials.gov /api/int/studies/{nct}/history (website record-history endpoint)",
            "fetched_started_at_utc": started,
            "fetched_finished_at_utc": datetime.now(timezone.utc).isoformat(),
            "first_version_fetch": report,
            "holdout_change_list_fetch": change_report,
            "ids": "labeled training-snapshot rows with start year + labeled external-cohort rows",
        },
    )
    prov_path = REGISTRY / "decision_data_provenance.json"
    prov = json.loads(prov_path.read_text(encoding="utf-8"))
    prov["first_versions"] = meta
    prov_path.write_text(json.dumps(prov, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
