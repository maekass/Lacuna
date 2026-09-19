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
NOW = "2026-09-17T05:30:00.000Z"

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


ARTIFACT_TYPES = {
    "cms_pfs_rvu",
    "cms_pfs_rule",
    "cms_pfs_fact_sheet",
    "cms_hcpcs",
    "cms_utilization",
    "cms_other",
    "ama_reference",
    "peer_reviewed_literature",
    "other_public_source",
}
ARTIFACT_FORMATS = {
    "csv",
    "xlsx",
    "json",
    "pdf",
    "html",
    "txt",
    "parquet",
    "other",
}
STORAGE_POLICIES = {
    "link_only",
    "metadata_only",
    "local_cache_allowed",
    "full_text_allowed",
}
REDISTRIBUTIONS = {"public", "restricted", "unknown"}
CODE_SYSTEMS = {"CPT", "HCPCS"}
POSITIVE_OPTIONAL_FIELDS = {
    "workGpci",
    "practiceExpenseGpci",
    "malpracticeGpci",
    "conversionFactor",
}
NONNEGATIVE_OPTIONAL_FIELDS = {
    "workRvu",
    "practiceExpenseRvu",
    "malpracticeRvu",
    "paymentAmount",
}


def _is_iso_timestamp(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _require_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_batch(batch: dict[str, Any]) -> list[str]:
    """Mirror the TypeScript sidecar contract. Missing required fields fail."""
    errors: list[str] = []
    if not isinstance(batch, dict):
        return ["batch must be an object"]

    if batch.get("contractVersion") != CONTRACT_VERSION:
        errors.append("contractVersion must be 1.0.0")
    if not _is_iso_timestamp(batch.get("producedAt")):
        errors.append("producedAt is required")

    producer = batch.get("producer")
    if not isinstance(producer, dict):
        errors.append("producer is required")
        producer = {}
    if producer.get("runtime") not in {"python-duckdb", "typescript"}:
        errors.append("producer.runtime must be python-duckdb or typescript")
    if not _require_text(producer.get("name")):
        errors.append("producer.name is required")

    manifest = batch.get("sourceManifest")
    if not isinstance(manifest, dict):
        errors.append("sourceManifest is required")
        manifest = {}
    if manifest.get("schemaVersion") != MANIFEST_VERSION:
        errors.append("sourceManifest.schemaVersion must be 1.0.0")
    if not _is_iso_timestamp(manifest.get("generatedAt")):
        errors.append("sourceManifest.generatedAt is required")
    if not _require_text(manifest.get("generatedBy")):
        errors.append("sourceManifest.generatedBy is required")
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list):
        errors.append("sourceManifest.artifacts must be an array")
        artifacts = []

    artifact_ids: set[str] = set()
    seen_ids: set[str] = set()
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict):
            errors.append(f"sourceManifest.artifacts.{index} must be an object")
            continue
        artifact_id = artifact.get("id")
        if not _require_text(artifact_id):
            errors.append(f"sourceManifest.artifacts.{index}.id is required")
        else:
            if artifact_id in seen_ids:
                errors.append(f"duplicate source artifact id: {artifact_id}")
            seen_ids.add(artifact_id)
            artifact_ids.add(artifact_id)
        for field in ("title", "publisher", "sourceUrl", "retrievedAt"):
            if not _require_text(artifact.get(field)):
                errors.append(
                    f"sourceManifest.artifacts.{index}.{field} is required",
                )
        if artifact.get("artifactType") not in ARTIFACT_TYPES:
            errors.append(
                f"sourceManifest.artifacts.{index}.artifactType is invalid",
            )
        if artifact.get("format") not in ARTIFACT_FORMATS:
            errors.append(f"sourceManifest.artifacts.{index}.format is invalid")
        if artifact.get("storagePolicy") not in STORAGE_POLICIES:
            errors.append(
                f"sourceManifest.artifacts.{index}.storagePolicy is invalid",
            )
        if artifact.get("redistribution") not in REDISTRIBUTIONS:
            errors.append(
                f"sourceManifest.artifacts.{index}.redistribution is invalid",
            )
        if (
            artifact.get("storagePolicy") == "link_only"
            and artifact.get("localPath")
        ):
            errors.append(
                f"sourceManifest.artifacts.{index}.localPath is not allowed for link_only",
            )
        if (
            artifact.get("redistribution") == "restricted"
            and artifact.get("storagePolicy") == "full_text_allowed"
        ):
            errors.append(
                f"sourceManifest.artifacts.{index} restricted artifacts cannot be full_text_allowed",
            )

    output = batch.get("output")
    if not isinstance(output, dict):
        errors.append("output is required")
        output = {}
    if output.get("format") not in {"json", "parquet"}:
        errors.append("output.format must be json or parquet")
    if output.get("format") == "parquet" and not output.get("parquetPath"):
        errors.append("parquet output requires parquetPath")

    observations = batch.get("observations")
    if observations is None:
        observations = []
    if not isinstance(observations, list):
        errors.append("observations must be an array")
        return errors

    for index, row in enumerate(observations):
        if not isinstance(row, dict):
            errors.append(f"observations.{index} must be an object")
            continue
        if row.get("sourceArtifactId") not in artifact_ids:
            errors.append(
                f"observations.{index}.sourceArtifactId is not in the manifest",
            )
        for field in ("code", "payer", "placeOfService", "observedAt"):
            if not _require_text(row.get(field)):
                errors.append(f"observations.{index}.{field} is required")
        if row.get("codeSystem") not in CODE_SYSTEMS:
            errors.append(f"observations.{index}.codeSystem must be CPT or HCPCS")
        data_year = row.get("dataYear")
        if not isinstance(data_year, int) or data_year < 2000 or data_year > 2100:
            errors.append(
                f"observations.{index}.dataYear is required and must be 2000-2100",
            )
        if row.get("missingAsZero"):
            errors.append(
                f"observations.{index} must not coerce missing fields to zero",
            )
        for field in NONNEGATIVE_OPTIONAL_FIELDS | POSITIVE_OPTIONAL_FIELDS:
            if field not in row or row[field] is None:
                continue
            value = row[field]
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                errors.append(f"observations.{index}.{field} must be a number")
                continue
            if field in POSITIVE_OPTIONAL_FIELDS and value <= 0:
                errors.append(
                    f"observations.{index}.{field} must be positive when present",
                )
            elif field in NONNEGATIVE_OPTIONAL_FIELDS and value < 0:
                errors.append(
                    f"observations.{index}.{field} must be nonnegative when present",
                )
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
