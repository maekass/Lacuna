#!/usr/bin/env python3
"""
Export Lacuna ML training records from a loaded AACT Postgres database.

Requires: pip install psycopg2-binary (or use docker exec psql + CSV fallback)

Usage:
  AACT_DATABASE_URL=postgresql://lacuna:lacuna@localhost:5432/aact \\
    PYTHONPATH=ml/clinical_trials python3 ml/clinical_trials/scripts/export_from_aact.py

  npm run ml:ct:aact:export
  npm run ml:ct:aact:export -- --limit 50000
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from lacuna_ct.constants import NEGATIVE_CONDITION_QUERIES, WH_CONDITION_QUERIES, WH_KEYWORDS
from lacuna_ct.fetch_training_data import TrialRecord, save_records
from lacuna_ct.labels import label_completed, label_terminated

AACT_EXPORT_SQL = """
SELECT DISTINCT ON (s.nct_id)
    s.nct_id,
    COALESCE(s.brief_title, '') AS title,
    COALESCE(d.phase, 'Not Applicable') AS phase,
    COALESCE(os.name, 'Unknown') AS status,
    COALESCE(cond.names, '') AS condition,
    COALESCE(sp.name, 'Unknown') AS sponsor,
    COALESCE(cv.enrollment, 0) AS enrollment,
    COALESCE(iv.names, '') AS interventions,
    (s.has_results IS TRUE) AS has_results,
    COALESCE(d.study_type, 'INTERVENTIONAL') AS study_type,
    EXTRACT(YEAR FROM s.start_date)::int AS start_year
FROM ctgov.studies s
LEFT JOIN ctgov.designs d ON d.nct_id = s.nct_id
LEFT JOIN ctgov.overall_statuses os ON os.nct_id = s.nct_id
LEFT JOIN ctgov.sponsors sp ON sp.nct_id = s.nct_id AND sp.lead_or_collaborator = 'lead'
LEFT JOIN ctgov.calculated_values cv ON cv.nct_id = s.nct_id
LEFT JOIN LATERAL (
    SELECT string_agg(c.name, ', ' ORDER BY c.name) AS names
    FROM ctgov.conditions c
    WHERE c.nct_id = s.nct_id
) cond ON TRUE
LEFT JOIN LATERAL (
    SELECT string_agg(i.name, ', ' ORDER BY i.name) AS names
    FROM ctgov.interventions i
    WHERE i.nct_id = s.nct_id
) iv ON TRUE
WHERE {where_clause}
ORDER BY s.nct_id
LIMIT %s
"""


def _wh_keyword_where() -> str:
    parts = [f"LOWER(cond.names) LIKE '%{kw.replace(chr(39), '')}%'" for kw in WH_KEYWORDS if len(kw) > 3]
    return "(" + " OR ".join(parts[:40]) + ")"


def _condition_query_where(term: str) -> str:
    safe = term.replace("'", "''").lower()
    return f"LOWER(cond.names) LIKE '%{safe}%'"


def export_from_aact(
    dsn: str,
    *,
    limit_per_query: int = 25_000,
) -> list[TrialRecord]:
    try:
        import psycopg2
    except ImportError as e:
        raise SystemExit(
            "psycopg2-binary required: pip install psycopg2-binary"
        ) from e

    records: list[TrialRecord] = []
    seen: set[str] = set()

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            # WH-positive: condition query list
            for query in WH_CONDITION_QUERIES:
                where = _condition_query_where(query)
                sql = AACT_EXPORT_SQL.format(where_clause=where)
                cur.execute(sql, (limit_per_query,))
                for row in cur.fetchall():
                    nct = row[0]
                    if not nct or nct in seen:
                        continue
                    seen.add(nct)
                    status = row[3] or "Unknown"
                    records.append(
                        TrialRecord(
                            nct_id=nct,
                            title=row[1] or "",
                            phase=row[2] or "Not Applicable",
                            status=status,
                            condition=row[4] or "",
                            sponsor=row[5] or "Unknown",
                            enrollment=int(row[6] or 0),
                            interventions=row[7] or "",
                            label_wh=1,
                            label_terminated=label_terminated(status),
                            source_query=query,
                            has_results=bool(row[8]),
                            study_type=row[9] or "INTERVENTIONAL",
                            label_completed=label_completed(status),
                            start_year=int(row[10]) if row[10] else None,
                        )
                    )

            for query in NEGATIVE_CONDITION_QUERIES:
                where = _condition_query_where(query)
                sql = AACT_EXPORT_SQL.format(where_clause=where)
                cur.execute(sql, (limit_per_query,))
                for row in cur.fetchall():
                    nct = row[0]
                    if not nct or nct in seen:
                        continue
                    seen.add(nct)
                    status = row[3] or "Unknown"
                    records.append(
                        TrialRecord(
                            nct_id=nct,
                            title=row[1] or "",
                            phase=row[2] or "Not Applicable",
                            status=status,
                            condition=row[4] or "",
                            sponsor=row[5] or "Unknown",
                            enrollment=int(row[6] or 0),
                            interventions=row[7] or "",
                            label_wh=0,
                            label_terminated=label_terminated(status),
                            source_query=query,
                            has_results=bool(row[8]),
                            study_type=row[9] or "INTERVENTIONAL",
                            label_completed=label_completed(status),
                            start_year=int(row[10]) if row[10] else None,
                        )
                    )

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Export AACT → Lacuna training cache")
    parser.add_argument("--limit", type=int, default=25_000, help="Max rows per condition query")
    parser.add_argument(
        "--dsn",
        default=os.environ.get(
            "AACT_DATABASE_URL",
            "postgresql://lacuna:lacuna@localhost:5432/aact",
        ),
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[3]
    cache = root / "ml/clinical_trials/data/cached_training.json"

    print(f"Connecting to {args.dsn.split('@')[-1]}…")
    records = export_from_aact(args.dsn, limit_per_query=args.limit)
    save_records(records, cache)
    print(f"Exported {len(records)} records → {cache}")
    print("Retrain: npm run ml:ct:train")


if __name__ == "__main__":
    main()
