#!/usr/bin/env python3
"""Score shadow-mode predictions against realized ClinicalTrials.gov outcomes.

Verifies the append-only hash chain of each log, fetches the current overall
status of every logged trial (public API v2, no secrets), and writes a JSON
report. Read-only: the logs are never modified.

Exit codes: 0 = scored, 1 = a log failed integrity verification,
2 = could not fetch outcomes.

Usage:
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/score_shadow_log.py
  PYTHONPATH=ml/clinical_trials python ml/clinical_trials/scripts/score_shadow_log.py \
      --log services/python-api/var/completion_shadow_log.jsonl --outcomes outcomes.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lacuna_ct import shadow_log
from lacuna_ct.shadow_scoring import fetch_current_status, score

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_LOG = ROOT / "ml/clinical_trials/shadow/completion_predictions.jsonl"
DEFAULT_REPORT = ROOT / "ml/clinical_trials/output/shadow/completion-shadow-score.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log", type=Path, action="append", help="Shadow log(s); default: committed batch log")
    parser.add_argument("--outcomes", type=Path, default=None, help="JSON {nct_id: {overall_status}} instead of CT.gov")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    records = []
    for path in args.log or [DEFAULT_LOG]:
        try:
            records.extend(shadow_log.read_log(path, verify=True))
        except shadow_log.ShadowLogError as exc:
            print(f"::error::shadow log {path} failed verification: {exc}", file=sys.stderr)
            return 1
    try:
        if args.outcomes:
            outcomes = json.loads(args.outcomes.read_text(encoding="utf-8"))
        else:
            outcomes = fetch_current_status([str(r.get("nct_id") or "") for r in records])
    except Exception as exc:  # noqa: BLE001
        print(f"Could not fetch outcomes: {exc}", file=sys.stderr)
        return 2
    report = score(records, outcomes)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    for version, entry in report["versions"].items():
        print(
            f"{version}: {entry['predictions']} predictions, {entry['resolved']} resolved "
            f"({entry['resolved_class_counts']}); metrics: "
            f"{'computed' if entry['metrics_on_resolved'] else entry.get('metrics_note')}"
        )
    print(f"Report -> {args.report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
