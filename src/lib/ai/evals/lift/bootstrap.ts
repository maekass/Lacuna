/**
 * Seeded percentile bootstrap for proportions with item-level denominators.
 *
 * Each metric is a vector over eval items with `null` for items outside its
 * denominator (e.g. citation correctness ignores abstentions). Resampling
 * draws items, so the denominator varies across resamples as it would across
 * eval sets. Paired lift resamples the same items for both arms.
 */
import type { ConfidenceInterval } from "./types";

export const DEFAULT_BOOTSTRAP_RESAMPLES = 2_000;
export const DEFAULT_BOOTSTRAP_SEED = 20_261_115;
export const DEFAULT_CI_LEVEL = 0.95;

/** mulberry32: small, fast, deterministic PRNG. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function proportion(values: readonly (number | null)[]): number | null {
  let sum = 0;
  let n = 0;
  for (const value of values) {
    if (value === null) continue;
    sum += value;
    n += 1;
  }
  return n === 0 ? null : sum / n;
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export interface BootstrapOptions {
  resamples?: number;
  seed?: number;
  level?: number;
}

function interval(
  estimate: number | null,
  draws: number[],
  n: number,
  level: number,
): ConfidenceInterval {
  if (estimate === null || draws.length === 0) {
    return { estimate, low: null, high: null, n };
  }
  const sorted = [...draws].sort((a, b) => a - b);
  const alpha = (1 - level) / 2;
  return {
    estimate,
    low: quantile(sorted, alpha),
    high: quantile(sorted, 1 - alpha),
    n,
  };
}

/** Bootstrap CI for one proportion. */
export function bootstrapProportion(
  values: readonly (number | null)[],
  options: BootstrapOptions = {},
): ConfidenceInterval {
  const resamples = options.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES;
  const random = seededRandom(options.seed ?? DEFAULT_BOOTSTRAP_SEED);
  const level = options.level ?? DEFAULT_CI_LEVEL;
  const n = values.filter((value) => value !== null).length;
  const estimate = proportion(values);
  const draws: number[] = [];
  if (values.length > 0) {
    for (let r = 0; r < resamples; r++) {
      const sample: (number | null)[] = [];
      for (let i = 0; i < values.length; i++) {
        sample.push(values[Math.floor(random() * values.length)]);
      }
      const value = proportion(sample);
      if (value !== null) draws.push(value);
    }
  }
  return interval(estimate, draws, n, level);
}

/**
 * Paired bootstrap for treatment − control on the same items.
 * `treatment[i]` and `control[i]` must refer to the same eval item.
 */
export function bootstrapPairedDifference(
  treatment: readonly (number | null)[],
  control: readonly (number | null)[],
  options: BootstrapOptions = {},
): ConfidenceInterval {
  if (treatment.length !== control.length) {
    throw new Error("Paired bootstrap needs vectors over the same items");
  }
  const resamples = options.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES;
  const random = seededRandom(options.seed ?? DEFAULT_BOOTSTRAP_SEED);
  const level = options.level ?? DEFAULT_CI_LEVEL;
  const t = proportion(treatment);
  const c = proportion(control);
  const estimate = t === null || c === null ? null : t - c;
  const n =
    treatment.filter((value, i) => value !== null && control[i] !== null)
      .length;
  const draws: number[] = [];
  const size = treatment.length;
  if (size > 0) {
    for (let r = 0; r < resamples; r++) {
      const ts: (number | null)[] = [];
      const cs: (number | null)[] = [];
      for (let i = 0; i < size; i++) {
        const index = Math.floor(random() * size);
        ts.push(treatment[index]);
        cs.push(control[index]);
      }
      const tp = proportion(ts);
      const cp = proportion(cs);
      if (tp !== null && cp !== null) draws.push(tp - cp);
    }
  }
  return interval(estimate, draws, n, level);
}
