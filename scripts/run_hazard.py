#!/usr/bin/env python3
"""Phase runner for the acquisition-time hazard package."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "ml" / "hazard"))

from lacuna_hazard.pipeline import PHASES, run_phases  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Fit the descriptive Cox hazard summary on dataset.verified.json "
            "and export src/data/ml/hazard/acquisition-time-v1.json."
        )
    )
    parser.add_argument(
        "--phase",
        action="append",
        dest="phases",
        choices=list(PHASES),
        help="Run one phase (repeatable). Default: all phases in order.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Refit and fail if the committed artifact drifted (no write).",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=ROOT,
        help="Repository root (default: inferred from this script).",
    )
    args = parser.parse_args()
    run_phases(args.phases, root=args.root.resolve(), check=args.check)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
