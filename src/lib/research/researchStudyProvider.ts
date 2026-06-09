import {
  computeStudySampleStats,
  DOMESTIC_RESEARCH_STUDIES,
  filterDomesticStudies,
  type DomesticInstitution,
  type DomesticResearchStudy,
  type StudySampleStats,
} from "@/lib/research/domesticStudyCatalog";
import { getDataMode } from "@/lib/data/datasetProvider";
import type { ResearchStudyRow } from "@/lib/research/studyLinkage";

export interface ResearchStudyPageRequest {
  institution?: DomesticInstitution;
  condition?: string;
  limit: number;
  offset: number;
}

export interface ResearchStudyPageResult {
  studies: DomesticResearchStudy[];
  meta: { total: number; limit: number; offset: number };
  stats: StudySampleStats;
  dataMode: "static" | "db";
}

const CATALOG_BY_ID = new Map(
  DOMESTIC_RESEARCH_STUDIES.map((study) => [study.studyId, study]),
);

/**
 * Merge Postgres row fields onto the static catalog entry for display metadata.
 */
export function hydrateResearchStudyFromDb(
  row: ResearchStudyRow,
): DomesticResearchStudy | null {
  const catalog = CATALOG_BY_ID.get(row.studyId);
  if (!catalog) return null;

  return {
    ...catalog,
    institution: row.institution as DomesticInstitution,
    sampleSize: row.sampleSize,
    source: row.source,
    markerGenes: row.markerGenes,
  };
}

/**
 * Paginated domestic study catalog — static JSON catalog or Postgres per
 * `LACUNA_DATA_MODE`.
 */
export async function getResearchStudyPage(
  request: ResearchStudyPageRequest,
): Promise<ResearchStudyPageResult> {
  if (getDataMode() === "db") {
    const { loadResearchStudiesPage, computeResearchStudyStatsFromDb } =
      await import("./loadResearchStudiesFromDb");

    const [page, stats] = await Promise.all([
      loadResearchStudiesPage(request),
      computeResearchStudyStatsFromDb(),
    ]);

    const studies = page.studies
      .map(hydrateResearchStudyFromDb)
      .filter((study): study is DomesticResearchStudy => study !== null);

    return {
      studies,
      meta: {
        total: page.total,
        limit: request.limit,
        offset: request.offset,
      },
      stats,
      dataMode: "db",
    };
  }

  const page = filterDomesticStudies(request);
  return {
    studies: page.studies,
    meta: page.meta,
    stats: computeStudySampleStats(),
    dataMode: "static",
  };
}
