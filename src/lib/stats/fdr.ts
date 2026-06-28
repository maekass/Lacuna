/**
 * Multiple comparison corrections — Benjamini-Hochberg (BH) FDR and
 * Bonferroni, plus two-sample Welch's t-test with exact p-values.
 *
 * References:
 *   Benjamini & Hochberg (1995). J R Stat Soc B 57(1):289–300.
 *   Welch (1947). Biometrika 34(1–2):28–35.
 *   Holm (1979). Scand J Stat 6(2):65–70. (step-down Bonferroni)
 */

export interface PValuedTest {
  label: string;
  pValue: number;
}

export interface CorrectedResult extends PValuedTest {
  pAdjusted: number;
  significant: boolean;
  rank: number;
}

/**
 * Benjamini-Hochberg FDR correction.
 *
 * Procedure: sort p-values p(1) ≤ … ≤ p(m), compute adjusted
 * p̃(i) = min_{j≥i}(p(j) × m/j), 1). Reject at level q.
 *
 * Assumption: tests are independent or positively correlated (PRDS).
 */
export function benjaminiHochberg(
  tests: PValuedTest[],
  q = 0.05,
): CorrectedResult[] {
  const m = tests.length;
  if (m === 0) return [];

  // Sort by p-value ascending, keep original index for reinsertion
  const indexed = tests.map((t, i) => ({ ...t, origIdx: i }));
  indexed.sort((a, b) => a.pValue - b.pValue);

  // Compute raw BH critical values and step-down adjusted p-values
  const adjusted = new Array<number>(m);
  adjusted[m - 1] = Math.min(1, indexed[m - 1].pValue); // top rank: p unchanged
  for (let i = m - 2; i >= 0; i--) {
    adjusted[i] = Math.min(adjusted[i + 1], (indexed[i].pValue * m) / (i + 1));
  }

  return indexed.map((t, i) => ({
    label: t.label,
    pValue: t.pValue,
    pAdjusted: Math.round(adjusted[i] * 10000) / 10000,
    significant: adjusted[i] <= q,
    rank: i + 1,
  })).sort((a, b) => a.rank - b.rank);
}

/**
 * Holm-Bonferroni step-down correction (uniformly more powerful than Bonferroni).
 * Controls family-wise error rate (FWER).
 */
export function holmBonferroni(
  tests: PValuedTest[],
  alpha = 0.05,
): CorrectedResult[] {
  const m = tests.length;
  if (m === 0) return [];

  const indexed = tests.map((t, i) => ({ ...t, origIdx: i }));
  indexed.sort((a, b) => a.pValue - b.pValue);

  const adjusted = new Array<number>(m);
  for (let i = 0; i < m; i++) {
    adjusted[i] = Math.min(1, indexed[i].pValue * (m - i));
  }
  // Make monotone non-decreasing
  for (let i = 1; i < m; i++) {
    adjusted[i] = Math.max(adjusted[i], adjusted[i - 1]);
  }

  return indexed.map((t, i) => ({
    label: t.label,
    pValue: t.pValue,
    pAdjusted: Math.round(adjusted[i] * 10000) / 10000,
    significant: adjusted[i] <= alpha,
    rank: i + 1,
  }));
}

// ─── Welch's t-test ──────────────────────────────────────────────────────────

export interface TTestResult {
  meanA: number;
  meanB: number;
  diffMeans: number;
  t: number;
  df: number;
  pValue: number;
  /** Cohen's d (pooled SD) */
  cohenD: number;
  /** Minimum detectable effect at 80% power, same scale as data */
  mde80: number;
}

function mean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function variance(arr: number[]) {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/** t cumulative distribution via regularised incomplete beta function (two-tailed). */
function tPValue(t: number, df: number): number {
  if (!isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  return regularisedBetaI(df / 2, 0.5, x); // two-tailed
}

function regularisedBetaI(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return 0;
  if (x === 1) return 1;
  const lbeta = logBeta(a, b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  // Continued fraction
  const cf = betaCF(a, b, x);
  return front * cf / a;
}

function betaCF(a: number, b: number, x: number): number {
  const maxIt = 200, eps = 3e-7;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIt; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function logBeta(a: number, b: number) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}
function logGamma(z: number): number {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    1.208650973866179e-3,
    -5.395239384953e-6,
  ];
  let y = z, x = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) {
    y++;
    ser += ci / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Minimum detectable effect at power=0.80, α=0.05 (two-tailed), given n per group.
 * Returns absolute difference (unstandardised) in the same units as the data.
 *
 * MDE = (z_{α/2} + z_{1−β}) × σ_pooled × √(1/nA + 1/nB)
 * For equal n: MDE = 2.80 × σ_pooled / √n
 */
function mde80(nA: number, nB: number, sdA: number, sdB: number): number {
  const sdPooled = Math.sqrt(
    ((nA - 1) * sdA ** 2 + (nB - 1) * sdB ** 2) / (nA + nB - 2),
  );
  return 2.80 * sdPooled * Math.sqrt(1 / nA + 1 / nB); // 1.96 + 0.842 ≈ 2.80
}

/**
 * Welch's (unequal-variance) two-sample t-test.
 * Returns p-value, Cohen's d, and minimum detectable effect.
 */
export function welchTTest(groupA: number[], groupB: number[]): TTestResult {
  const nA = groupA.length, nB = groupB.length;
  const mA = mean(groupA), mB = mean(groupB);
  const vA = variance(groupA), vB = variance(groupB);
  const se = Math.sqrt(vA / nA + vB / nB);
  const t = (mA - mB) / (se || 1);

  // Welch-Satterthwaite degrees of freedom
  const df = (vA / nA + vB / nB) ** 2 /
    ((vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1));

  const pValue = tPValue(Math.abs(t), df);
  const sdPooled = Math.sqrt(((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2));
  const cohenD = (mA - mB) / (sdPooled || 1);

  return {
    meanA: mA,
    meanB: mB,
    diffMeans: mA - mB,
    t,
    df: Math.round(df * 10) / 10,
    pValue: Math.round(pValue * 10000) / 10000,
    cohenD: Math.round(cohenD * 100) / 100,
    mde80: mde80(nA, nB, Math.sqrt(vA), Math.sqrt(vB)),
  };
}

/**
 * Run pairwise Welch t-tests across groups and return BH-corrected results.
 * Groups with n < 2 are skipped.
 */
export function pairwiseTTests(
  groups: Record<string, number[]>,
  correction: "BH" | "Holm" = "BH",
): {
  pairwiseResults: Array<{ labelA: string; labelB: string } & TTestResult>;
  corrected: CorrectedResult[];
} {
  const labels = Object.keys(groups).filter((g) => groups[g].length >= 2);
  const raw: Array<{ labelA: string; labelB: string } & TTestResult> = [];

  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const result = welchTTest(groups[labels[i]], groups[labels[j]]);
      raw.push({ labelA: labels[i], labelB: labels[j], ...result });
    }
  }

  const tests = raw.map((r) => ({
    label: `${r.labelA} vs ${r.labelB}`,
    pValue: r.pValue,
  }));
  const corrected = correction === "BH"
    ? benjaminiHochberg(tests)
    : holmBonferroni(tests);

  return { pairwiseResults: raw, corrected };
}
