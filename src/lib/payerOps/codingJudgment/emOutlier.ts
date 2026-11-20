/**
 * Target-code share within a code family relative to specialty peers. The
 * default family is established-patient office E/M (target 99215 among
 * 99211–99215); the specialty and family come from a PeerScreenConfig.
 *
 * Method (pure, deterministic):
 * 1. Aggregate services per provider across places of service. Target share
 *    is services(target) / services(family), e.g. 99215 / 99211–99215.
 * 2. Keep providers at or above a minimum family volume whose required
 *    codes (default 99213 and 99214) are visible (CMS suppresses rows under 11 beneficiaries, and a
 *    missing high-volume row would inflate the share).
 * 3. Fit a beta-binomial peer distribution by method of moments. This allows
 *    real between-provider variation (overdispersion), unlike a plain binomial
 *    test against the pooled rate, which flags almost every large provider.
 * 4. Review screen: route a provider for review when the posterior
 *    probability that their true level-5 rate exceeds the peer distribution's
 *    95th percentile is at least 0.9 (empirical Bayes; small samples are
 *    pulled toward the peer rate).
 * 5. Significance readout: one-sided beta-binomial upper-tail p-values with
 *    Benjamini-Hochberg, and a naive binomial test for contrast.
 *
 * An outlier is a reason for human review. It is not evidence of incorrect
 * coding, fraud, or wrongdoing.
 */
import { createHmac } from "node:crypto";
import type { Quantiles } from "@/lib/payerOps/codingJudgment/schemas";

/** Default code family: established-patient office E/M, target level 5. */
export const EM_CODES = ["99211", "99212", "99213", "99214", "99215"] as const;
export const LEVEL5_CODE = "99215";

export interface CodeFamily {
  codes: readonly string[];
  targetCode: string;
}

export const DEFAULT_CODE_FAMILY: CodeFamily = {
  codes: EM_CODES,
  targetCode: LEVEL5_CODE,
};

/** One provider × code × place-of-service row (fields kept from the CMS pull). */
export interface EmServiceRow {
  npi: string;
  hcpcs: string;
  placeOfService: string;
  services: number;
}

export interface ProviderEmCounts {
  npi: string;
  familyServices: number;
  targetServices: number;
  /** E/M codes with a non-suppressed row for this provider, sorted. */
  codesPresent: string[];
}

export interface BetaBinomialFit {
  pooledShare: number;
  rho: number;
  alpha: number;
  beta: number;
}

export interface ProviderOutlierResult extends ProviderEmCounts {
  rawShare: number;
  /** Posterior-mean share under the fitted peer prior. */
  shrunkShare: number;
  /** P(true level-5 rate > peer review-percentile rate | data). */
  posteriorAboveReviewRate: number;
  betaBinomialP: number;
  betaBinomialQ: number;
  binomialP: number;
  binomialQ: number;
  outlierForReview: boolean;
}

/** Sum services per provider across places of service. */
export function aggregateProviderCounts(
  rows: readonly EmServiceRow[],
  family: CodeFamily = DEFAULT_CODE_FAMILY,
): ProviderEmCounts[] {
  if (!family.codes.includes(family.targetCode)) {
    throw new Error("targetCode must be one of the family codes");
  }
  const byNpi = new Map<string, ProviderEmCounts>();
  for (const row of rows) {
    if (!family.codes.includes(row.hcpcs)) continue;
    if (!Number.isFinite(row.services) || row.services < 0) {
      throw new Error(`Invalid services for ${row.hcpcs}`);
    }
    const current = byNpi.get(row.npi) ??
      { npi: row.npi, familyServices: 0, targetServices: 0, codesPresent: [] };
    current.familyServices += row.services;
    if (!current.codesPresent.includes(row.hcpcs)) {
      current.codesPresent = [...current.codesPresent, row.hcpcs].sort();
    }
    if (row.hcpcs === family.targetCode) current.targetServices += row.services;
    byNpi.set(row.npi, current);
  }
  return [...byNpi.values()].sort((a, b) => a.npi.localeCompare(b.npi));
}

