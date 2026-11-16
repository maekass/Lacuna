#!/usr/bin/env python3
"""Shadow mode: log champion predictions for newly registered, not-yet-finished trials.

Pulls trials first posted in the last ``--since-days`` days (same condition
queries as training, status NOT_YET_RECRUITING or RECRUITING) from the
ClinicalTrials.gov API v2, scores them with the served champion, and appends
one hash-chained record per new (nct_id, model_version) to the committed
append-only log. Outcomes are joined later by ``score_shadow_log.py``.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/shadow_predict.py --since-days 30
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import date, timedelta
from pathlib import Path

import numpy as np

from lacuna_ct import completion_features as cf
from lacuna_ct import shadow_log
from lacuna_ct.constants import NEGATIVE_CONDITION_QUERIES, WH_CONDITION_QUERIES
from lacuna_ct.fetch_training_data import CTG_BASE, CTGOV_STUDY_FIELDS, REQUEST_DELAY_S, USER_AGENT, _parse_study

ROOT = Path(__file__).resolve().parents[3]
REGISTRY = ROOT / "services/python-api/model_registry/completion"
DEFAULT_LOG = ROOT / "ml/clinical_trials/shadow/completion_predictions.jsonl"


def fetch_new(since: date, max_pages: int) -> list[dict]:
    import httpx

    rows, seen = [], set()
    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        for query in (*WH_CONDITION_QUERIES, *NEGATIVE_CONDITION_QUERIES):
            token = None
            for _ in range(max_pages):
                params = {
                    "query.cond": query,
                    "filter.overallStatus": "NOT_YET_RECRUITING,RECRUITING",
                    "filter.advanced": f"AREA[StudyFirstPostDate]RANGE[{since.isoformat()},MAX]",
                    "pageSize": "100",
                    "sort": "StudyFirstPostDate:desc",
                    "fields": CTGOV_STUDY_FIELDS,
                }
                if token:
                    params["pageToken"] = token
                r = client.get(CTG_BASE, params=params, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
                r.raise_for_status()
                payload = r.json()
                for study in payload.get("studies") or []:
                    row = _parse_study(study)
                    if row["nct_id"] and row["nct_id"] not in seen:
                        seen.add(row["nct_id"])
                        rows.append(row)
                token = payload.get("nextPageToken")
                if not token:
                    break
                time.sleep(REQUEST_DELAY_S)
    return rows


def main() -> None:
    import joblib

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since-days", type=int, default=30)
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG)
    parser.add_argument("--registry", type=Path, default=REGISTRY)
    args = parser.parse_args()

    manifest = json.loads((args.registry / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["champion"]
    entry = manifest["versions"][version]
    artifact = args.registry / entry["artifact"]
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != entry["artifact_sha256"]:
        raise SystemExit("artifact sha256 mismatch; refusing to log")
    model = joblib.load(artifact)
    thresholds = entry.get("rank_thresholds_risk") or {}
    if not thresholds:
        raise SystemExit("manifest has no rank_thresholds_risk; run the decision evaluation first")

    existing = {(r["nct_id"], r["model_version"]) for r in shadow_log.read_log(args.log)}
    rows = [r for r in fetch_new(date.today() - timedelta(days=args.since_days), args.max_pages) if (r["nct_id"], version) not in existing]
    if not rows:
        print("no new trials to log")
        return
    X = np.asarray([cf.model_row(r) for r in rows], dtype=object)
    probs = model.predict_proba(X)[:, 1]
    now = shadow_log.utc_now()
    records = [
        shadow_log.make_record(
            nct_id=r["nct_id"],
            model_id=manifest["model_id"],
            model_version=version,
            artifact_sha256=entry["artifact_sha256"],
            probability_completed=float(p),
            rank_bucket=shadow_log.rank_bucket(1.0 - float(p), thresholds),
            source="batch:new_registrations",
            predicted_at=now,
            extra={"status_at_prediction": r["status"], "start_year": r["start_year"]},
        )
        for r, p in sorted(zip(rows, probs), key=lambda t: t[0]["nct_id"])
    ]
    shadow_log.append_records(args.log, records)
    buckets = {b: sum(1 for x in records if x["rank_bucket"] == b) for b in shadow_log.BUCKETS}
    print(f"logged {len(records)} predictions for {version}; buckets {buckets}; total {shadow_log.verify_log(args.log)}")


if __name__ == "__main__":
    main()
