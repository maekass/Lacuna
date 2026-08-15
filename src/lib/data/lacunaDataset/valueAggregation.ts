/**
 * Value aggregation with an explicit estimand.
 *
 * ESTIMAND (disclosedOnlyTotal):
 *   Sum of observed dealValueMillions over deals that disclosed a price,
 *   after caller-supplied filters (scope, completed-only, provenance floor).
 *   This is a descriptive statistic on the disclosed subsample — NOT an
 *   estimate of total transacted value in the sampling frame.
 *
 * Non-disclosure is missing-not-at-random (MNAR): sub-threshold and
 * strategically sensitive deals disappear from every provenance tier at
 * different rates. Summing observed values does not identify expected
 * frame total. estimatedFrameTotal therefore returns bounds under an
 * explicit caller-supplied selection model — never a silent point estimate.
 *
 * Provenance tiers stratify for transparency. They differ in censoring
 * pattern, not merely precision; higher tiers are not labeled "defensible."
 *
 * All thresholds (concentration, adjacency share, tier floor) are
 * caller-supplied and recorded in the output — the library invents none.
 */

import { asCompletedDeal, completedDealsOf } from "./dealLifecycle";
import type {
  AggregateCoverage,
  CoverageRatio,
  LacunaDeal,
  ValueTier,
} from "./types";
import { VALUE_TIER_RANK, VALUE_TIERS } from "./types";

export type ValueEstimand =
  | "disclosed_only_observed_sum"
  | "frame_total_under_selection_model";

export interface SelectionModel {
  /** Human-readable description of the MNAR / selection assumption. */
  readonly description: string;
  /**
   * Map disclosed-only total → [lower, upper] bounds for frame total.
   * Must not return a collapsed point unless the model truly identifies one.
   */
  readonly boundFrameTotal: (
    disclosedOnlyTotalMillions: number,
    disclosedCount: number,
    frameDealCount: number,
  ) => { readonly lowerMillions: number; readonly upperMillions: number };
}

export interface AggregationParams {
  /** When true, keep scope === "womens_health" only. Required — no default. */
  readonly womensHealthOnly: boolean;
  /**
   * Include only deals whose valueTier rank is ≤ this floor
   * (sec_filing is best). Required — no library default.
   */
  readonly minTier: ValueTier;
  /** When true, only branded CompletedDeal rows enter the sum. */
  readonly completedOnly: boolean;
  /** Caller-supplied: warn when one deal exceeds this share of the total. */
  readonly concentrationWarnShare: number;
  /** Caller-supplied: warn when adjacency share of value exceeds this. */
  readonly adjacencyWarnShare: number;
  /** Coverage denominator metadata attached to every aggregate. */
  readonly coverage: CoverageRatio;
}

export interface TierSubtotal {
  readonly tier: ValueTier;
  readonly dealCount: number;
  readonly disclosedCount: number;
  readonly valueMillions: number;
  /** Share of disclosedOnlyTotal (0 when total is 0). */
  readonly shareOfTotal: number;
}

export interface DisclosedOnlyResult extends AggregateCoverage {
  readonly estimand: "disclosed_only_observed_sum";
  readonly estimandNote: string;
  readonly params: AggregationParams;
  readonly disclosedOnlyTotalMillions: number;
  readonly dealCount: number;
  readonly disclosedCount: number;
  readonly undisclosedCount: number;
  readonly adjacencyValueMillions: number;
  readonly adjacencyShare: number;
  readonly tierSubtotals: readonly TierSubtotal[];
  readonly provenanceMix: Readonly<Record<ValueTier, number>>;
  readonly warnings: readonly string[];
  readonly excludedDealIds: readonly string[];
}

export interface EstimatedFrameTotalResult extends AggregateCoverage {
  readonly estimand: "frame_total_under_selection_model";
  readonly estimandNote: string;
  readonly selectionModelDescription: string;
  readonly disclosedOnly: DisclosedOnlyResult;
  readonly lowerMillions: number;
  readonly upperMillions: number;
}

const ESTIMAND_NOTE =
  "disclosedOnlyTotal = Σ dealValueMillions over deals that disclosed a price " +
  "after filters. Descriptive on the observed disclosed subsample; does not " +
  "identify total transacted value under MNAR non-disclosure.";

function tierAtOrAboveFloor(tier: ValueTier, floor: ValueTier): boolean {
  return VALUE_TIER_RANK[tier] <= VALUE_TIER_RANK[floor];
}

function applyFilters(
  deals: readonly LacunaDeal[],
  params: Pick<
    AggregationParams,
    "womensHealthOnly" | "minTier" | "completedOnly"
  >,
): { kept: LacunaDeal[]; excludedDealIds: string[] } {
  const kept: LacunaDeal[] = [];
  const excludedDealIds: string[] = [];

  for (const deal of deals) {
    if (params.womensHealthOnly && deal.scope !== "womens_health") {
      excludedDealIds.push(deal.id);
      continue;
    }
    if (!tierAtOrAboveFloor(deal.valueTier, params.minTier)) {
      excludedDealIds.push(deal.id);
      continue;
    }
    if (params.completedOnly) {
      if (!asCompletedDeal(deal)) {
        excludedDealIds.push(deal.id);
        continue;
      }
    }
    kept.push(deal);
  }
  return { kept, excludedDealIds };
}

function emptyProvenanceMix(): Record<ValueTier, number> {
  return {
    sec_filing: 0,
    trade_press: 0,
    broker_advisory: 0,
    market_research: 0,
  };
}

/**
 * Disclosed-only descriptive total. Callers must pass every filter explicitly.
 */