const LANCZOS = [
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Natural log of the gamma function (Lanczos, g = 7). */
export function logGamma(x: number): number {
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let a = 0.99999999999980993;
  const t = z + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (z + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t +
    Math.log(a);
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logChoose(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function logSumExp(values: number[]): number {
  const max = Math.max(...values);
  if (!Number.isFinite(max)) return max;
  let sum = 0;
  for (const value of values) sum += Math.exp(value - max);
  return max + Math.log(sum);
}

/** P(K >= k) for K ~ BetaBinomial(n, alpha, beta). */
export function betaBinomialUpperTail(
  k: number,
  n: number,
  alpha: number,
  beta: number,
): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  const logB = logBeta(alpha, beta);
  const terms: number[] = [];
  for (let j = k; j <= n; j++) {
    terms.push(logChoose(n, j) + logBeta(j + alpha, n - j + beta) - logB);
  }
  return Math.min(1, Math.exp(logSumExp(terms)));
}

/** P(K >= k) for K ~ Binomial(n, p). */
export function binomialUpperTail(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const terms: number[] = [];
  for (let j = k; j <= n; j++) {
    terms.push(logChoose(n, j) + j * Math.log(p) + (n - j) * Math.log(1 - p));
  }
  return Math.min(1, Math.exp(logSumExp(terms)));
}

/**
 * Method-of-moments beta-binomial fit with unequal n:
 * E[Σ n_i (y_i − p)²] = p(1−p)[m + ρ(N − m)], so
 * ρ̂ = (S / (p̂(1−p̂)) − m) / (N − m), clamped to (0, 1).
 */
export function fitBetaBinomial(
  providers: readonly ProviderEmCounts[],
): BetaBinomialFit {
  const m = providers.length;
  if (m < 2) throw new Error("Need at least two providers to fit peers");
  const N = providers.reduce((sum, p) => sum + p.familyServices, 0);
  const K = providers.reduce((sum, p) => sum + p.targetServices, 0);
  const pooled = K / N;
  if (pooled <= 0 || pooled >= 1) {
    throw new Error("Pooled level-5 share must be strictly between 0 and 1");
  }
  let S = 0;
  for (const p of providers) {
    const y = p.targetServices / p.familyServices;
    S += p.familyServices * (y - pooled) ** 2;
  }
  const rhoRaw = (S / (pooled * (1 - pooled)) - m) / (N - m);
  const rho = Math.min(Math.max(rhoRaw, 1e-6), 1 - 1e-6);
  const total = (1 - rho) / rho;
  return {
    pooledShare: pooled,
    rho,
    alpha: pooled * total,
    beta: (1 - pooled) * total,
  };
}

/** Benjamini-Hochberg adjusted q-values, same order as input. */
export function benjaminiHochberg(pValues: readonly number[]): number[] {
  const m = pValues.length;
  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const q = new Array<number>(m);
  let running = 1;
  for (let rank = m; rank >= 1; rank--) {
    const { p, i } = order[rank - 1];
    running = Math.min(running, (p * m) / rank);
    q[i] = Math.min(1, running);
  }
  return q;
}

/** Linear-interpolation quantile (type 7) of an unsorted array. */
export function quantile(values: readonly number[], prob: number): number {
  if (values.length === 0) throw new Error("quantile of empty array");
  const sorted = [...values].sort((a, b) => a - b);
  const h = (sorted.length - 1) * prob;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function summarizeQuantiles(values: readonly number[]): Quantiles {
  return {
    p10: quantile(values, 0.1),
    p25: quantile(values, 0.25),
    p50: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    p90: quantile(values, 0.9),
    p95: quantile(values, 0.95),
    p99: quantile(values, 0.99),
  };
}

/**
 * Regularized incomplete beta I_x(a, b) via the Numerical Recipes continued
 * fraction (Lentz). Accurate to ~1e-12 for the parameter ranges used here.
 */
export function regularizedIncompleteBeta(
  x: number,
  a: number,
  b: number,
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b),
  );
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(1 - x, b, a);
  }
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let f = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let num = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + num * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + num / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    f *= d * c;
    num = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + num / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return (front * f) / a;
}

/** Quantile of Beta(a, b) by bisection on the CDF. */
export function betaQuantile(prob: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) < prob) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface OutlierOptions {
  /** Minimum summed code-family services to be compared with peers. */
  minimumVolume: number;
  /** Codes that must have a visible (non-suppressed) row. */
  requiredCodes: readonly string[];
  /** Peer percentile that defines "unusually high", e.g. 0.95. */
  reviewPercentile: number;
  /** Posterior probability needed to route for review, e.g. 0.9. */
  posteriorThreshold: number;
  /** Benjamini-Hochberg level for the significance test. */
  fdrLevel: number;
}

