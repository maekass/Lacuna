from dataclasses import dataclass

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


@dataclass
class ResearchStudy:
    study_id: str
    institution: str
    sample_size: int
    source: str
    marker_genes: list[str]


@dataclass
class ResearchStudyPage:
    studies: list[ResearchStudy]
    total: int
    limit: int
    offset: int


def database_configured() -> bool:
    return bool(get_settings().database_url)


def check_database_connection() -> bool:
    url = get_settings().database_url
    if not url:
        return False
    try:
        with psycopg.connect(url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False


def load_research_studies_page(
    *,
    institution: str | None = None,
    condition: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> ResearchStudyPage:
    url = get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is required for research study queries")

    clauses: list[str] = []
    params: list[object] = []

    if institution:
        params.append(institution)
        clauses.append(f"institution = ${len(params)}")

    if condition:
        params.append(f"%{condition}%")
        pattern = f"${len(params)}"
        clauses.append(
            f"(source ILIKE {pattern} OR study_id ILIKE {pattern} OR EXISTS ("
            f"SELECT 1 FROM jsonb_array_elements_text(marker_genes) AS gene "
            f"WHERE gene ILIKE {pattern}))"
        )

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with psycopg.connect(url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT COUNT(*)::bigint AS count FROM research_studies {where_sql}",
                params,
            )
            total = int(cur.fetchone()["count"])

            limit_param = len(params) + 1
            offset_param = len(params) + 2
            cur.execute(
                f"""
                SELECT study_id, institution, sample_size, source, marker_genes
                FROM research_studies
                {where_sql}
                ORDER BY study_id
                LIMIT ${limit_param} OFFSET ${offset_param}
                """,
                [*params, limit, offset],
            )
            rows = cur.fetchall()

    studies = [
        ResearchStudy(
            study_id=row["study_id"],
            institution=row["institution"],
            sample_size=row["sample_size"],
            source=row["source"],
            marker_genes=list(row["marker_genes"] or []),
        )
        for row in rows
    ]
    return ResearchStudyPage(
        studies=studies,
        total=total,
        limit=limit,
        offset=offset,
    )
