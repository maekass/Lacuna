/**
 * Small-sample-aware estimators: BCa bootstrap CIs and gated aggregates.
 * Uses simple-statistics primitives; BCa bias/acceleration implemented here.
 */

import { mean, quantile } from "simple-statistics";
import { bcaBootstrap } from "@/lib/stats/bca";
import { createSeededRng } from "@/lib/stats/random";
import type { InsufficientData, QuantValue, Sufficient } from "./types";

export const MIN_SECTOR_SAMPLE = 5;
export const MIN_BCA_SAMPLE = 8;
export const MIN_FUNDING_MULTIPLE_SAMPLE = 3;
export const BOOTSTRAP_RESAMPLES = 2000;
export const DEFAULT_BOOTSTRAP_SEED = 42;

export function isSufficient<T extends number>(
  value: QuantValue<T>,
): value is Sufficient<T> {
  return value.kind === "sufficient";
}

export function disclosedFraction(disclosed: number, total: number): number {
  return total > 0 ? disclosed / total : 0;
}

/** Heckman-style selection caveat for disclosed-only deal values. */
export function heckmanSelectionCaveat(
  disclosed: number,
  total: number,
): string {
  const frac = disclosedFraction(disclosed, total);
  return "Disclosed-price deals are a non-random subsample " +
    `(${(frac * 100).toFixed(0)}% of n=${total} sector deals). ` +
    "Selection bias may inflate medians; Heckman correction not applied.";
}

export function numericOrNull(value: QuantValue<number>): number | null {
  return isSufficient(value) ? value.value : null;
}

export { createSeededRng };

function insufficient(
  partial: Omit<InsufficientData, "kind">,
): InsufficientData {
  return { kind: "insufficient", ...partial };
}

export function sufficient(
  partial: Omit<Sufficient<number>, "kind">,
): Sufficient<number> {
  return { kind: "sufficient", ...partial };
}

/**
 * BCa bootstrap confidence interval (Efron 1987).
 * Returns InsufficientData when n < minSampleSize.
 */
export function bcaBootstrapCi(
  sample: number[],
  statistic: (xs: number[]) => number,
  options: {
    alpha?: number;
    resamples?: number;
    seed?: number;
    minSampleSize?: number;
    disclosedCount?: number;
    totalCount?: number;
  } = {},
): QuantValue<number> {
  const alpha = options.alpha ?? 0.05;
  const resamples = options.resamples ?? BOOTSTRAP_RESAMPLES;
  const minSampleSize = options.minSampleSize ?? MIN_BCA_SAMPLE;
  const n = sample.length;
  const total = options.totalCount ?? n;
  const disclosed = options.disclosedCount;
  const selectionCaveat = disclosed !== undefined
    ? heckmanSelectionCaveat(disclosed, total)
    : undefined;
  const frac = disclosed !== undefined
    ? disclosedFraction(disclosed, total)
    : undefined;

  if (n < minSampleSize) {
    return insufficient({
      code: "small_sample",
      message: `n=${n} below minimum ${minSampleSize} for BCa interval`,
      sampleSize: n,
      minRequired: minSampleSize,
      disclosedFraction: frac,
      selectionCaveat,
    });
  }

  const result = bcaBootstrap({
    data: sample,
    statistic,
    resamples,
    level: 1 - alpha,
    seed: options.seed ?? DEFAULT_BOOTSTRAP_SEED,
    minSampleSize,
  });

  return sufficient({
    value: result.estimate,
    sampleSize: n,
    disclosedFraction: frac,
    confidenceInterval: [result.lower, result.upper],
    selectionCaveat,
  });
}

