/**
 * Weighting and composite indices for patient empowerment gaps.
 * @see docs/PATIENT_EMPOWERMENT.md
 */

import type {
  EmpowermentCarePhase,
  EmpowermentGapSeverity,
  EmpowermentPrerequisiteId,
} from "@/lib/research/patientEmpowermentTaxonomy";

/** Phase weights — treatment + survivorship overweighted for M&A diligence. */
export const EMPOWERMENT_PHASE_WEIGHTS: Record<EmpowermentCarePhase, number> = {
  records: 1,
  diagnosis: 1,
  treatment: 1.25,
  survivorship: 1.35,
  overall: 1,
};

/** Prerequisite weights for composite burden index. */
export const EMPOWERMENT_PREREQUISITE_WEIGHTS: Record<
  EmpowermentPrerequisiteId,
  number
> = {
  "records-access": 1.1,
  "care-team": 1,
  "evidence-standards": 1.25,
  "life-goals": 1.15,
};

/** Severity multipliers for weighted burden index. */
export const EMPOWERMENT_SEVERITY_WEIGHTS: Record<
  EmpowermentGapSeverity,
  number
> = {
  critical: 2,
  high: 1.5,
  moderate: 1,
};

/** Sectors expected to have curated empowerment review. */
export const EMPOWERMENT_CURATED_REVIEW_SECTORS = [
  "Breast Health",
  "Precision Medicine",
] as const;

/** High alignment with breast-cancer-shaped baseline. */
export const EMPOWERMENT_HIGH_ALIGNMENT_SECTORS = new Set([
  "Breast Health",
  "Precision Medicine",
  "Diagnostics",
  "Digital Health",
]);

export type EmpowermentConditionScope = "breast_cancer_baseline";

export const EMPOWERMENT_CONDITION_SCOPE_LABEL: Record<
  EmpowermentConditionScope,
  string
> = {
  breast_cancer_baseline: "Breast cancer care continuum (HLTH 2022)",
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function meanRounded(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length,
  );
}

/** gap × (1 − curated coverage %) — high when patients suffer and analyst links are thin. */
export function computeGapPriorityScore(
  gapIndexPct: number,
  curatedCoveragePct: number,
): number {
  const coverageFactor = 1 - curatedCoveragePct / 100;
  return Math.round(gapIndexPct * coverageFactor);
}

interface WeightedMetricInput {
  gapIndexPct: number;
  phase: EmpowermentCarePhase;
  prerequisiteId: EmpowermentPrerequisiteId;
  gapSeverity: EmpowermentGapSeverity;
}

/** Phase × prerequisite × severity weighted mean gap index. */
export function computeWeightedBurdenIndex(
  metrics: readonly WeightedMetricInput[],
): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const m of metrics) {
    const w = EMPOWERMENT_PHASE_WEIGHTS[m.phase] *
      EMPOWERMENT_PREREQUISITE_WEIGHTS[m.prerequisiteId] *
      EMPOWERMENT_SEVERITY_WEIGHTS[m.gapSeverity];
    weightedSum += m.gapIndexPct * w;
    weightTotal += w;
  }
  return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
}

export interface GapSeverityDistribution {
  moderate: number;
  high: number;
  critical: number;
}

export function computeGapSeverityDistribution(
  severities: readonly EmpowermentGapSeverity[],
): GapSeverityDistribution {
  return severities.reduce(
    (acc, s) => {
      acc[s] += 1;
      return acc;
    },
    { moderate: 0, high: 0, critical: 0 },
  );
}
