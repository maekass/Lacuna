#!/usr/bin/env python3
"""
Bulk ingest ClinicalTrials.gov studies to cached_training.json.

Usage:
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/ingest_ctgov.py
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/ingest_ctgov.py --max-pages 20
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/ingest_ctgov.py --page-size 100 --all-queries
"""

from __future__ import annotations

import argparse
from pathlib import Path

from lacuna_ct.constants import NEGATIVE_CONDITION_QUERIES, WH_CONDITION_QUERIES
from lacuna_ct.fetch_training_data import (
    CTGOV_STUDY_FIELDS,
    TrialRecord,
    build_training_records,
    fetch_studies_for_condition,
    load_seed_records,
    save_records,
)


def ingest_all_queries(
    *,
    max_pages: int,
    page_size: int,
    fields: str,
) -> list[TrialRecord]:
    import httpx
    import time
    from lacuna_ct.fetch_training_data import REQUEST_DELAY_S

    records: list[TrialRecord] = []
    seen: set[str] = set()

    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        all_queries = list(WH_CONDITION_QUERIES) + list(NEGATIVE_CONDITION_QUERIES)
        for query in all_queries:
            label_wh = 1 if query in WH_CONDITION_QUERIES else 0
            for row in fetch_studies_for_condition(
                client,
                query,
                page_size=page_size,
                max_pages=max_pages,
                fields=fields,
            ):
                nct = row["nct_id"]
                if not nct or nct in seen:
                    continue
                seen.add(nct)
                records.append(TrialRecord(**row, label_wh=label_wh, source_query=query))
            time.sleep(REQUEST_DELAY_S)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest CT.gov trials for Lacuna ML")
    parser.add_argument("--max-pages", type=int, default=5, help="Pages per condition query")
    parser.add_argument("--page-size", type=int, default=100, help="Studies per page (max 100)")
    parser.add_argument(
        "--fields",
        type=str,
        default=CTGOV_STUDY_FIELDS,
        help="Comma-separated CT.gov v2 fields",
    )
    parser.add_argument(
        "--all-queries",
        action="store_true",
        help="Ingest all WH + negative condition queries",
    )
    parser.add_argument("--offline", action="store_true", help="Skip network; copy seed to cache")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[3]
    cache = root / "ml/clinical_trials/data/cached_training.json"

    if args.offline:
        records = load_seed_records()
    elif args.all_queries:
        records = ingest_all_queries(
            max_pages=args.max_pages,
            page_size=min(args.page_size, 100),
            fields=args.fields,
        )
    else:
        records = build_training_records(
            use_network=True,
            max_pages=args.max_pages,
            page_size=min(args.page_size, 100),
        )

    save_records(records, cache)
    print(f"Saved {len(records)} records → {cache}")


if __name__ == "__main__":
    main()