/** Gated sector median with BCa CI and disclosure metadata. */
export function gatedMedian(
  values: number[],
  options: {
    minSampleSize?: number;
    disclosedCount?: number;
    totalCount?: number;
    seed?: number;
  } = {},
): QuantValue<number> {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  const min = options.minSampleSize ?? MIN_SECTOR_SAMPLE;
  const total = options.totalCount ?? positive.length;
  const disclosed = options.disclosedCount ?? positive.length;
  const frac = disclosedFraction(disclosed, total);
  const selectionCaveat = heckmanSelectionCaveat(disclosed, total);

  if (positive.length === 0) {
    return insufficient({
      code: "no_disclosed_values",
      message: "No disclosed positive values in sector bucket",
      sampleSize: 0,
      minRequired: min,
      disclosedFraction: frac,
      selectionCaveat,
    });
  }

  return bcaBootstrapCi(
    positive,
    (xs) => quantile(xs, 0.5),
    {
      minSampleSize: min,
      disclosedCount: disclosed,
      totalCount: total,
      seed: options.seed,
    },
  );
}

/** BCa CI for a binomial proportion (e.g. sector exit rate). */
export function gatedProportionCi(
  successes: number,
  total: number,
  options: { minSampleSize?: number; seed?: number } = {},
): QuantValue<number> {
  const min = options.minSampleSize ?? MIN_SECTOR_SAMPLE;
  if (total < min) {
    return insufficient({
      code: "small_sample",
      message: `n=${total} below minimum ${min} for proportion CI`,
      sampleSize: total,
      minRequired: min,
    });
  }
  const sample = [
    ...Array.from({ length: successes }, () => 1),
    ...Array.from({ length: total - successes }, () => 0),
  ];
  return bcaBootstrapCi(sample, mean, {
    minSampleSize: min,
    seed: options.seed,
  });
}

export function pointEstimate(
  value: number,
  reasoning: string,
): Sufficient<number> {
  return sufficient({
    value,
    sampleSize: 1,
    confidenceInterval: [value, value],
    selectionCaveat: reasoning,
  });
}

export function missingInput(message: string): InsufficientData {
  return insufficient({
    code: "missing_input",
    message,
    sampleSize: 0,
    minRequired: 1,
  });
}

export function scaleQuantValue(
  base: QuantValue<number>,
  multiplier: number,
): QuantValue<number> {
  if (!isSufficient(base)) return base;
  return sufficient({
    value: base.value * multiplier,
    sampleSize: base.sampleSize,
    disclosedFraction: base.disclosedFraction,
    selectionCaveat: base.selectionCaveat,
    confidenceInterval: [
      base.confidenceInterval[0] * multiplier,
      base.confidenceInterval[1] * multiplier,
    ],
  });
}

export function weightedConsensus(
  estimates: Array<{ value: QuantValue<number>; weight: number }>,
): QuantValue<number> {
  const valid = estimates.filter((e) => isSufficient(e.value) && e.weight > 0);
  if (valid.length === 0) {
    return insufficient({
      code: "missing_input",
      message: "No sufficient valuation methods",
      sampleSize: 0,
      minRequired: 1,
    });
  }

  const totalWeight = valid.reduce((s, e) => s + e.weight, 0);
  const value = valid.reduce(
    (s, e) => s + (e.value as Sufficient<number>).value * e.weight,
    0,
  ) / totalWeight;

  const lo = valid.reduce(
    (s, e) =>
      s + (e.value as Sufficient<number>).confidenceInterval[0] * e.weight,
    0,
  ) / totalWeight;
  const hi = valid.reduce(
    (s, e) =>
      s + (e.value as Sufficient<number>).confidenceInterval[1] * e.weight,
    0,
  ) / totalWeight;

  const sampleSize = Math.min(
    ...valid.map((e) => (e.value as Sufficient<number>).sampleSize),
  );

  return sufficient({
    value,
    sampleSize,
    confidenceInterval: [lo, hi],
    disclosedFraction: valid.find((e) =>
        (e.value as Sufficient<number>).disclosedFraction !== undefined
      )
      ? (valid[0].value as Sufficient<number>).disclosedFraction
      : undefined,
    selectionCaveat: valid.find((e) =>
        (e.value as Sufficient<number>).selectionCaveat
      )
      ? (valid[0].value as Sufficient<number>).selectionCaveat
      : undefined,
  });
}