export interface OutlierAnalysis {
  fit: BetaBinomialFit;
  /** Rate at `reviewPercentile` of the fitted peer Beta distribution. */
  reviewRate: number;
  eligible: ProviderOutlierResult[];
  belowThreshold: ProviderEmCounts[];
  incompleteDenominator: ProviderEmCounts[];
  /** Mean of (1 − posterior) among flagged: expected share of review flags whose true rate is not above the review rate. */
  estimatedFalseReviewFraction: number | null;
}

/**
 * Peer comparison with two readouts:
 * - review screen (the flag): posterior P(rate > peer p-th percentile) ≥
 *   threshold, an empirical-Bayes rule that discounts small samples and whose
 *   expected false-review fraction is reported;
 * - significance: beta-binomial upper-tail p-values with BH, plus a naive
 *   binomial test against the pooled rate for contrast.
 */
export function analyzeTargetShareOutliers(
  providers: readonly ProviderEmCounts[],
  options: OutlierOptions,
): OutlierAnalysis {
  const belowThreshold = providers.filter((p) =>
    p.familyServices < options.minimumVolume
  );
  const volumeOk = providers.filter((p) =>
    p.familyServices >= options.minimumVolume
  );
  const hasRequired = (p: ProviderEmCounts) =>
    options.requiredCodes.every((code) => p.codesPresent.includes(code));
  const incompleteDenominator = volumeOk.filter((p) => !hasRequired(p));
  const eligibleCounts = volumeOk.filter(hasRequired);
  const fit = fitBetaBinomial(eligibleCounts);
  const reviewRate = betaQuantile(
    options.reviewPercentile,
    fit.alpha,
    fit.beta,
  );
  const bbP = eligibleCounts.map((p) =>
    betaBinomialUpperTail(
      p.targetServices,
      p.familyServices,
      fit.alpha,
      fit.beta,
    )
  );
  const binP = eligibleCounts.map((p) =>
    binomialUpperTail(p.targetServices, p.familyServices, fit.pooledShare)
  );
  const bbQ = benjaminiHochberg(bbP);
  const binQ = benjaminiHochberg(binP);
  const eligible = eligibleCounts.map((p, i) => {
    const a = p.targetServices + fit.alpha;
    const b = p.familyServices - p.targetServices + fit.beta;
    const posterior = 1 - regularizedIncompleteBeta(reviewRate, a, b);
    return {
      ...p,
      rawShare: p.targetServices / p.familyServices,
      shrunkShare: a / (a + b),
      posteriorAboveReviewRate: posterior,
      betaBinomialP: bbP[i],
      betaBinomialQ: bbQ[i],
      binomialP: binP[i],
      binomialQ: binQ[i],
      outlierForReview: posterior >= options.posteriorThreshold,
    };
  });
  const flagged = eligible.filter((p) => p.outlierForReview);
  return {
    fit,
    reviewRate,
    eligible,
    belowThreshold,
    incompleteDenominator,
    estimatedFalseReviewFraction: flagged.length
      ? flagged.reduce((sum, p) => sum + (1 - p.posteriorAboveReviewRate), 0) /
        flagged.length
      : null,
  };
}

/** Salted, non-reversible pseudonym. The salt must never be committed. */
export function pseudonymize(npi: string, salt: string): string {
  if (salt.length < 32) throw new Error("Pseudonym salt is too short");
  return createHmac("sha256", salt).update(npi).digest("hex").slice(0, 12);
}

export const VOLUME_BANDS = [
  { label: "<100", low: 0, high: 100 },
  { label: "100-249", low: 100, high: 250 },
  { label: "250-499", low: 250, high: 500 },
  { label: "500-999", low: 500, high: 1000 },
  { label: "1000+", low: 1000, high: Number.POSITIVE_INFINITY },
] as const;

export function volumeBand(familyServices: number): string {
  const band = VOLUME_BANDS.find((b) =>
    familyServices >= b.low && familyServices < b.high
  );
  if (!band) throw new Error(`No volume band for ${familyServices}`);
  return band.label;
}

/** Lower bound of the 10-point share band (0.0, 0.1, …, 0.9). */
export function shareBandLow(share: number): number {
  return Math.min(0.9, Math.floor(share * 10 + 1e-9) / 10);
}

/** Coarse bucket for the review-screen posterior probability. */
export function posteriorBucket(
  posterior: number,
): ">=0.9" | "0.5-0.9" | "<0.5" {
  if (posterior >= 0.9) return ">=0.9";
  if (posterior >= 0.5) return "0.5-0.9";
  return "<0.5";
}
