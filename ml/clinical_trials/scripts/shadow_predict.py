#!/usr/bin/env python3
"""Shadow mode: log champion predictions for newly registered, not-yet-finished trials.

Pulls trials first posted in the last ``--since-days`` days (same condition
queries as training, status NOT_YET_RECRUITING or RECRUITING) from the
ClinicalTrials.gov API v2, scores them with every served version (champion and
v3), and appends one hash-chained record per new (nct_id, model_version) to the
committed append-only log. Outcomes are joined later by ``score_shadow_log.py``.

For v4's registration-time inputs the *current* record of a trial first posted
within the window stands in for version 0 (``pit_source`` in each record); it
can differ from version 0 if the sponsor already edited the record.

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
from lacuna_ct import completion_pit_features as pitf
from lacuna_ct import shadow_log
from lacuna_ct.constants import NEGATIVE_CONDITION_QUERIES, WH_CONDITION_QUERIES
from lacuna_ct.fetch_training_data import CTG_BASE, CTGOV_STUDY_FIELDS, REQUEST_DELAY_S, USER_AGENT, _parse_study

ROOT = Path(__file__).resolve().parents[3]
REGISTRY = ROOT / "services/python-api/model_registry/completion"
DEFAULT_LOG = ROOT / "ml/clinical_trials/shadow/completion_predictions.jsonl"


EXTRA_FIELDS = ",StudyFirstSubmitDate,CompletionDate,LocationFacility"


def _registration_fields(study: dict) -> dict:
    protocol = study.get("protocolSection") or {}
    status = protocol.get("statusModule") or {}
    design = protocol.get("designModule") or {}
    locations = (protocol.get("contactsLocationsModule") or {}).get("locations") or []
    start = (status.get("startDateStruct") or {}).get("date")
    return {
        "start_date": start,
        "first_submit_date": status.get("studyFirstSubmitDate"),
        "registered_status": status.get("overallStatus"),
        "registered_enrollment": (design.get("enrollmentInfo") or {}).get("count"),
        "registered_site_count": len(locations),
        "registered_start_date": start,
        "registered_completion_date": (status.get("completionDateStruct") or {}).get("date"),
    }


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
                    "fields": CTGOV_STUDY_FIELDS + EXTRA_FIELDS,
                }
                if token:
                    params["pageToken"] = token
                r = client.get(CTG_BASE, params=params, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
                r.raise_for_status()
                payload = r.json()
                for study in payload.get("studies") or []:
                    row = {**_parse_study(study), **_registration_fields(study)}
                    if row["nct_id"] and row["nct_id"] not in seen:
                        seen.add(row["nct_id"])
                        rows.append(row)
                token = payload.get("nextPageToken")
                if not token:
                    break
                time.sleep(REQUEST_DELAY_S)
    return rows


def load_version(registry: Path, manifest: dict, version: str):
    import joblib

    entry = manifest["versions"][version]
    artifact = registry / entry["artifact"]
    if hashlib.sha256(artifact.read_bytes()).hexdigest() != entry["artifact_sha256"]:
        raise SystemExit(f"artifact sha256 mismatch for {version}; refusing to log")
    if not entry.get("rank_thresholds_risk"):
        raise SystemExit(f"{version} has no rank_thresholds_risk; run the decision evaluation first")
    index = None
    if entry.get("featurizer_version") == pitf.FEATURIZER_VERSION:
        path = registry / entry["sponsor_index"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sponsor_index_sha256"]:
            raise SystemExit(f"sponsor index sha256 mismatch for {version}; refusing to log")
        index = pitf.SponsorIndex(json.loads(path.read_text(encoding="utf-8")))
    return entry, joblib.load(artifact), index


def design_row(row: dict, entry: dict, index) -> list:
    base = cf.model_row(row)
    if index is None:
        return base
    extra, _ = pitf.pit_features(row, index, entry["v0_training_medians"])
    return [*base, *extra]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since-days", type=int, default=30)
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG)
    parser.add_argument("--registry", type=Path, default=REGISTRY)
    args = parser.parse_args()

    manifest = json.loads((args.registry / "manifest.json").read_text(encoding="utf-8"))
    champion = manifest["champion"]
    versions = [champion, *sorted(v for v in manifest["versions"] if v != champion)]
    loaded = {v: load_version(args.registry, manifest, v) for v in versions}

    existing = {(r["nct_id"], r["model_version"]) for r in shadow_log.read_log(args.log)}
    fetched = fetch_new(date.today() - timedelta(days=args.since_days), args.max_pages)
    now = shadow_log.utc_now()
    records = []
    for version in versions:
        entry, model, index = loaded[version]
        rows = sorted((r for r in fetched if (r["nct_id"], version) not in existing), key=lambda r: r["nct_id"])
        if not rows:
            continue
        X = np.asarray([design_row(r, entry, index) for r in rows], dtype=object)
        probs = model.predict_proba(X)[:, 1]
        for r, p in zip(rows, probs):
            records.append(
                shadow_log.make_record(
                    nct_id=r["nct_id"],
                    model_id=manifest["model_id"],
                    model_version=version,
                    artifact_sha256=entry["artifact_sha256"],
                    probability_completed=float(p),
                    rank_bucket=shadow_log.rank_bucket(1.0 - float(p), entry["rank_thresholds_risk"]),
                    source="batch:new_registrations",
                    predicted_at=now,
                    extra={
                        "status_at_prediction": r["status"],
                        "start_year": r["start_year"],
                        "is_champion": version == champion,
                        "pit_source": "current_record_new_registration" if index is not None else None,
                    },
                )
            )
    if not records:
        print("no new trials to log")
        return
    shadow_log.append_records(args.log, records)
    for version in versions:
        mine = [x for x in records if x["model_version"] == version]
        buckets = {b: sum(1 for x in mine if x["rank_bucket"] == b) for b in shadow_log.BUCKETS}
        print(f"logged {len(mine)} predictions for {version}; buckets {buckets}")
    print(f"log verified: {shadow_log.verify_log(args.log)} records")


if __name__ == "__main__":
    main()
