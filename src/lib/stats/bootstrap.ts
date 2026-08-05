/**
 * Non-parametric bootstrap confidence intervals — BCa method.
 *
 * BCa computation is shared with the quantitative estimators so every live
 * statistic uses the same resampling, quantile, and degeneracy behavior.
 */

import { bcaBootstrap } from "./bca";

export interface BootstrapCIResult {
  estimate: number;
  lower: number;
  upper: number;
  level: number;
  method: "BCa" | "percentile";
  B: number;
  warning?: string;
}

export function bcaCI(
  data: number[],
  statistic: (sample: number[]) => number,
  B = 1999,
  level = 0.95,
  seed = 42,
): BootstrapCIResult {
  const result = bcaBootstrap({
    data,
    statistic,
    resamples: B,
    level,
    seed,
    minSampleSize: 4,
  });
  return {
    estimate: result.estimate,
    lower: result.lower,
    upper: result.upper,
    level,
    method: result.method,
    B: result.resamples,
    warning: result.warning,
  };
}

export function meanBCaCI(
  data: number[],
  level = 0.95,
  seed = 42,
): BootstrapCIResult {
  return bcaCI(
    data,
    (sample) => sample.reduce((sum, value) => sum + value, 0) / sample.length,
    1999,
    level,
    seed,
  );
}

export function medianBCaCI(
  data: number[],
  level = 0.95,
  seed = 42,
): BootstrapCIResult {
  return bcaCI(
    data,
    (sample) => {
      const sorted = [...sample].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    },
    1999,
    level,
    seed,
  );
}

export function diffMeanBCaCI(
  groupA: number[],
  groupB: number[],
  level = 0.95,
  seed = 42,
): BootstrapCIResult {
  type GroupedValue = { value: number; group: "a" | "b" };
  const data: GroupedValue[] = [
    ...groupA.map((value) => ({ value, group: "a" as const })),
    ...groupB.map((value) => ({ value, group: "b" as const })),
  ];
  const statistic = (sample: GroupedValue[]): number => {
    const a = sample.filter((item) => item.group === "a");
    const b = sample.filter((item) => item.group === "b");
    return a.length > 0 && b.length > 0
      ? a.reduce((sum, item) => sum + item.value, 0) / a.length -
        b.reduce((sum, item) => sum + item.value, 0) / b.length
      : NaN;
  };
  const result = bcaBootstrap({
    data,
    statistic,
    resamples: 1999,
    level,
    seed,
    minSampleSize: 4,
    resample: (sample, rng) => [
      ...Array.from(
        { length: groupA.length },
        () => sample[Math.floor(rng() * groupA.length)],
      ),
      ...Array.from(
        { length: groupB.length },
        () => sample[groupA.length + Math.floor(rng() * groupB.length)],
      ),
    ],
  });
  return {
    estimate: result.estimate,
    lower: result.lower,
    upper: result.upper,
    level,
    method: result.method,
    B: result.resamples,
    warning: result.warning,
  };
}
