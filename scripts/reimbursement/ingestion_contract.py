#!/usr/bin/env python3
"""Sidecar contract for Python + DuckDB → TypeScript reimbursement ingestion.

This module does not fetch CMS files or invent rates. It emits / validates the
JSON sidecar that `src/lib/reimbursement/ingestion.ts` accepts. DuckDB/Parquet
are optional: set output.format=parquet and parquetPath when a producer writes
a table outside the Next.js runtime.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

CONTRACT_VERSION = "1.0.0"
MANIFEST_VERSION = "1.0.0"
NOW = "2026-09-18T00:00:00.000Z"

PUBLIC_CMS_HCPCS = (
    "https://www.cms.gov/medicare/coding-billing/"
    "healthcare-common-procedure-system"
)
PUBLIC_CMS_PFS = "https://www.cms.gov/medicare/payment/fee-schedules/physician"


def example_source_manifest() -> dict[str, Any]:
    return {
        "schemaVersion": MANIFEST_VERSION,
        "generatedAt": NOW,
        "generatedBy": "lacuna-reimbursement-ingestion-contract",
        "artifacts": [
            {
                "id": "artifact:cms:hcpcs-public",
                "title": "HCPCS Level II public files",
                "publisher": "Centers for Medicare & Medicaid Services",
                "artifactType": "cms_hcpcs",
                "sourceUrl": PUBLIC_CMS_HCPCS,
                "retrievedAt": NOW,
                "format": "html",
                "storagePolicy": "link_only",
                "redistribution": "public",
                "notes": [
                    "SA051 investigation catalog only. No rate row is attached.",
                ],
            },
            {
                "id": "artifact:cms:pfs-overview",
                "title": "Medicare Physician Fee Schedule overview",
                "publisher": "Centers for Medicare & Medicaid Services",
                "artifactType": "cms_pfs_rvu",
                "sourceUrl": PUBLIC_CMS_PFS,
                "retrievedAt": NOW,
                "format": "html",
                "storagePolicy": "link_only",
                "redistribution": "public",
                "notes": [
                    "Payment-mechanics catalog. Copy dated public-file inputs before any claim leaves machine_proposed.",
                ],
            },
        ],
    }


def example_batch() -> dict[str, Any]:
    """Empty observation list — catalog sources without asserting economics."""
    return {
        "contractVersion": CONTRACT_VERSION,
        "producedAt": NOW,
        "producer": {
            "runtime": "python-duckdb",
            "name": "lacuna-reimbursement-ingestion-contract",
        },
        "sourceManifest": example_source_manifest(),
        "output": {"format": "json"},
        "observations": [],
    }


def validate_batch(batch: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if batch.get("contractVersion") != CONTRACT_VERSION:
        errors.append("contractVersion must be 1.0.0")
    producer = batch.get("producer") or {}
    if producer.get("runtime") not in {"python-duckdb", "typescript"}:
        errors.append("producer.runtime must be python-duckdb or typescript")
    manifest = batch.get("sourceManifest") or {}
    if manifest.get("schemaVersion") != MANIFEST_VERSION:
        errors.append("sourceManifest.schemaVersion must be 1.0.0")
    artifacts = manifest.get("artifacts") or []
    artifact_ids = {row.get("id") for row in artifacts}
    output = batch.get("output") or {}
    if output.get("format") == "parquet" and not output.get("parquetPath"):
        errors.append("parquet output requires parquetPath")
    for index, row in enumerate(batch.get("observations") or []):
        if row.get("sourceArtifactId") not in artifact_ids:
            errors.append(
                f"observations.{index}.sourceArtifactId is not in the manifest",
            )
        for field in ("workRvu", "practiceExpenseRvu", "malpracticeRvu",
                      "conversionFactor", "paymentAmount"):
            if field in row and row[field] == 0 and row.get("missingAsZero"):
                errors.append(
                    f"observations.{index}.{field} must not coerce missing to zero",
                )
        if row.get("dataYear") is None:
            errors.append(f"observations.{index}.dataYear is required")
    return errors


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Emit or validate the reimbursement ingestion sidecar.",
    )
    parser.add_argument("--emit-example", action="store_true")
    parser.add_argument("--validate", metavar="PATH")
    args = parser.parse_args(argv)

    if args.emit_example:
        json.dump(example_batch(), sys.stdout, indent=2)
        sys.stdout.write("\n")
        return 0

    if args.validate:
        with open(args.validate, encoding="utf-8") as handle:
            batch = json.load(handle)
        errors = validate_batch(batch)
        if errors:
            for error in errors:
                print(error, file=sys.stderr)
            return 1
        print("ok")
        return 0

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
