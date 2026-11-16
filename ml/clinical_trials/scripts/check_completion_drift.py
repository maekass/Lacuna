#!/usr/bin/env python3
"""Weekly PSI drift check for the served completion-proxy champion.

Pulls ClinicalTrials.gov studies updated in the last ``--since-days`` days
(same condition queries as training), featurizes them with the production
featurizer, scores them with the champion artifact from the model registry,
and compares per-feature and prediction-score distributions against the
reference profile committed next to the artifact.

Exit codes: 0 = stable or warn, 1 = drift (any PSI > alert threshold),
2 = could not run (e.g. CT.gov unreachable, artifact hash mismatch).

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/check_completion_drift.py
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/check_completion_drift.py \
      --input recent.json --no-fail
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np

from lacuna_ct import completion_features as cf
from lacuna_ct.constants import NEGATIVE_CONDITION_QUERIES, WH_CONDITION_QUERIES
from lacuna_ct.drift import PSI_ALERT, compare_to_reference
from lacuna_ct.fetch_training_data import (
    CTG_BASE,
    CTGOV_STUDY_FIELDS,
    REQUEST_DELAY_S,
    USER_AGENT,
    _parse_study,
)

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_REGISTRY = ROOT / "services/python-api/model_registry/completion"
DEFAULT_REPORT = ROOT / "ml/clinical_trials/output/drift/completion-drift-report.json"


def fetch_recent(since: date, *, max_pages: int, page_size: int = 100) -> list[dict[str, Any]]:
    import httpx

    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        for query in (*WH_CONDITION_QUERIES, *NEGATIVE_CONDITION_QUERIES):
            token: str | None = None
            for _ in range(max_pages):
                params = {
                    "query.cond": query,
                    "filter.advanced": f"AREA[LastUpdatePostDate]RANGE[{since.isoformat()},MAX]",
                    "pageSize": str(page_size),
                    "sort": "LastUpdatePostDate:desc",
                    "fields": CTGOV_STUDY_FIELDS,
                }
                if token:
                    params["pageToken"] = token
                resp = client.get(
                    CTG_BASE,
                    params=params,
                    headers={"Accept": "application/json", "User-Agent": USER_AGENT},
                )
                resp.raise_for_status()
                payload = resp.json()
                for study in payload.get("studies") or []:
                    row = _parse_study(study)
                    if row["nct_id"] and row["nct_id"] not in seen:
                        seen.add(row["nct_id"])
                        rows.append(row)
                token = payload.get("nextPageToken")
                if not token:
                    break
                time.sleep(REQUEST_DELAY_S)
            time.sleep(REQUEST_DELAY_S)
    return rows


def load_champion(registry: Path) -> tuple[dict[str, Any], str, Any, dict[str, Any]]:
    import joblib

    manifest = json.loads((registry / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["champion"]
    entry = manifest["versions"][version]
    artifact = registry / entry["artifact"]
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    if digest != entry["artifact_sha256"]:
        raise ValueError(f"Artifact hash mismatch for {version}: {digest}")
    model = joblib.load(artifact)
    reference = json.loads((registry / entry["drift_reference"]).read_text(encoding="utf-8"))
    return manifest, version, model, reference


def run_check(
    rows: list[dict[str, Any]],
    *,
    model: Any,
    reference: dict[str, Any],
    alert: float = PSI_ALERT,
) -> dict[str, Any]:
    X = np.asarray([cf.model_row(r) for r in rows], dtype=object)
    scores = model.predict_proba(X)[:, 1]
    return compare_to_reference(
        reference,
        X[:, 1:].astype(float),
        list(cf.NUMERIC_FEATURE_NAMES),
        scores,
        alert=alert,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Completion-proxy PSI drift check")
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--since-days", type=int, default=30)
    parser.add_argument("--max-pages", type=int, default=2, help="Pages per condition query")
    parser.add_argument("--input", type=Path, default=None, help="Use a JSON list of trial rows instead of CT.gov")
    parser.add_argument("--alert", type=float, default=PSI_ALERT)
    parser.add_argument("--min-rows", type=int, default=200)
    parser.add_argument("--no-fail", action="store_true", help="Always exit 0 when the check ran")
    args = parser.parse_args()

    since = date.today() - timedelta(days=args.since_days)
    try:
        manifest, version, model, reference = load_champion(args.registry)
        if args.input:
            rows = json.loads(args.input.read_text(encoding="utf-8"))
            source = f"file:{args.input.name}"
        else:
            rows = fetch_recent(since, max_pages=args.max_pages)
            source = "clinicaltrials_gov_api_v2"
    except Exception as exc:  # noqa: BLE001 - surface any blocker as exit 2
        print(f"Drift check could not run: {exc}", file=sys.stderr)
        return 2
    if len(rows) < args.min_rows:
        print(f"Only {len(rows)} current rows (< {args.min_rows}); refusing to compute PSI.", file=sys.stderr)
        return 2

    result = run_check(rows, model=model, reference=reference, alert=args.alert)
    report = {
        "schema": "lacuna-completion-drift-report-v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "model_id": manifest["model_id"],
        "model_version": version,
        "artifact_sha256": manifest["versions"][version]["artifact_sha256"],
        "training_snapshot_sha256": manifest.get("training_snapshot_sha256"),
        "current_source": source,
        "window": {"last_update_since": since.isoformat(), "since_days": args.since_days},
        **result,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"Drift status: {report['status']} (n_current={report['n_current']})")
    for name, item in report["features"].items():
        print(f"  {name:20s} PSI={item['psi']:.4f} {item['status']}")
    print(f"  {'prediction_score':20s} PSI={report['prediction_score']['psi']:.4f} {report['prediction_score']['status']}")
    print(f"Report -> {args.report}")
    if report["status"] == "drift" and not args.no_fail:
        print(f"::error::PSI above {args.alert} for: {', '.join(report['drifted'])}")
        return 1
    if report["status"] == "warn":
        print(f"::warning::PSI between 0.10 and {args.alert} for: {', '.join(report['warned'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
