/**
 * Deal-level empowerment context — curated HLTH 2022 mappings only.
 * Does not run the research pipeline's sector/keyword affinity join.
 */

import { CURATED_EMPOWERMENT_LINKS } from "@/data/patientEmpowermentCrosswalk";
import { PATIENT_EMPOWERMENT_METRICS } from "@/data/patientEmpowermentReport";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { DealDetail } from "@/lib/deals/dealTypes";
import {
  EMPOWERMENT_CONDITION_SCOPE_LABEL,
  EMPOWERMENT_HIGH_ALIGNMENT_SECTORS,
} from "@/lib/research/patientEmpowermentScoring";
import type { EmpowermentSourceTier } from "@/lib/research/patientEmpowermentTaxonomy";

export type DealEmpowermentScopeAlignment = "high" | "limited" | "none";

export interface DealEmpowermentDimensionMatch {
  metricId: string;
  label: string;
  citedValue: string;
  targetMatchTier: "curated";
  targetMatchNote?: string;
  sourceUrl?: string;
  sourceTier?: EmpowermentSourceTier;
  rationale?: string;
}

export interface DealEmpowermentContext {
  dealId: string;
  targetName: string;
  sector: string;
  conditionScopeLabel: string;
  baselineNote: string;
  scopeAlignment: DealEmpowermentScopeAlignment;
  curatedDimensionCount: number;
  evidenceBackedDimensionCount: number;
  matchedDimensions: DealEmpowermentDimensionMatch[];
  comparableNames: string[];
  hasDirectMatch: boolean;
}

function scopeAlignmentForDeal(
  deal: DealDetail,
  hasCuratedMatch: boolean,
): DealEmpowermentScopeAlignment {
  if (!hasCuratedMatch) return "none";
  if (EMPOWERMENT_HIGH_ALIGNMENT_SECTORS.has(deal.target.sector)) {
    return "high";
  }
  return "limited";
}

function buildBaselineNote(alignment: DealEmpowermentScopeAlignment): string {
  const scope = EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline;
  if (alignment === "high") {
    return `HLTH/Outcomes4Me 2022 surveyed breast cancer patients (n=1,828). ${scope}. Rows below are analyst-curated mappings to cited survey items — not live patient outcomes for this target.`;
  }
  if (alignment === "limited") {
    return `HLTH/Outcomes4Me 2022 baseline is ${scope}. This target has curated mappings but sits outside the survey's breast-cancer sector set.`;
  }
  return `HLTH/Outcomes4Me 2022 baseline is ${scope}. No curated mapping for this target in the verified crosswalk.`;
}

const METRIC_BY_ID = new Map(
  PATIENT_EMPOWERMENT_METRICS.map((metric) => [metric.id, metric]),
);

/**
 * Joins a verified deal target to analyst-curated HLTH 2022 rows.
 * Keyword/sector affinity is intentionally not consulted.
 */
export function empowermentContextForDeal(
  deal: DealDetail,
  dataset: VerifiedDataset,
): DealEmpowermentContext {
  const targetId = deal.target.id;
  const matchedDimensions: DealEmpowermentDimensionMatch[] = [];

  for (const link of CURATED_EMPOWERMENT_LINKS) {
    if (link.companyId !== targetId) continue;
    const metric = METRIC_BY_ID.get(link.metricId);
    if (!metric) continue;
    matchedDimensions.push({
      metricId: metric.id,
      label: metric.label,
      citedValue: metric.citedValue,
      targetMatchTier: "curated",
      targetMatchNote: link.note,
      sourceUrl: link.sourceUrl,
      sourceTier: link.sourceTier,
      rationale: link.rationale,
    });
  }

  const metricIds = new Set(matchedDimensions.map((row) => row.metricId));
  const comparableIds = new Set<string>();
  for (const link of CURATED_EMPOWERMENT_LINKS) {
    if (link.companyId === targetId) continue;
    if (!metricIds.has(link.metricId)) continue;
    comparableIds.add(link.companyId);
  }
  const namesById = new Map(
    dataset.companies.map((company) => [company.id, company.name]),
  );
  const comparableNames = [...comparableIds]
    .map((id) => namesById.get(id))
    .filter((name): name is string => Boolean(name));

  const hasCuratedMatch = matchedDimensions.length > 0;
  const scopeAlignment = scopeAlignmentForDeal(deal, hasCuratedMatch);

  return {
    dealId: deal.acquisition.id,
    targetName: deal.target.name,
    sector: deal.target.sector,
    conditionScopeLabel:
      EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline,
    baselineNote: buildBaselineNote(scopeAlignment),
    scopeAlignment,
    curatedDimensionCount: matchedDimensions.length,
    evidenceBackedDimensionCount:
      matchedDimensions.filter((row) => Boolean(row.sourceUrl)).length,
    matchedDimensions,
    comparableNames,
    hasDirectMatch: hasCuratedMatch,
  };
}
