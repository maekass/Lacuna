import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

/**
 * Valuation disparity between the highest- and lowest-average sectors
 * among companies with disclosed valuations.
 *
 * Honest framing: only sectors with ≥2 disclosed valuations qualify.
 * Returns null when fewer than 2 sectors meet the threshold — the banner
 * disappears gracefully rather than overclaiming from sparse data.
 */
export interface ValuationDisparity {
  /** Sector with the highest average disclosed valuation. */
  highSector: string;
  /** Sector with the lowest average disclosed valuation. */
  lowSector: string;
  /** Percentage difference: ((highAvg - lowAvg) / lowAvg) * 100. */
  percentDiff: number;
  /** Average disclosed valuation in the high sector (USD). */
  highAvg: number;
  /** Average disclosed valuation in the low sector (USD). */
  lowAvg: number;
  /** Number of companies with disclosed valuations in the high sector. */
  highN: number;
  /** Number of companies with disclosed valuations in the low sector. */
  lowN: number;
}

/**
 * Compute the widest sector valuation gap from verified company data.
 *
 * Only sectors with at least 2 disclosed valuations are considered.
 * Returns null when fewer than 2 sectors qualify — the caller should
 * suppress any fairness banner rather than fabricate a comparison.
 *
 * @param companies - Verified company views (from useVerifiedDataset).
 * @returns The max/min sector pair and percentage difference, or null.
 */
export function getValuationDisparity(
  companies: readonly VerifiedCompanyView[],
): ValuationDisparity | null {
  // Group disclosed valuations by sector
  const bySector = new Map<string, number[]>();
  for (const c of companies) {
    if (c.lastKnownValuation == null) continue;
    const vals = bySector.get(c.sector);
    if (vals) {
      vals.push(c.lastKnownValuation);
    } else {
      bySector.set(c.sector, [c.lastKnownValuation]);
    }
  }

  // Require ≥2 disclosed valuations per sector
  const qualified = new Map<string, { avg: number; n: number }>();
  for (const [sector, vals] of bySector) {
    if (vals.length < 2) continue;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    qualified.set(sector, { avg, n: vals.length });
  }

  // Need at least 2 sectors to compare
  if (qualified.size < 2) return null;

  // Find max and min average sectors
  let highSector = "";
  let lowSector = "";
  let highAvg = -Infinity;
  let lowAvg = Infinity;
  let highN = 0;
  let lowN = 0;

  for (const [sector, { avg, n }] of qualified) {
    if (avg > highAvg) {
      highAvg = avg;
      highSector = sector;
      highN = n;
    }
    if (avg < lowAvg) {
      lowAvg = avg;
      lowSector = sector;
      lowN = n;
    }
  }

  // Guard against degenerate case (all averages equal)
  if (lowAvg === 0) return null;

  const percentDiff = ((highAvg - lowAvg) / lowAvg) * 100;

  return { highSector, lowSector, percentDiff, highAvg, lowAvg, highN, lowN };
}
