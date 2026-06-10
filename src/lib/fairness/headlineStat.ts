/**
 * Headline valuation-disparity statistic for the Fairness Audit banner.
 *
 * Groups verified companies by sector, computes the average of
 * `lastKnownValuation` for companies that have a disclosed figure, and returns
 * the highest / lowest sector pair along with the relative gap.
 *
 * Design constraints:
 * - Requires ≥ 2 disclosed valuations per sector before that sector qualifies.
 * - Returns `null` when fewer than 2 sectors qualify — the UI must hide the
 *   banner in that case.
 * - Does NOT impute missing valuations; the `n` fields communicate honest
 *   coverage so callers can surface sample-size caveats.
 *
 * @module src/lib/fairness/headlineStat
 */

import { verifiedCompanies } from "@/data/verifiedData";

/** Result shape for the max/min sector valuation pair. */
export interface ValuationDisparity {
  /** Sector with the highest average disclosed valuation. */
  highSector: string;
  /** Sector with the lowest average disclosed valuation. */
  lowSector: string;
  /**
   * Relative gap: `((highAvg - lowAvg) / lowAvg) * 100`.
   * Expressed as a percentage point difference, not a ratio.
   */
  percentDiff: number;
  /** Mean disclosed valuation for `highSector` (USD millions). */
  highAvg: number;
  /** Mean disclosed valuation for `lowSector` (USD millions). */
  lowAvg: number;
  /** Number of companies with disclosed valuations in `highSector`. */
  highN: number;
  /** Number of companies with disclosed valuations in `lowSector`. */
  lowN: number;
}

/**
 * Compute the widest sector-level valuation gap in the verified dataset.
 *
 * Only sectors with at least 2 disclosed valuations are considered.
 * Returns `null` when fewer than 2 such sectors exist.
 *
 * @returns The high/low sector pair and their relative gap, or `null`.
 */
export function getValuationDisparity(): ValuationDisparity | null {
  const sectorMap = new Map<string, number[]>();

  for (const company of verifiedCompanies) {
    if (typeof company.lastKnownValuation !== "number") continue;
    const bucket = sectorMap.get(company.sector) ?? [];
    bucket.push(company.lastKnownValuation);
    sectorMap.set(company.sector, bucket);
  }

  const qualified: Array<{ sector: string; avg: number; n: number }> = [];
  for (const [sector, valuations] of sectorMap) {
    if (valuations.length < 2) continue;
    const avg = valuations.reduce((sum, v) => sum + v, 0) / valuations.length;
    qualified.push({ sector, avg, n: valuations.length });
  }

  if (qualified.length < 2) return null;

  qualified.sort((a, b) => b.avg - a.avg);
  const high = qualified[0];
  const low = qualified[qualified.length - 1];

  return {
    highSector: high.sector,
    lowSector: low.sector,
    percentDiff: ((high.avg - low.avg) / low.avg) * 100,
    highAvg: high.avg,
    lowAvg: low.avg,
    highN: high.n,
    lowN: low.n,
  };
}
