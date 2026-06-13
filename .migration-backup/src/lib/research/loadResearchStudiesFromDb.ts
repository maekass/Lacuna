import { query } from "@/lib/data/dbClient";
import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";
import type { ResearchStudyRow } from "@/lib/research/studyLinkage";
import type { StudySampleStats } from "@/lib/research/domesticStudyCatalog";

interface ResearchStudyDbRow {
  study_id: string;
  institution: string;
  sample_size: number;
  source: string;
  marker_genes: string[];
}

export interface ResearchStudyPageQuery {
  institution?: DomesticInstitution;
  condition?: string;
  limit: number;
  offset: number;
}

function mapRow(row: ResearchStudyDbRow): ResearchStudyRow {
  return {
    studyId: row.study_id,
    institution: row.institution,
    sampleSize: row.sample_size,
    source: row.source,
    markerGenes: row.marker_genes ?? [],
  };
}

function buildWhereClause(queryInput: ResearchStudyPageQuery): {
  sql: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (queryInput.institution) {
    params.push(queryInput.institution);
    clauses.push(`institution = $${params.length}`);
  }

  if (queryInput.condition) {
    params.push(`%${queryInput.condition}%`);
    const pattern = `$${params.length}`;
    clauses.push(`(
      source ILIKE ${pattern}
      OR study_id ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(marker_genes) AS gene
        WHERE gene ILIKE ${pattern}
      )
    )`);
  }

  const sql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return { sql, params };
}

/**
 * Paginated research studies from Postgres with SQL filters.
 */
export async function loadResearchStudiesPage(
  queryInput: ResearchStudyPageQuery,
): Promise<{ studies: ResearchStudyRow[]; total: number }> {
  const { sql: whereSql, params } = buildWhereClause(queryInput);

  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM research_studies ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.count ?? 0);

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const rows = await query<ResearchStudyDbRow>(
    `SELECT study_id, institution, sample_size, source, marker_genes
     FROM research_studies
     ${whereSql}
     ORDER BY study_id
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, queryInput.limit, queryInput.offset],
  );

  return { studies: rows.map(mapRow), total };
}

/**
 * Aggregate sample-size stats from seeded Postgres rows.
 */
export async function computeResearchStudyStatsFromDb(): Promise<
  StudySampleStats
> {
  const rows = await query<{
    institution: DomesticInstitution;
    studies: string;
    sample_size: string;
  }>(
    `SELECT institution,
            COUNT(*)::text AS studies,
            COALESCE(SUM(sample_size), 0)::text AS sample_size
     FROM research_studies
     GROUP BY institution`,
  );

  const byInstitution: StudySampleStats["byInstitution"] = {
    nih: { studies: 0, sampleSize: 0 },
    harvard: { studies: 0, sampleSize: 0 },
    mit: { studies: 0, sampleSize: 0 },
    harvard_mit_collab: { studies: 0, sampleSize: 0 },
  };

  let totalStudies = 0;
  let totalSampleSize = 0;

  for (const row of rows) {
    const studies = Number(row.studies);
    const sampleSize = Number(row.sample_size);
    if (row.institution in byInstitution) {
      byInstitution[row.institution].studies = studies;
      byInstitution[row.institution].sampleSize = sampleSize;
    }
    totalStudies += studies;
    totalSampleSize += sampleSize;
  }

  return { totalStudies, totalSampleSize, byInstitution };
}
