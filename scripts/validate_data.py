#!/usr/bin/env python3
"""
Run the full data validation suite and print a report.

Usage:
    python scripts/validate_data.py                  # validate all
    python scripts/validate_data.py --strict         # exit 1 on any failure
    python scripts/validate_data.py --json           # JSON output only
    python scripts/validate_data.py --artifacts a,b  # validate specific files
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data_collection.seed_demo_data import (
    demo_bundle_present,
    seed_from_demo,
    sync_ml_from_demo,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Data validation suite")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with code 1 if any check fails",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Print JSON report instead of text",
    )
    parser.add_argument(
        "--write-report",
        action="store_true",
        help="Write report files to data/",
    )
    parser.add_argument(
        "--artifacts",
        type=str,
        default="",
        help="Comma-separated list of artifact filenames to validate",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="",
        help="Override the primary CSV data directory",
    )
    args = parser.parse_args()

    # Ensure data/raw is seeded from demo if needed (mirrors debug_check behaviour)
    raw_dir = Path(args.data_dir) if args.data_dir else ROOT / "data" / "raw"
    demo_dir = ROOT / "data" / "demo"
    if demo_bundle_present(demo_dir) and not any(raw_dir.glob("*.csv")):
        raw_dir.mkdir(parents=True, exist_ok=True)
        seed_from_demo(raw_dir, demo_dir)
        sync_ml_from_demo()

    from src.data_validation.report import format_json_report, format_text_report, write_report

    if args.artifacts:
        from src.data_validation.validators import validate_directory

        include = set(a.strip() for a in args.artifacts.split(","))
        results = validate_directory(raw_dir, include=include)
    else:
        from src.data_validation.validators import validate_all

        results = validate_all(
            data_raw=raw_dir,
            data_demo=demo_dir,
            data_processed=ROOT / "data" / "processed",
            data_models=ROOT / "data" / "models",
        )

    if args.json_output:
        print(format_json_report(results))
    else:
        print(format_text_report(results))

    if args.write_report:
        paths = write_report(results, ROOT / "data")
        for p in paths:
            print(f"Report written: {p}")

    failures = [r for r in results if not r.passed]
    errors = [r for r in failures if r.severity.value == "error"]

    if args.strict and failures:
        return 1
    if errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
