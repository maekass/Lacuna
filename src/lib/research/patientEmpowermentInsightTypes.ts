import type { EmpowermentPrerequisiteId } from "@/lib/research/patientEmpowermentTaxonomy";

/** Serializable teaser for client insight cards — no verified JSON payload. */
export interface PatientEmpowermentInsightData {
  readonly surveyRespondents: number;
  readonly maxGapMetricLabel: string;
  readonly maxGapIndexPct: number;
  readonly weightedBurdenIndexPct: number;
  readonly medianGapIndexPct: number;
  readonly criticalMetricCount: number;
  readonly curatedLinkCount: number;
  readonly evidenceBackedLinkCount: number;
  readonly topPriorityLabel?: string;
  readonly topPriorityScore?: number;
  readonly highestGapPrerequisiteId: EmpowermentPrerequisiteId;
}