export function disclosedOnlyTotal(
  deals: readonly LacunaDeal[],
  params: AggregationParams,
): DisclosedOnlyResult {
  const { kept, excludedDealIds } = applyFilters(deals, params);

  const byTier = new Map<
    ValueTier,
    { deals: number; disclosed: number; value: number }
  >();
  for (const tier of VALUE_TIERS) {
    byTier.set(tier, { deals: 0, disclosed: 0, value: 0 });
  }

  let disclosedOnlyTotalMillions = 0;
  let disclosedCount = 0;
  let undisclosedCount = 0;
  let adjacencyValueMillions = 0;
  let maxDealValue = 0;
  let maxDealId = "";

  for (const deal of kept) {
    const bucket = byTier.get(deal.valueTier)!;
    bucket.deals += 1;
    if (typeof deal.dealValueMillions === "number") {
      bucket.disclosed += 1;
      bucket.value += deal.dealValueMillions;
      disclosedOnlyTotalMillions += deal.dealValueMillions;
      disclosedCount += 1;
      if (deal.scope === "adjacency") {
        adjacencyValueMillions += deal.dealValueMillions;
      }
      if (deal.dealValueMillions > maxDealValue) {
        maxDealValue = deal.dealValueMillions;
        maxDealId = deal.id;
      }
    } else {
      undisclosedCount += 1;
    }
  }

  const provenanceMix = emptyProvenanceMix();
  const tierSubtotals: TierSubtotal[] = VALUE_TIERS.map((tier) => {
    const bucket = byTier.get(tier)!;
    const shareOfTotal = disclosedOnlyTotalMillions > 0
      ? bucket.value / disclosedOnlyTotalMillions
      : 0;
    provenanceMix[tier] = shareOfTotal;
    return {
      tier,
      dealCount: bucket.deals,
      disclosedCount: bucket.disclosed,
      valueMillions: bucket.value,
      shareOfTotal,
    };
  });

  const adjacencyShare = disclosedOnlyTotalMillions > 0
    ? adjacencyValueMillions / disclosedOnlyTotalMillions
    : 0;

  const warnings: string[] = [];
  if (
    disclosedOnlyTotalMillions > 0 &&
    maxDealValue / disclosedOnlyTotalMillions > params.concentrationWarnShare
  ) {
    warnings.push(
      `Concentration risk: deal ${maxDealId} is ${
        (
          (maxDealValue / disclosedOnlyTotalMillions) *
          100
        ).toFixed(1)
      }% of disclosedOnlyTotal ` +
        `(caller threshold ${
          (params.concentrationWarnShare * 100).toFixed(0)
        }%).`,
    );
  }
  if (adjacencyShare > params.adjacencyWarnShare) {
    warnings.push(
      `Adjacency share ${
        (adjacencyShare * 100).toFixed(1)
      }% of disclosed value ` +
        `exceeds caller threshold ${
          (params.adjacencyWarnShare * 100).toFixed(0)
        }%.`,
    );
  }

  return {
    estimand: "disclosed_only_observed_sum",
    estimandNote: ESTIMAND_NOTE,
    params,
    disclosedOnlyTotalMillions,
    dealCount: kept.length,
    disclosedCount,
    undisclosedCount,
    adjacencyValueMillions,
    adjacencyShare,
    tierSubtotals,
    provenanceMix,
    warnings,
    excludedDealIds,
    coverage: params.coverage,
  };
}

/**
 * Frame-total bounds under an explicit selection model.
 * Never invents a point estimate when the model returns a range.
 */
export function estimatedFrameTotal(
  deals: readonly LacunaDeal[],
  params: AggregationParams,
  selectionModel: SelectionModel,
): EstimatedFrameTotalResult {
  const disclosedOnly = disclosedOnlyTotal(deals, params);
  const frameDealCount = params.womensHealthOnly
    ? deals.filter((d) => d.scope === "womens_health").length
    : deals.length;
  const bounds = selectionModel.boundFrameTotal(
    disclosedOnly.disclosedOnlyTotalMillions,
    disclosedOnly.disclosedCount,
    frameDealCount,
  );
  return {
    estimand: "frame_total_under_selection_model",
    estimandNote:
      "Bounds for frame total under the caller-supplied selection model. " +
      "Not a disclosed-only descriptive sum.",
    selectionModelDescription: selectionModel.description,
    disclosedOnly,
    lowerMillions: bounds.lowerMillions,
    upperMillions: bounds.upperMillions,
    coverage: params.coverage,
  };
}

/** Adjacency disclosed value excluded when womensHealthOnly flips true→contrast. */
export function adjacencyExclusionMillions(
  deals: readonly LacunaDeal[],
  params: Omit<AggregationParams, "womensHealthOnly">,
): number {
  const withAdj = disclosedOnlyTotal(deals, {
    ...params,
    womensHealthOnly: false,
  });
  const whOnly = disclosedOnlyTotal(deals, {
    ...params,
    womensHealthOnly: true,
  });
  return withAdj.disclosedOnlyTotalMillions -
    whOnly.disclosedOnlyTotalMillions;
}

/** Convenience: completed WH disclosed-only with recorded caller thresholds. */
export function completedWomensHealthDisclosed(
  deals: readonly LacunaDeal[],
  params: Omit<AggregationParams, "womensHealthOnly" | "completedOnly">,
): DisclosedOnlyResult {
  // Touch completedDealsOf so the brand path is the only entry to exit totals.
  void completedDealsOf(deals);
  return disclosedOnlyTotal(deals, {
    ...params,
    womensHealthOnly: true,
    completedOnly: true,
  });
}
