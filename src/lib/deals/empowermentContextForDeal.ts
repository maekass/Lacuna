/**
 * Deal-level empowerment context — maps verified deals to HLTH gap dimensions.
 */

import type { DealDetail } from "@/lib/deals/dealTypes";
import {
  listEmpowermentComparableCompanyIds,
  type GapDimensionView,
  type PatientEmpowermentSnapshot,
} from "@/lib/research/patientEmpowermentPipeline";
import {
  EMPOWERMENT_CONDITION_SCOPE_LABEL,
  EMPOWERMENT_HIGH_ALIGNMENT_SECTORS,
} from "@/lib/research/patientEmpowermentScoring";
import {
  isEvidenceBackedLink,
  type EmpowermentSourceTier,
} from "@/lib/research/patientEmpowermentTaxonomy";

export type DealEmpowermentScopeAlignment = "high" | "limited" | "none";

export interface DealEmpowermentDimensionMatch {
  dimension: GapDimensionView;
  targetMatchTier: GapDimensionView["linkedCompanies"][number]["matchTier"];
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
  /** 0–100: share of matched dimensions with curated target link */
  affinityScore: number;
  /** 0–100: share of curated matches with a public source URL */
  evidenceScore: number;
  curatedDimensionCount: number;
  evidenceBackedDimensionCount: number;
  matchedDimensions: DealEmpowermentDimensionMatch[];
  comparableCompanyIds: string[];
  hasDirectMatch: boolean;
}

function scopeAlignmentForDeal(
  deal: DealDetail,
  hasMatch: boolean,
): DealEmpowermentScopeAlignment {
  if (EMPOWERMENT_HIGH_ALIGNMENT_SECTORS.has(deal.target.sector)) {
    return hasMatch ? "high" : "limited";
  }
  return hasMatch ? "limited" : "none";
}

function buildBaselineNote(alignment: DealEmpowermentScopeAlignment): string {
  const scope = EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline;
  if (alignment === "high") {
    return `HLTH/Outcomes4Me 2022 surveyed breast cancer patients (n=1,828). Target sector aligns with ${scope}. Matches are affinity-based, not live outcomes.`;
  }
  if (alignment === "limited") {
    return `HLTH/Outcomes4Me 2022 baseline is ${scope}. Fertility and general wellness targets have limited direct overlap — heuristic keyword/sector affinity only.`;
  }
  return `HLTH/Outcomes4Me 2022 baseline is ${scope}. No portfolio crosswalk for this target in the current sample.`;
}

/**
 * Returns empowerment gap dimensions relevant to a verified deal's target company.
 */
export function empowermentContextForDeal(
  deal: DealDetail,
  snapshot: PatientEmpowermentSnapshot,
): DealEmpowermentContext {
  const targetId = deal.target.id;
  const matchedDimensions: DealEmpowermentDimensionMatch[] = [];

  for (const dim of snapshot.dimensions) {
    const targetLink = dim.linkedCompanies.find((c) => c.id === targetId);
    if (!targetLink) continue;
    matchedDimensions.push({
      dimension: dim,
      targetMatchTier: targetLink.matchTier,
      targetMatchNote: targetLink.matchNote,
      sourceUrl: targetLink.sourceUrl,
      sourceTier: targetLink.sourceTier,
      rationale: targetLink.rationale,
    });
  }

  const curatedMatches = matchedDimensions.filter(
    (m) => m.targetMatchTier === "curated",
  );
  const curatedDimensionCount = curatedMatches.length;
  const evidenceBackedDimensionCount = curatedMatches.filter((m) =>
    isEvidenceBackedLink(m)
  ).length;
  const affinityScore = matchedDimensions.length > 0
    ? Math.round((curatedDimensionCount / matchedDimensions.length) * 100)
    : 0;
  const evidenceScore = curatedDimensionCount > 0
    ? Math.round((evidenceBackedDimensionCount / curatedDimensionCount) * 100)
    : 0;
  const scopeAlignment = scopeAlignmentForDeal(
    deal,
    matchedDimensions.length > 0,
  );

  return {
    dealId: deal.acquisition.id,
    targetName: deal.target.name,
    sector: deal.target.sector,
    conditionScopeLabel: EMPOWERMENT_CONDITION_SCOPE_LABEL.breast_cancer_baseline,
    baselineNote: buildBaselineNote(scopeAlignment),
    scopeAlignment,
    affinityScore,
    evidenceScore,
    curatedDimensionCount,
    evidenceBackedDimensionCount,
    matchedDimensions,
    comparableCompanyIds: listEmpowermentComparableCompanyIds(
      snapshot,
      targetId,
    ),
    hasDirectMatch: matchedDimensions.length > 0,
  };
}
