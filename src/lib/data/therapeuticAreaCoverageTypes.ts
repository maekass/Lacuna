/**
 * Ecosystem coverage for a therapeutic area — Crunchbase discovery layer
 * separate from verified M&A rows in `dataset.verified.json`.
 */

export type CoverageCompanyCategory =
  | "therapeutics"
  | "diagnostics"
  | "digital_health"
  | "medical_device"
  | "platform"
  | "pharma";

export interface TherapeuticAreaCoverageCompany {
  /** Stable slug for UI keys */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CoverageCompanyCategory;
  /** Crunchbase rank when sourced from text search paste */
  readonly crunchbaseRank?: number;
  /** Crunchbase "Funding Status" (e.g. Early Stage Venture, IPO) */
  readonly fundingStatus?: string;
  /** Crunchbase "Fundraising Status" (e.g. Not Currently Fundraising) */
  readonly fundraisingStatus?: string;
  readonly totalFundingM?: number;
  readonly lastFundingType?: string;
  readonly operatingStatus?: string;
  /** True when name matches a row in dataset.verified.json */
  readonly inVerifiedDataset: boolean;
  readonly verifiedDatasetId?: string;
  readonly sources: readonly string[];
}

export interface TherapeuticAreaCoverageManifest {
  readonly therapeuticArea: string;
  readonly therapeuticAreaId: string;
  readonly generatedAt: string;
  readonly crunchbaseSearchTotal: number;
  readonly parsedFromPaste: number;
  readonly excludedNonForProfit: number;
  readonly excludedClinicalServices: number;
  readonly excludedNoFundingStatus: number;
  readonly includedCount: number;
  readonly verifiedDatasetOverlap: number;
  readonly companies: readonly TherapeuticAreaCoverageCompany[];
  readonly methodology: string;
  readonly sources: readonly string[];
}
