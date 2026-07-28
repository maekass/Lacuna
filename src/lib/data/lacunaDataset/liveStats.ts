/**
 * Live disclosed-only stats for UI + LIMITATIONS.md drift pins.
 */

import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { aoaDxCoverage } from "./samplingFrame";
import { dealsFromVerifiedDataset } from "./fromVerified";
import {
  adjacencyExclusionMillions,
  type AggregationParams,
  type DisclosedOnlyResult,
  disclosedOnlyTotal,
} from "./valueAggregation";
import type { ValueTier } from "./types";

/** Caller-recorded thresholds used on the public hub (not library defaults). */
export const HUB_AGGREGATION_THRESHOLDS = {
  minTier: "market_research" as ValueTier,
  concentrationWarnShare: 0.4,
  adjacencyWarnShare: 0.25,
} as const;

export interface LiveDisclosedStats {
  readonly womensHealth: DisclosedOnlyResult;
  readonly allScopes: DisclosedOnlyResult;
  readonly adjacencyExcludedMillions: number;
  readonly params: AggregationParams;
}

export function formatDisclosedBillions(millions: number): string {
  return `$${(millions / 1000).toFixed(1)}B`;
}

function hubParams(
  dataset: VerifiedDataset,
  womensHealthOnly: boolean,
): AggregationParams {
  const deals = dealsFromVerifiedDataset(dataset);
  return {
    womensHealthOnly,
    minTier: HUB_AGGREGATION_THRESHOLDS.minTier,
    completedOnly: true,
    concentrationWarnShare: HUB_AGGREGATION_THRESHOLDS.concentrationWarnShare,
    adjacencyWarnShare: HUB_AGGREGATION_THRESHOLDS.adjacencyWarnShare,
    coverage: aoaDxCoverage({ lacunaDealCount: deals.length }),
  };
}

/**
 * Live disclosed-only totals for the hub / methods surfaces.
 * Estimand: disclosed value among completed deals that disclosed a price.
 */
export function liveDisclosedStats(
  dataset: VerifiedDataset,
): LiveDisclosedStats {
  const deals = dealsFromVerifiedDataset(dataset);
  const whParams = hubParams(dataset, true);
  const allParams = hubParams(dataset, false);
  return {
    womensHealth: disclosedOnlyTotal(deals, whParams),
    allScopes: disclosedOnlyTotal(deals, allParams),
    adjacencyExcludedMillions: adjacencyExclusionMillions(deals, {
      minTier: allParams.minTier,
      completedOnly: allParams.completedOnly,
      concentrationWarnShare: allParams.concentrationWarnShare,
      adjacencyWarnShare: allParams.adjacencyWarnShare,
      coverage: allParams.coverage,
    }),
    params: whParams,
  };
}
