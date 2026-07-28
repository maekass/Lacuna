/**
 * Shared types for the lacunaDataset analytics layer.
 *
 * This layer sits on top of `dataset.verified.json` and adds provenance,
 * lifecycle, and sampling-frame metadata that the raw JSON does not carry.
 */

/** Source-provenance strata for disclosed deal values. */
export const VALUE_TIERS = [
  "sec_filing",
  "trade_press",
  "broker_advisory",
  "market_research",
] as const;

export type ValueTier = (typeof VALUE_TIERS)[number];

/** Ordering for stratification (lower index = earlier in disclosure pipeline). */
export const VALUE_TIER_RANK: Readonly<Record<ValueTier, number>> = {
  sec_filing: 0,
  trade_press: 1,
  broker_advisory: 2,
  market_research: 3,
};

export type DealScope = "womens_health" | "adjacency";

export type DealStatus =
  | "rumored"
  | "announced"
  | "pending_regulatory"
  | "completed"
  | "terminated"
  | "abandoned";

export interface StatusTransition {
  readonly status: DealStatus;
  /** ISO calendar date (YYYY-MM-DD) when this status was observed. */
  readonly statusAsOf: string;
  /** Citation for the status observation. */
  readonly statusSource: string;
}

/**
 * Announcement timing as a precision-tagged union.
 * Day-resolution analysis must refuse month/year rows rather than invent a day.
 */
export type AnnouncedDate =
  | { readonly precision: "day"; readonly date: string }
  | { readonly precision: "month"; readonly yearMonth: string }
  | { readonly precision: "year"; readonly year: number };

export type DatePrecision = AnnouncedDate["precision"];

/** Deal row consumed by lacunaDataset aggregators. */
export interface LacunaDeal {
  readonly id: string;
  readonly targetId: string;
  readonly acquirerId: string;
  readonly targetName: string;
  readonly acquirerName: string;
  readonly announced: AnnouncedDate;
  /** Disclosed value in USD millions; absent when not disclosed. */
  readonly dealValueMillions?: number;
  readonly valueTier: ValueTier;
  readonly scope: DealScope;
  readonly statusHistory: readonly StatusTransition[];
  readonly source: string;
}

/** Brand for deals whose terminal status is completed via validated transition. */
declare const completedDealBrand: unique symbol;

export type CompletedDeal = LacunaDeal & {
  readonly [completedDealBrand]: true;
  readonly status: "completed";
};

export interface CoverageRatio {
  /** Observed capture rate: |sample ∩ reference| / |reference| when matched,
   * otherwise |sample| / referenceCount under documented frame assumptions. */
  readonly rate: number;
  readonly numerator: number;
  readonly denominator: number;
  readonly referenceName: string;
  readonly referenceFrameNote: string;
  /** Non-identifiability / independence caveats — never empty for external refs. */
  readonly caveats: readonly string[];
}

/** Every aggregate carries coverage so consumers cannot omit the denominator. */
export interface AggregateCoverage {
  readonly coverage: CoverageRatio;
}
