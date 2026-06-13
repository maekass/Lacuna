import { query } from "@/lib/data/dbClient";

export interface ResearchStudyRow {
  studyId: string;
  institution: string;
  sampleSize: number;
  source: string;
  markerGenes: string[];
}

export interface StudyLinkageBundle {
  studyId: string;
  nctIds: string[];
  callsetIds: string[];
}

interface ResearchStudyDbRow {
  study_id: string;
  institution: string;
  sample_size: number;
  source: string;
  marker_genes: string[];
}

interface TrialLinkDbRow {
  study_id: string;
  nct_id: string;
}

interface CallsetLinkDbRow {
  study_id: string;
  callset_id: string;
}

function mapStudyRow(row: ResearchStudyDbRow): ResearchStudyRow {
  return {
    studyId: row.study_id,
    institution: row.institution,
    sampleSize: row.sample_size,
    source: row.source,
    markerGenes: row.marker_genes ?? [],
  };
}

/**
 * Load all seeded research study rows from Postgres.
 * Returns an empty array when tables are empty (caller may fall back to static catalog).
 */
export async function listResearchStudiesFromDb(): Promise<ResearchStudyRow[]> {
  const rows = await query<ResearchStudyDbRow>(
    `SELECT study_id, institution, sample_size, source, marker_genes
     FROM research_studies
     ORDER BY study_id`,
  );
  return rows.map(mapStudyRow);
}

/**
 * Return ClinicalTrials.gov NCT IDs linked to a domestic study.
 */
export async function listTrialLinksForStudy(
  studyId: string,
): Promise<string[]> {
  const rows = await query<{ nct_id: string }>(
    `SELECT nct_id FROM study_trial_links WHERE study_id = $1 ORDER BY nct_id`,
    [studyId],
  );
  return rows.map((row) => row.nct_id);
}

/**
 * Return variant callset IDs linked to a domestic study (ClickHouse catalog keys).
 */
export async function listCallsetLinksForStudy(
  studyId: string,
): Promise<string[]> {
  const rows = await query<{ callset_id: string }>(
    `SELECT callset_id FROM study_callset_links WHERE study_id = $1 ORDER BY callset_id`,
    [studyId],
  );
  return rows.map((row) => row.callset_id);
}

/**
 * Batch-load trial and callset links for a set of study IDs.
 */
export async function getStudyLinkageMap(
  studyIds: readonly string[],
): Promise<Map<string, StudyLinkageBundle>> {
  const map = new Map<string, StudyLinkageBundle>();
  if (studyIds.length === 0) return map;

  for (const studyId of studyIds) {
    map.set(studyId, { studyId, nctIds: [], callsetIds: [] });
  }

  const trialRows = await query<TrialLinkDbRow>(
    `SELECT study_id, nct_id
     FROM study_trial_links
     WHERE study_id = ANY($1::text[])
     ORDER BY study_id, nct_id`,
    [studyIds],
  );
  for (const row of trialRows) {
    map.get(row.study_id)?.nctIds.push(row.nct_id);
  }

  const callsetRows = await query<CallsetLinkDbRow>(
    `SELECT study_id, callset_id
     FROM study_callset_links
     WHERE study_id = ANY($1::text[])
     ORDER BY study_id, callset_id`,
    [studyIds],
  );
  for (const row of callsetRows) {
    map.get(row.study_id)?.callsetIds.push(row.callset_id);
  }

  return map;
}

/**
 * True when Postgres research linkage tables have at least one study row.
 */
export async function isResearchStudyDbSeeded(): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM research_studies LIMIT 1) AS exists`,
  );
  return rows[0]?.exists === true;
}
