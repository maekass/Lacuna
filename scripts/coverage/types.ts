import type { CoverageCompanyCategory } from "../../src/lib/data/therapeuticAreaCoverageTypes";

export interface KnownFundingEntry {
  displayName?: string;
  description?: string;
  crunchbaseRank?: number;
  fundingStatus?: string;
  fundraisingStatus?: string;
  totalFundingM?: number;
  lastFundingType?: string;
  operatingStatus?: string;
  category: CoverageCompanyCategory;
  sources: string[];
}

export interface CoverageAreaConfig {
  therapeuticArea: string;
  therapeuticAreaId: string;
  pasteFileName: string;
  csvPrefix: string;
  outFileName: string;
  crunchbaseSearchTotal: number;
  knownFunding: Record<string, KnownFundingEntry>;
  knownFundingAliases?: Record<string, string>;
  nonprofitPatterns: RegExp[];
  clinicalServicePatterns: RegExp[];
  productSignalPatterns: RegExp[];
  /** Include KNOWN_FUNDING entries not present in paste (bootstrap / registry seed). */
  seedKnownRegistry?: boolean;
  pasteOptional?: boolean;
  methodology: string;
  sources: string[];
}
