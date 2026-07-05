import type { VerifiedDataset } from "@/lib/data/datasetTypes";

/** Canonical demo deal — Modern Fertility / Ro (2021). Used in tests and hub CTA. */
export const FEATURED_DEAL_ID = "deal2";

/** Optional fields present on curated records in `dataset.verified.json`. */
export interface DealAcquisitionExtras {
  dealStructure?: string;
  preDealValuation?: number;
  preDealValuationSource?: string;
  preDealValuationDate?: string;
  computedPremium?: number;
}

export type DealTarget = VerifiedDataset["companies"][number];
export type DealAcquirer = VerifiedDataset["acquirers"][number];

export interface DealAcquisitionDetail
  extends VerifiedDataset["acquisitions"][number], DealAcquisitionExtras {}

/** Enriched deal record for diligence views and exports. */
export interface DealDetail {
  acquisition: DealAcquisitionDetail;
  target: DealTarget;
  acquirer: DealAcquirer;
}

/** Lightweight row for comparables tables. */
export interface ComparableDealSummary {
  id: string;
  targetName: string;
  acquirerName: string;
  announcedDate: string;
  dealValue?: number;
  dealType: string;
  sector: string;
}
