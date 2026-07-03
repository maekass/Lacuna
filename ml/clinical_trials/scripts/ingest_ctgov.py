#!/usr/bin/env python3
"""
Bulk ingest ClinicalTrials.gov studies to cached_training.json.

Usage:
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/ingest_ctgov.py
  PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/ingest_ctgov.py --max-pages 10
"""

from __future__ import annotations

import argparse
from pathlib import Path

from lacuna_ct.fetch_training_data import build_training_records, save_records


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest CT.gov trials for Lacuna ML")
    parser.add_argument("--max-pages", type=int, default=5, help="Pages per condition query")
    parser.add_argument("--offline", action="store_true", help="Skip network; copy seed to cache")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[3]
    cache = root / "ml/clinical_trials/data/cached_training.json"

    if args.offline:
        from lacuna_ct.fetch_training_data import load_seed_records

        records = load_seed_records()
    else:
        records = build_training_records(use_network=True, max_pages=args.max_pages)

    save_records(records, cache)
    print(f"Saved {len(records)} records → {cache}")


if __name__ == "__main__":
    main()
