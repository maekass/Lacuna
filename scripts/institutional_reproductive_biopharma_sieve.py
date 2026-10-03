#!/usr/bin/env python3
"""Evidence-first institutional reproductive-biopharma triage for lacuna_deals.

This job is a curation pass, not an approval engine. Keyword matches create
review signals; they do not establish inpatient status, biomarker validation,
regulatory eligibility, or nursing benefit. Those fields are only promoted
when corroborating evidence is already present in the row.
"""

import os

import psycopg2
from psycopg2.extras import RealDictCursor


DB_CONNECTION_PROFILE = {
    "dbname": os.getenv("LACUNA_DB_NAME", "lacuna_db"),
    "user": os.getenv("LACUNA_DB_USER", "postgres"),
    "password": os.environ["LACUNA_DB_PASSWORD"],
    "host": os.getenv("LACUNA_DB_HOST", "localhost"),
    "port": os.getenv("LACUNA_DB_PORT", "5432"),
}

CONSUMER_RISK_VECTORS = (
    "app",
    "subscription",
    "boutique",
    "lifestyle",
    "wellness",
    "tracker",
    "direct-to-consumer",
)

BIOPHARMA_SCIENCE_VECTORS = (
    "stem cell",
    "therapeutic",
    "small-molecule",
    "biopharma",
    "infant",
    "icu",
    "nicu",
    "biotech",
    "pipeline",
    "molecule",
    "ivf-lab-automation",
)


def execute_institutional_reproductive_biopharma_sieve() -> tuple[int, int]:
    conn = psycopg2.connect(**DB_CONNECTION_PROFILE)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    target_name,
                    item_201_excerpt,
                    classification_confidence,
                    classification_keywords,
                    is_inpatient_hospital_node,
                    has_surrogate_biomarkers,
                    tracking_regulatory_pathway,
                    institutional_classification,
                    nursing_workload_impact_score
                FROM lacuna_deals;
                """
            )
            target_deals = cursor.fetchall()

            curated_count = 0
            review_count = 0

            for deal in target_deals:
                content_string = (
                    f"{deal['target_name'] or ''} "
                    f"{deal['item_201_excerpt'] or ''}"
                ).lower()

                is_biopharma_signal = any(
                    vector in content_string for vector in BIOPHARMA_SCIENCE_VECTORS
                )
                has_consumer_noise = any(
                    vector in content_string for vector in CONSUMER_RISK_VECTORS
                )

                existing_keywords = list(deal["classification_keywords"] or [])
                signals = [
                    f"science:{vector}"
                    for vector in BIOPHARMA_SCIENCE_VECTORS
                    if vector in content_string
                ]
                signals.extend(
                    f"consumer:{vector}"
                    for vector in CONSUMER_RISK_VECTORS
                    if vector in content_string
                )
                merged_keywords = list(dict.fromkeys(existing_keywords + signals))

                if is_biopharma_signal and not has_consumer_noise:
                    # Preserve existing evidence-backed fields. Keyword
                    # classification alone cannot prove these facts.
                    classification = (
                        "SBBT — institutional candidate"
                    )
                    curated_count += 1
                else:
                    classification = "Review — consumer/outpatient signal"
                    review_count += 1

                cursor.execute(
                    """
                    UPDATE lacuna_deals
                    SET institutional_classification = %s,
                        classification_keywords = %s,
                        updated_at = NOW()
                    WHERE id = %s;
                    """,
                    (classification, merged_keywords, deal["id"]),
                )

        conn.commit()
        return curated_count, review_count
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    curated, review = execute_institutional_reproductive_biopharma_sieve()
    print("--- Institutional Reproductive Biopharma Triage Completed ---")
    print(f"Institutional candidates requiring evidence review: {curated}")
    print(f"Consumer/outpatient candidates requiring review: {review}")
