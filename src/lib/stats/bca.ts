/**
 * Bias-corrected and accelerated (BCa) bootstrap confidence intervals.
 *
 * The bias correction z₀ accounts for the proportion of bootstrap estimates
 * below the observed estimate (θ̂). The acceleration a adjusts for skew in
 * the statistic's jackknife influence values. See Efron & Tibshirani (1994),
 * *An Introduction to the Bootstrap*, Ch. 14, and DiCiccio & Efron (1996),
 * "Bootstrap Confidence Intervals", Statistical Science 11(3):189–228.
 *
 * The result uses `method: "percentile"` rather than `"BCa"` when:
 * - the sample is smaller than `minSampleSize`;
 * - no finite bootstrap replicates are available;
 * - every bootstrap replicate equals θ̂;
 * - n < 10, making jackknife acceleration unreliable; or
 * - adjusted BCa quantiles are non-finite, degenerate, or out of bounds.
 */

import { createSeededRng } from "./random";

export interface BcaOptions {
  resamples: number;
  level: number;
  seed: number;
  minSampleSize?: number;
}

export interface BcaResult {
  estimate: number;
  lower: number;
  upper: number;
  resamples: number;
  method: "BCa" | "percentile";
  warning?: string;
}

interface BcaInput<T> extends BcaOptions {
  data: readonly T[];
  statistic: (sample: T[]) => number;
  resample?: (data: readonly T[], rng: () => number) => T[];
  jackknife?: (
    data: readonly T[],
    statistic: (sample: T[]) => number,
  ) => number[];
}

function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
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
      q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
    c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const y = t *
    (0.31938153 +
      t * (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * y;
  return x >= 0 ? 1 - phi : phi;
}

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const p = Math.max(0, Math.min(1, probability));
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function defaultResample<T>(
  data: readonly T[],
  rng: () => number,
): T[] {
  return Array.from(
    { length: data.length },
    () => data[Math.floor(rng() * data.length)],
  );
}

function defaultJackknife<T>(
  data: readonly T[],
  statistic: (sample: T[]) => number,
): number[] {
  return data.map((_, index) =>
    statistic(data.filter((__, candidate) => candidate !== index))
  );
}

export function bcaBootstrap<T>({
  data,
  statistic,
  resample = defaultResample,
  jackknife = defaultJackknife,
  resamples,
  level,
  seed,
  minSampleSize,
}: BcaInput<T>): BcaResult {
  const estimate = statistic([...data]);
  const alpha = 1 - level;
  const warnings: string[] = [];
  if (data.length < (minSampleSize ?? 0)) {
    return {
      estimate,
      lower: estimate,
      upper: estimate,
      resamples: 0,
      method: "percentile",
      warning: `n=${data.length} too small for bootstrap`,
    };
  }

  const rng = createSeededRng(seed);
  const boot = Array.from(
    { length: resamples },
    () => statistic(resample(data, rng)),
  ).filter(Number.isFinite).sort((a, b) => a - b);

  if (boot.length === 0) {
    return {
      estimate,
      lower: estimate,
      upper: estimate,
      resamples: 0,
      method: "percentile",
      warning: "No finite bootstrap replicates",
    };
  }

  const percentile = (): BcaResult => ({
    estimate,
    lower: quantile(boot, alpha / 2),
    upper: quantile(boot, 1 - alpha / 2),
    resamples: boot.length,
    method: "percentile",
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  });

  if (boot.every((value) => value === estimate)) {
    warnings.push("All bootstrap replicates equal the estimate");
    return percentile();
  }

  const proportionLess = boot.filter((value) => value < estimate).length /
    boot.length;
  const z0 = normalQuantile(
    Math.min(1 - 1e-10, Math.max(1e-10, proportionLess)),
  );
  const jack = jackknife(data, statistic).filter(Number.isFinite);
  if (jack.length === 0) {
    warnings.push("No finite jackknife estimates");
    return percentile();
  }
  const jackMean = jack.reduce((sum, value) => sum + value, 0) / jack.length;
  const cubed = jack.reduce((sum, value) => sum + (jackMean - value) ** 3, 0);
  const squared = jack.reduce((sum, value) => sum + (jackMean - value) ** 2, 0);
  const acceleration = cubed / (6 * squared ** 1.5 || 1);
  if (data.length < 10) {
    warnings.push(
      `n=${data.length} < 10 — jackknife acceleration unreliable; BCa degrades to percentile`,
    );
    return percentile();
  }

  const adjusted = (zQ: number): number => {
    const numerator = z0 + zQ;
    const denominator = 1 - acceleration * numerator;
    return normalCdf(z0 + numerator / denominator);
  };
  const p1 = adjusted(normalQuantile(alpha / 2));
  const p2 = adjusted(normalQuantile(1 - alpha / 2));
  if (
    !Number.isFinite(p1) ||
    !Number.isFinite(p2) ||
    p1 < 0 ||
    p1 > 1 ||
    p2 < 0 ||
    p2 > 1 ||
    p1 >= p2
  ) {
    warnings.push(
      "BCa adjustment was not finite; returning percentile interval",
    );
    return percentile();
  }

  return {
    estimate,
    lower: quantile(boot, p1),
    upper: quantile(boot, p2),
    resamples: boot.length,
    method: "BCa",
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}
