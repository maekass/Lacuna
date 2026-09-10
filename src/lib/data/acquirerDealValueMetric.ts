/**
 * Acquirer mean disclosed deal value with the same n≥5 floor the
 * artifact layer uses to withhold registered metrics.
 */

import type { ArtifactMetric } from "@/lib/provenance/metricProvenance";

export const ACQUIRER_DEAL_VALUE_MIN_N = 5;
export const ACQUIRER_DEAL_VALUE_METRIC_ID = "acquirer.dealValue.mean";

export interface DisclosedDealValue {
  readonly dealValue: number;
  readonly announcedDate: string;
}

export interface AcquirerDealValueView {
  readonly provenance: ArtifactMetric;
  readonly trackedDealsLabel: string;
  readonly populationLabel: string;
}

function yearOf(isoDate: string): number | null {
  const year = Number(isoDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function meanAndCi(values: number[]): {
  mean: number;
  ci: readonly [number, number];
} {
  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n < 2) return { mean, ci: [mean, mean] };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (n - 1);
  const se = Math.sqrt(variance / n);
  return { mean, ci: [mean - 1.96 * se, mean + 1.96 * se] };
}

/**
 * Build the Avg. Deal Value tile: suppress below n=5, label nominal USD
 * and the contributing year range, and keep the disclosed-value denominator.
 */
export function buildAcquirerDealValueView(
  trackedDealCount: number,
  disclosed: readonly DisclosedDealValue[],
): AcquirerDealValueView {
  const n = disclosed.length;
  const years = disclosed
    .map((row) => yearOf(row.announcedDate))
    .filter((year): year is number => year !== null);
  const yearLo = years.length > 0 ? Math.min(...years) : null;
  const yearHi = years.length > 0 ? Math.max(...years) : null;
  const yearRange = yearLo !== null && yearHi !== null
    ? yearLo === yearHi ? String(yearLo) : `${yearLo}–${yearHi}`
    : "unknown years";

  const trackedDealsLabel =
    `${trackedDealCount} deals tracked · ${n} with disclosed value`;
  const populationLabel =
    `Avg. disclosed deal value (n=${n}, nominal USD, ${yearRange})`;

  if (n < ACQUIRER_DEAL_VALUE_MIN_N) {
    return {
      trackedDealsLabel,
      populationLabel,
      provenance: {
        kind: "artifact",
        metricId: ACQUIRER_DEAL_VALUE_METRIC_ID,
        estimate: {
          kind: "insufficient",
          sampleSize: n,
          minRequired: ACQUIRER_DEAL_VALUE_MIN_N,
          message: `n=${n} below minimum ${ACQUIRER_DEAL_VALUE_MIN_N}`,
        },
      },
    };
  }

  const { mean, ci } = meanAndCi(disclosed.map((row) => row.dealValue));
  return {
    trackedDealsLabel,
    populationLabel,
    provenance: {
      kind: "artifact",
      metricId: ACQUIRER_DEAL_VALUE_METRIC_ID,
      estimate: {
        kind: "sufficient",
        value: mean,
        sampleSize: n,
        confidenceInterval: ci,
      },
    },
  };
}
