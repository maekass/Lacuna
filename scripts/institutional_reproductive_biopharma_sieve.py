#!/usr/bin/env python3
"""Canonical reproductive-biopharma classification and PostgreSQL backfill.

This module defines the research classification contract. It is intentionally
narrower than "women's health" and broader than any single care setting:
reproductive relevance and a bona fide biopharma/therapeutic modality are
required for inclusion.

The classifier is a curation aid, not an approval engine. Keyword evidence
creates an auditable classification signal; it does not establish clinical
efficacy, regulatory status, reimbursement, or investment merit.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Iterable

import psycopg2
from psycopg2.extras import RealDictCursor


DEFINITION_VERSION = "2026-10-reproductive-biopharma-v1"

INCLUDED = "included"
REVIEW = "review"
EXCLUDED = "excluded"

THERAPEUTIC_PATTERNS = (
    r"\bbiopharma\b",
    r"\bbiotech\b",
    r"\bpharmaceutical",
    r"\btherapeutic",
    r"\bdrug\b",
    r"\bsmall[- ]molecule\b",
    r"\bbiologic\b",
    r"\bmonoclonal antibody\b",
    r"\bantibody\b",
    r"\bgene therapy\b",
    r"\bcell therapy\b",
    r"\bstem cell\b",
    r"\bmolecule\b",
    r"\bclinical pipeline\b",
    r"\bpipeline\b",
)

REPRODUCTIVE_PATTERNS = (
    r"\bfertility\b",
    r"\breproductive\b",
    r"\bendometriosis\b",
    r"\badenomyosis\b",
    r"\bovarian\b",
    r"\bowarian\b",
    r"\buter(?:us|ine)\b",
    r"\bendometr(?:ium|ial)\b",
    r"\bcervical\b",
    r"\bvaginal\b",
    r"\bvulvar\b",
    r"\bpolycystic ovary\b",
    r"\bpcos\b",
    r"\bpreeclampsia\b",
    r"\bpreterm birth\b",
    r"\bpreterm labor\b",
    r"\bgestational\b",
    r"\bpostpartum\b",
    r"\bmaternal\b",
    r"\bcontraceptive\b",
)

CONSUMER_SERVICE_PATTERNS = (
    r"\bdirect[- ]to[- ]consumer\b",
    r"\bsubscription\b",
    r"\bcycle[- ]tracking\b",
    r"\bwellness\b",
    r"\blifestyle\b",
    r"\bretail clinic\b",
    r"\bboutique clinic\b",
    r"\bclinic expansion\b",
    r"\bconsumer app\b",
    r"\bmobile app\b",
)

SERVICE_ONLY_TYPES = {
    "retail clinics",
    "consumer app",
    "wellness",
    "fertility clinic",
    "clinic",
    "care delivery",
}


@dataclass(frozen=True)
class Classification:
    status: str
    reason: str
    confidence: str
    evidence: dict[str, Any]


def _matches(patterns: Iterable[str], text: str) -> list[str]:
    return [
        pattern
        for pattern in patterns
        if re.search(pattern, text, flags=re.IGNORECASE)
    ]


def classify_reproductive_biopharma(deal: dict[str, Any]) -> Classification:
    """Classify one deal without mutating the source record.

    Inclusion requires independent evidence of:
      1. a reproductive-health indication/biological target; and
      2. a therapeutic/biopharma modality.

    Care setting, biomarker availability, nursing impact, and billing pathway
    are evidence attributes, not definitions of reproductive biopharma.
    """
    target_name = str(deal.get("target_name") or "")
    deal_type = str(deal.get("type") or "").strip().lower()
    description = str(deal.get("item_201_excerpt") or deal.get("description") or "")
    text = f"{target_name} {deal_type} {description}".lower()

    therapeutic_matches = _matches(THERAPEUTIC_PATTERNS, text)
    reproductive_matches = _matches(REPRODUCTIVE_PATTERNS, text)
    consumer_matches = _matches(CONSUMER_SERVICE_PATTERNS, text)
    service_only_type = deal_type in SERVICE_ONLY_TYPES

    inpatient = bool(deal.get("is_inpatient_hospital_node", False))
    biomarkers = bool(deal.get("has_surrogate_biomarkers", False))

    evidence = {
        "definition_version": DEFINITION_VERSION,
        "therapeutic_modality_detected": bool(therapeutic_matches),
        "reproductive_relevance_detected": bool(reproductive_matches),
        "consumer_service_signal": bool(consumer_matches or service_only_type),
        "inpatient_hospital_node": inpatient,
        "surrogate_biomarker_evidence": biomarkers,
        "therapeutic_matches": therapeutic_matches,
        "reproductive_matches": reproductive_matches,
        "consumer_matches": consumer_matches,
        "service_only_type": service_only_type,
    }

    if therapeutic_matches and reproductive_matches and not (
        (consumer_matches or service_only_type)
        and not re.search(r"\b(pipeline|therapeutic|drug|biotech|biopharma|"
                          r"pharmaceutical|biologic|antibody|molecule)\b", text)
    ):
        return Classification(INCLUDED, "reproductive_therapeutic_asset", "high", evidence)

    if (therapeutic_matches and not reproductive_matches) or (
        reproductive_matches and not therapeutic_matches
    ):
        return Classification(REVIEW, "single_dimension_signal", "medium", evidence)

    if consumer_matches or service_only_type:
        return Classification(EXCLUDED, "consumer_or_care_service", "high", evidence)

    return Classification(REVIEW, "insufficient_classification_evidence", "low", evidence)


def execute_reproductive_biopharma_sieve() -> tuple[int, int, int]:
    """Apply the canonical classifier to lacuna_deals and persist audit fields."""
    connection_profile = {
        "dbname": os.getenv("LACUNA_DB_NAME", "lacuna_db"),
        "user": os.getenv("LACUNA_DB_USER", "postgres"),
        "password": os.environ["LACUNA_DB_PASSWORD"],
        "host": os.getenv("LACUNA_DB_HOST", "localhost"),
        "port": os.getenv("LACUNA_DB_PORT", "5432"),
    }

    conn = psycopg2.connect(**connection_profile)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    target_name,
                    type,
                    item_201_excerpt,
                    description,
                    is_inpatient_hospital_node,
                    has_surrogate_biomarkers
                FROM lacuna_deals;
                """
            )
            rows = cursor.fetchall()

            counts = {INCLUDED: 0, REVIEW: 0, EXCLUDED: 0}
            for row in rows:
                classification = classify_reproductive_biopharma(dict(row))
                counts[classification.status] += 1

                cursor.execute(
                    """
                    UPDATE lacuna_deals
                    SET reproductive_biopharma_status = %s,
                        reproductive_biopharma_reason = %s,
                        reproductive_biopharma_confidence = %s,
                        reproductive_biopharma_evidence = %s::jsonb,
                        reproductive_biopharma_definition_version = %s,
                        updated_at = NOW()
                    WHERE id = %s;
                    """,
                    (
                        classification.status,
                        classification.reason,
                        classification.confidence,
                        __import__("json").dumps(classification.evidence),
                        DEFINITION_VERSION,
                        row["id"],
                    ),
                )

        conn.commit()
        return counts[INCLUDED], counts[REVIEW], counts[EXCLUDED]
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    included, review, excluded = execute_reproductive_biopharma_sieve()
    print("--- Reproductive Biopharma Classification Completed ---")
    print(f"Included: {included}")
    print(f"Review: {review}")
    print(f"Excluded: {excluded}")
