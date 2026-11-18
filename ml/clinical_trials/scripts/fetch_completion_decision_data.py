#!/usr/bin/env python3
"""Fetch and freeze the extra CT.gov API v2 data used by the decision evaluation.

1. Probe the version-history endpoints once and record the result.
2. Fetch date fields (StartDate, StudyFirstSubmitDate, LastUpdatePostDate,
   CompletionDate) for every NCT id in the frozen training snapshot.
3. Ingest the pre-registered external cohort (different condition queries),
   dropping any NCT id already in the training snapshot.

Large outputs go to gitignored ``ml/clinical_trials/data/``; each file gets a
``.meta.json`` with its sha256. A small provenance summary is written to the
model registry so the hashes are committed.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/fetch_completion_decision_data.py
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import httpx

from lacuna_ct import point_in_time as pit
from lacuna_ct.fetch_training_data import (
    CTG_BASE,
    CTGOV_STUDY_FIELDS,
    USER_AGENT,
    TrialRecord,
    _parse_study,
    load_cached_records,
    verify_cache_metadata,
)

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "ml/clinical_trials/data"
PREREG = ROOT / "ml/clinical_trials/preregistration/completion-decision-v1.json"


def ingest_external(client: httpx.Client, queries: list[str], exclude: set[str]) -> tuple[list[dict], dict]:
    fields = CTGOV_STUDY_FIELDS + ",StudyFirstSubmitDate,LastUpdatePostDate,CompletionDate"
    records: list[dict] = []
    supplement: dict[str, dict] = {}
    seen: set[str] = set()
    per_query: dict[str, dict[str, int]] = {}
    for query in queries:
        token, fetched, kept = None, 0, 0
        for _ in range(10):
            params = {
                "query.cond": query,
                "pageSize": "100",
                "sort": "LastUpdatePostDate:desc",
                "fields": fields,
            }
            if token:
                params["pageToken"] = token
            response = client.get(
                CTG_BASE, params=params, headers={"Accept": "application/json", "User-Agent": USER_AGENT}
            )
            response.raise_for_status()
            payload = response.json()
            for study in payload.get("studies") or []:
                fetched += 1
                row = _parse_study(study)
                nct = row["nct_id"]
                if not nct or nct in seen or nct in exclude:
                    continue
                seen.add(nct)
                kept += 1
                records.append(asdict(TrialRecord(**row, label_wh=0, source_query=query)))
                supplement[nct] = pit.parse_supplement_study(study)
            token = payload.get("nextPageToken")
            if not token:
                break
            time.sleep(0.4)
        per_query[query] = {"fetched": fetched, "kept_after_dedup_and_exclusion": kept}
    return records, {"supplement": supplement, "per_query": per_query}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DATA / "cached_training.json")
    parser.add_argument(
        "--provenance-out",
        type=Path,
        default=ROOT / "services/python-api/model_registry/completion/decision_data_provenance.json",
    )
    args = parser.parse_args()

    records = load_cached_records(args.data)
    snapshot_meta = verify_cache_metadata(records, args.data)
    prereg = json.loads(PREREG.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()

    probe = pit.probe_history_api()
    print("history probe:", json.dumps(probe["attempts"]))

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        supplement = pit.fetch_supplement([r.nct_id for r in records], client=client)
        sup_meta = pit.write_frozen(
            DATA / "completion_supplement.json",
            supplement,
            {
                "source": "clinicaltrials_gov_api_v2",
                "fetched_at_utc": now,
                "fields": pit.SUPPLEMENT_FIELDS,
                "keyed_by": "NCT ids of the training snapshot",
                "training_snapshot_sha256": snapshot_meta["snapshot_file_sha256"],
                "requested": len({r.nct_id for r in records}),
                "returned": len(supplement),
            },
        )
        print("supplement:", sup_meta["returned"], "of", sup_meta["requested"])

        ext_records, ext = ingest_external(
            client, list(prereg["external_cohort"]["condition_queries"]), {r.nct_id for r in records}
        )
    ext_meta = pit.write_frozen(
        DATA / "external_cohort.json",
        {"records": ext_records, "supplement": ext["supplement"]},
        {
            "source": "clinicaltrials_gov_api_v2",
            "fetched_at_utc": now,
            "condition_queries": prereg["external_cohort"]["condition_queries"],
            "per_query": ext["per_query"],
            "record_count": len(ext_records),
            "excluded": "NCT ids present in the training snapshot",
        },
    )
    print("external:", ext_meta["record_count"], json.dumps(ext["per_query"]))

    status_changed = sum(
        1
        for r in records
        if r.nct_id in supplement and supplement[r.nct_id]["overall_status_at_fetch"] != r.status
    )
    provenance = {
        "generated_at_utc": now,
        "history_api_probe": probe,
        "training_snapshot_sha256": snapshot_meta["snapshot_file_sha256"],
        "supplement": {k: v for k, v in sup_meta.items() if k != "keyed_by"},
        "supplement_status_changed_since_snapshot": status_changed,
        "external_cohort": ext_meta,
    }
    args.provenance_out.parent.mkdir(parents=True, exist_ok=True)
    args.provenance_out.write_text(json.dumps(provenance, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("status changed since snapshot:", status_changed)


if __name__ == "__main__":
    main()
