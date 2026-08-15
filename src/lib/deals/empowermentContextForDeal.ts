/**
 * Deal-level empowerment context — curated HLTH 2022 mappings only.
 * Keyword/sector affinity stays on the research workspace, not the deal dossier.
 */

import type { DealDetail } from "@/lib/deals/dealTypes";
import {
  type GapDimensionView,
  listEmpowermentComparableCompanyIds,
  type PatientEmpowermentSnapshot,
} from "@/lib/research/patientEmpowermentPipeline";
import {
  EMPOWERMENT_CONDITION_SCOPE_LABEL,
  EMPOWERMENT_HIGH_ALIGNMENT_SECTORS,
} from "@/lib/research/patientEmpowermentScoring";
import {
  type EmpowermentSourceTier,
  isEvidenceBackedLink,
} from "@/lib/research/patientEmpowermentTaxonomy";

export type DealEmpowermentScopeAlignment = "high" | "limited" | "none";

export interface DealEmpowermentDimensionMatch {
  dimension: GapDimensionView;
  targetMatchTier: "curated";
  targetMatchNote?: string;
  sourceUrl?: string;
  sourceTier?: EmpowermentSourceTier;
  rationale?: string;
  citedValue: string;
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
  heuristicMatchCount: number;
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

function buildBaselineNote(
  alignment: DealEmpowermentScopeAlignment,
  heuristicMatchCount: number,
): string {
  const scope = EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline;
  if (alignment === "high") {
    return `HLTH/Outcomes4Me 2022 surveyed breast cancer patients (n=1,828). ${scope}. Rows below are analyst-curated mappings to cited survey items — not live patient outcomes for this target.`;
  }
  if (alignment === "limited") {
    return `HLTH/Outcomes4Me 2022 baseline is ${scope}. This target has curated mappings but sits outside the survey's breast-cancer sector set.`;
  }
  if (heuristicMatchCount > 0) {
    return `HLTH/Outcomes4Me 2022 baseline is ${scope}. This target has sector/keyword affinity only — that heuristic is not shown on deal dossiers.`;
  }
  return `HLTH/Outcomes4Me 2022 baseline is ${scope}. No curated mapping for this target.`;
}

function companyNameById(
  snapshot: PatientEmpowermentSnapshot,
): Map<string, string> {
  const names = new Map<string, string>();
  for (const dim of snapshot.dimensions) {
    for (const company of dim.linkedCompanies) {
      names.set(company.id, company.name);
    }
  }
  return names;
}

/**
 * Curated HLTH 2022 mappings for a verified deal target. Heuristic
 * sector/keyword hits are counted but not returned as dossier rows.
 */
export function empowermentContextForDeal(
  deal: DealDetail,
  snapshot: PatientEmpowermentSnapshot,
): DealEmpowermentContext {
  const targetId = deal.target.id;
  const curatedMatches: DealEmpowermentDimensionMatch[] = [];
  let heuristicMatchCount = 0;

  for (const dim of snapshot.dimensions) {
    const targetLink = dim.linkedCompanies.find((c) => c.id === targetId);
    if (!targetLink) continue;
    if (targetLink.matchTier !== "curated") {
      heuristicMatchCount += 1;
      continue;
    }
    curatedMatches.push({
      dimension: dim,
      targetMatchTier: "curated",
      targetMatchNote: targetLink.matchNote,
      sourceUrl: targetLink.sourceUrl,
      sourceTier: targetLink.sourceTier,
      rationale: targetLink.rationale,
      citedValue: dim.metric.citedValue,
    });
  }

  const evidenceBackedDimensionCount =
    curatedMatches.filter((m) => isEvidenceBackedLink(m)).length;
  const hasCuratedMatch = curatedMatches.length > 0;
  const scopeAlignment = scopeAlignmentForDeal(deal, hasCuratedMatch);
  const names = companyNameById(snapshot);
  const comparableNames = listEmpowermentComparableCompanyIds(
    snapshot,
    targetId,
  )
    .map((id) => names.get(id))
    .filter((name): name is string => Boolean(name));

  return {
    dealId: deal.acquisition.id,
    targetName: deal.target.name,
    sector: deal.target.sector,
    conditionScopeLabel:
      EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline,
    baselineNote: buildBaselineNote(scopeAlignment, heuristicMatchCount),
    scopeAlignment,
    curatedDimensionCount: curatedMatches.length,
    evidenceBackedDimensionCount,
    heuristicMatchCount,
    matchedDimensions: curatedMatches,
    comparableNames,
    hasDirectMatch: hasCuratedMatch,
  };
}
