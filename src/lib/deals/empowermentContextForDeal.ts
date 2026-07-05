/**
 * Deal-level empowerment context — maps verified deals to HLTH gap dimensions.
 */

import type { DealDetail } from "@/lib/deals/dealTypes";
import {
  buildPatientEmpowermentSnapshot,
  type GapDimensionView,
  type PatientEmpowermentSnapshot,
} from "@/lib/research/patientEmpowermentPipeline";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";

export interface DealEmpowermentContext {
  dealId: string;
  targetName: string;
  sector: string;
  /** Report scope disclaimer */
  baselineNote: string;
  matchedDimensions: GapDimensionView[];
  hasDirectMatch: boolean;
}

const BASELINE_NOTE =
  "HLTH/Outcomes4Me 2022 baseline surveyed breast cancer patients (n=1,828). " +
  "Fertility and non-oncology deals may have limited direct overlap — matches are affinity-based.";

/**
 * Returns empowerment gap dimensions relevant to a verified deal's target company.
 */
export function empowermentContextForDeal(
  deal: DealDetail,
  snapshot: PatientEmpowermentSnapshot,
): DealEmpowermentContext {
  const targetId = deal.target.id;
  const matchedDimensions = snapshot.dimensions.filter((dim) =>
    dim.linkedCompanies.some((c) => c.id === targetId)
  );

  return {
    dealId: deal.acquisition.id,
    targetName: deal.target.name,
    sector: deal.target.sector,
    baselineNote: BASELINE_NOTE,
    matchedDimensions,
    hasDirectMatch: matchedDimensions.length > 0,
  };
}

/** Build context from dataset when snapshot not already available. */
export function empowermentContextForDealId(
  dataset: VerifiedDataset,
  deal: DealDetail,
): DealEmpowermentContext {
  const snapshot = buildPatientEmpowermentSnapshot(dataset);
  return empowermentContextForDeal(deal, snapshot);
}
