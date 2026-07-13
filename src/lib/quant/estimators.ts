/**
 * Small-sample-aware estimators: BCa bootstrap CIs and gated aggregates.
 * Uses simple-statistics primitives; BCa bias/acceleration implemented here.
 */

import { mean, quantile } from "simple-statistics";
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

/** Mulberry32 — deterministic, seeded PRNG for reproducible bootstrap. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-(x * x) / 2);
  const poly = t *
    (0.3193815 +
      t * (-0.3565638 +
          t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const p = d * poly;
  return x > 0 ? 1 - p : p;
}

function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Peter J. Acklam's inverse normal CDF (valid across central and tails).
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285469946870e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411648e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00,
  ];
  const d = [
    7.784695709091636e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
      c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r +
      a[5]) *
      q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
    c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function jackknifeEstimates(
  sample: number[],
  statistic: (xs: number[]) => number,
): number[] {
  return sample.map((_, i) => statistic(sample.filter((__, j) => j !== i)));
}

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

  const rng = createSeededRng(options.seed ?? DEFAULT_BOOTSTRAP_SEED);
  const thetaHat = statistic(sample);
  const boot: number[] = [];
  for (let b = 0; b < resamples; b++) {
    const resample = Array.from(
      { length: n },
      () => sample[Math.floor(rng() * n)],
    );
    boot.push(statistic(resample));
  }
  boot.sort((a, b) => a - b);

  const propLess = boot.filter((t) => t < thetaHat).length / resamples;
  const z0 = normalInv(Math.min(1 - 1e-10, Math.max(1e-10, propLess)));

  const jack = jackknifeEstimates(sample, statistic);
  const jackMean = mean(jack);
  const cubed = jack.reduce((s, t) => s + (jackMean - t) ** 3, 0);
  const squared = jack.reduce((s, t) => s + (jackMean - t) ** 2, 0);
  const acceleration = squared === 0 ? 0 : cubed / (6 * squared ** 1.5);

  const zAlphaLo = normalInv(alpha / 2);
  const zAlphaHi = normalInv(1 - alpha / 2);
  const adjLo = normalCdf(
    z0 + (z0 + zAlphaLo) / (1 - acceleration * (z0 + zAlphaLo)),
  );
  const adjHi = normalCdf(
    z0 + (z0 + zAlphaHi) / (1 - acceleration * (z0 + zAlphaHi)),
  );

  return sufficient({
    value: thetaHat,
    sampleSize: n,
    disclosedFraction: frac,
    confidenceInterval: [
      quantile(boot, Math.max(0, Math.min(1, adjLo))),
      quantile(boot, Math.max(0, Math.min(1, adjHi))),
    ],
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
