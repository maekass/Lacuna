import type { VerifiedDataset } from "@/lib/data/datasetTypes";

/** Canonical demo deal — Biotheranostics / Hologic (2021). Used in tests and hub CTA. */
export const FEATURED_DEAL_ID = "deal7";

/** Consumer health workspace featured deal — Teladoc / Livongo (2020). */
export const CONSUMER_FEATURED_DEAL_ID = "deal1";

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
export type VerifiedAcquisition = VerifiedDataset["acquisitions"][number];

export type DealAcquisitionDetail = VerifiedAcquisition & DealAcquisitionExtras;

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
  evidenceClass?: string;
  sameEvidenceClass?: boolean;
  sameAcquirer?: boolean;
}
