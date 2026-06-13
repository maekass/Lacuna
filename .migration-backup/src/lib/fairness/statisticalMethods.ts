/**
 * Rigorous Statistical Methods for Fairness Audit
 *
 * Implements:
 * - Bonferroni correction for multiple testing
 * - Wilson confidence intervals for proportions (better than normal approximation for small n)
 * - Fisher's exact test (better than chi-square for small samples)
 * - Statistical power analysis (Cohen's h for proportion differences)
 * - Confounder adjustment via stratification
 *
 * References:
 * - Wilson, E.B. (1927). "Probable inference, the law of succession, and statistical inference"
 * - Fisher, R.A. (1922). "On the interpretation of χ² from contingency tables"
 * - Cohen, J. (1988). "Statistical Power Analysis for the Behavioral Sciences"
 */

/**
 * Wilson confidence interval for a single proportion
 * More accurate than normal approximation for small samples
 *
 * @param successes - Number of successes
 * @param trials - Total number of trials
 * @param confidence - Confidence level (default 0.95)
 * @returns [lower, upper] bounds
 */
export function wilsonConfidenceInterval(
  successes: number,
  trials: number,
  confidence: number = 0.95,
): [number, number] {
  if (trials === 0) return [0, 1];

  const p = successes / trials;
  const z = inverseNormalCDF(0.5 + confidence / 2); // 1.96 for 95%
  const z2 = z * z;

  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const margin =
    (z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials))) /
    denominator;

  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin),
  ];
}

/**
 * Difference in proportions confidence interval (Newcombe's method)
 * Better than normal approximation for small samples
 */
export function proportionDifferenceCI(
  successes1: number,
  trials1: number,
  successes2: number,
  trials2: number,
  confidence: number = 0.95,
): {
  difference: number;
  lower: number;
  upper: number;
  standardError: number;
} {
  const p1 = trials1 > 0 ? successes1 / trials1 : 0;
  const p2 = trials2 > 0 ? successes2 / trials2 : 0;
  const difference = p1 - p2;

  // Wilson intervals for each proportion
  const [l1, u1] = wilsonConfidenceInterval(successes1, trials1, confidence);
  const [l2, u2] = wilsonConfidenceInterval(successes2, trials2, confidence);

  // Newcombe's hybrid score method
  const lower = difference - Math.sqrt(
    Math.pow(p1 - l1, 2) + Math.pow(u2 - p2, 2),
  );
  const upper = difference + Math.sqrt(
    Math.pow(u1 - p1, 2) + Math.pow(p2 - l2, 2),
  );

  // Standard error (for power calculations)
  const standardError = Math.sqrt(
    (p1 * (1 - p1)) / Math.max(1, trials1) +
      (p2 * (1 - p2)) / Math.max(1, trials2),
  );

  return {
    difference,
    lower: Math.max(-1, lower),
    upper: Math.min(1, upper),
    standardError,
  };
}

/**
 * Fisher's exact test for 2x2 contingency tables
 * Use this instead of chi-square when expected counts < 5
 *
 * Table:
 *           Outcome+   Outcome-
 *  Group1    a          b
 *  Group2    c          d
 */
export function fishersExactTest(a: number, b: number, c: number, d: number): {
  oddsRatio: number;
  pValue: number;
  interpretation: string;
} {
  const n = a + b + c + d;

  if (n === 0) {
    return { oddsRatio: 1, pValue: 1, interpretation: "No data" };
  }

  // Odds ratio
  const oddsRatio = (a * d) / Math.max(1, b * c);

  // Calculate p-value using hypergeometric distribution
  const pValue = calculateFishersPValue(a, b, c, d);

  let interpretation: string;
  if (pValue < 0.01) {
    interpretation = "Strong evidence of association";
  } else if (pValue < 0.05) {
    interpretation = "Some evidence of association";
  } else if (pValue < 0.10) {
    interpretation = "Weak evidence; sample may be too small";
  } else {
    interpretation = "No significant association detected";
  }

  return { oddsRatio, pValue, interpretation };
}

function calculateFishersPValue(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  // Using hypergeometric distribution
  const n = a + b + c + d;
  const row1 = a + b;
  const col1 = a + c;

  // Simplified calculation - sum probabilities of more extreme tables
  let pValue = 0;
  const minA = Math.max(0, row1 - (n - col1));
  const maxA = Math.min(row1, col1);

  const observedLogProb = logHypergeometric(a, b, c, d);

  for (let i = minA; i <= maxA; i++) {
    const newA = i;
    const newB = row1 - newA;
    const newC = col1 - newA;
    const newD = n - newA - newB - newC;

    if (newB < 0 || newC < 0 || newD < 0) continue;

    const logProb = logHypergeometric(newA, newB, newC, newD);

    if (logProb <= observedLogProb) {
      pValue += Math.exp(logProb);
    }
  }

  return Math.min(1, pValue);
}

function logHypergeometric(a: number, b: number, c: number, d: number): number {
  return logFactorial(a + b) + logFactorial(c + d) +
    logFactorial(a + c) + logFactorial(b + d) -
    logFactorial(a + b + c + d) -
    logFactorial(a) - logFactorial(b) -
    logFactorial(c) - logFactorial(d);
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let sum = 0;
  for (let i = 2; i <= n; i++) {
    sum += Math.log(i);
  }
  return sum;
}

/**
 * Bonferroni correction for multiple testing
 * Adjusts alpha level when running multiple tests
 */
export function bonferroniCorrection(
  pValues: number[],
  alpha: number = 0.05,
): {
  adjustedAlpha: number;
  significantTests: boolean[];
  numTests: number;
  numSignificant: number;
} {
  const numTests = pValues.length;
  const adjustedAlpha = alpha / numTests;
  const significantTests = pValues.map((p) => p < adjustedAlpha);
  const numSignificant = significantTests.filter((s) => s).length;

  return {
    adjustedAlpha,
    significantTests,
    numTests,
    numSignificant,
  };
}

/**
 * Benjamini-Hochberg FDR correction
 * Less conservative than Bonferroni, controls false discovery rate
 */
export function benjaminiHochbergCorrection(
  pValues: number[],
  fdr: number = 0.05,
): {
  significantTests: boolean[];
  criticalValues: number[];
  numSignificant: number;
} {
  const n = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, originalIndex: i }));
  indexed.sort((a, b) => a.p - b.p);

  const significant: boolean[] = new Array(n).fill(false);
  const criticalValues: number[] = new Array(n);

  let largestSignificantRank = -1;
  for (let i = 0; i < n; i++) {
    const rank = i + 1;
    const criticalValue = (rank / n) * fdr;
    criticalValues[indexed[i].originalIndex] = criticalValue;

    if (indexed[i].p <= criticalValue) {
      largestSignificantRank = i;
    }
  }

  // All tests up to largest significant are considered significant
  for (let i = 0; i <= largestSignificantRank; i++) {
    significant[indexed[i].originalIndex] = true;
  }

  return {
    significantTests: significant,
    criticalValues,
    numSignificant: significant.filter((s) => s).length,
  };
}

/**
 * Cohen's h - effect size for proportion differences
 * Use for power analysis with proportions
 */
export function cohenH(p1: number, p2: number): {
  h: number;
  magnitude: "small" | "medium" | "large";
} {
  const phi1 = 2 * Math.asin(Math.sqrt(p1));
  const phi2 = 2 * Math.asin(Math.sqrt(p2));
  const h = Math.abs(phi1 - phi2);

  let magnitude: "small" | "medium" | "large";
  if (h < 0.2) magnitude = "small";
  else if (h < 0.5) magnitude = "medium";
  else magnitude = "large";

  return { h, magnitude };
}

/**
 * Statistical power analysis for proportion test
 * Returns the probability of correctly rejecting null hypothesis
 */
export function powerAnalysis(
  p1: number,
  p2: number,
  n1: number,
  n2: number,
  alpha: number = 0.05,
): {
  power: number;
  minimumDetectableDifference: number;
  recommendedSampleSize: number;
  interpretation: string;
} {
  cohenH(p1, p2);

  // Standard error under alternative hypothesis
  const se = Math.sqrt(
    (p1 * (1 - p1)) / Math.max(1, n1) +
      (p2 * (1 - p2)) / Math.max(1, n2),
  );

  const zAlpha = inverseNormalCDF(1 - alpha / 2); // Two-sided
  const observedDifference = Math.abs(p1 - p2);

  // Power = P(reject H0 | H1 true)
  const zBeta = (observedDifference / se) - zAlpha;
  const power = normalCDF(zBeta);

  // Minimum detectable difference at 80% power
  const zBeta80 = 0.84; // 80th percentile of standard normal
  const minimumDetectableDifference = (zAlpha + zBeta80) * se;

  // Sample size needed for 80% power to detect the observed difference
  const recommendedSampleSize = observedDifference > 0
    ? Math.ceil(
      2 * Math.pow((zAlpha + zBeta80) / observedDifference, 2) * p1 * (1 - p1),
    )
    : Infinity;

  let interpretation: string;
  if (power >= 0.8) {
    interpretation = "Adequate power to detect this effect";
  } else if (power >= 0.5) {
    interpretation = "Moderate power; results uncertain";
  } else if (power >= 0.2) {
    interpretation = "Low power; null results inconclusive";
  } else {
    interpretation = "Very low power; cannot reliably detect effects";
  }

  return {
    power: Math.max(0, Math.min(1, power)),
    minimumDetectableDifference,
    recommendedSampleSize,
    interpretation,
  };
}

/**
 * Logistic regression coefficient estimation (simplified Newton-Raphson)
 * For controlling confounders
 */
export interface LogisticRegressionResult {
  coefficients: number[];
  standardErrors: number[];
  pValues: number[];
  oddsRatios: number[];
  confidenceIntervals: Array<[number, number]>;
  converged: boolean;
  iterations: number;
}

export function logisticRegression(
  X: number[][], // n x p matrix
  y: number[], // n length vector (0/1)
  maxIterations: number = 100,
  tolerance: number = 1e-6,
): LogisticRegressionResult {
  const n = y.length;
  if (n === 0 || X.length === 0) {
    return {
      coefficients: [],
      standardErrors: [],
      pValues: [],
      oddsRatios: [],
      confidenceIntervals: [],
      converged: false,
      iterations: 0,
    };
  }

  const p = X[0].length;

  // Add intercept column
  const Xi = X.map((row) => [1, ...row]);
  const pi = p + 1;

  // Initialize coefficients
  let beta = new Array(pi).fill(0);
  let converged = false;
  let iterations = 0;

  for (iterations = 0; iterations < maxIterations; iterations++) {
    // Compute predicted probabilities
    const predictions = Xi.map((row) => sigmoid(dotProduct(row, beta)));

    // Compute gradient and Hessian
    const gradient = new Array(pi).fill(0);
    const hessian: number[][] = Array(pi).fill(null).map(() =>
      new Array(pi).fill(0)
    );

    for (let i = 0; i < n; i++) {
      const error = y[i] - predictions[i];
      const w = predictions[i] * (1 - predictions[i]);

      for (let j = 0; j < pi; j++) {
        gradient[j] += error * Xi[i][j];
        for (let k = 0; k < pi; k++) {
          hessian[j][k] -= w * Xi[i][j] * Xi[i][k];
        }
      }
    }

    // Newton-Raphson update: beta = beta - H^-1 * g
    const update = solveLinearSystem(hessian, gradient.map((g) => -g));
    if (!update) break;

    const newBeta = beta.map((b, i) => b - update[i]);

    // Check convergence
    const change = Math.max(...newBeta.map((b, i) => Math.abs(b - beta[i])));
    beta = newBeta;

    if (change < tolerance) {
      converged = true;
      break;
    }
  }

  // Calculate standard errors from inverse Hessian
  const finalPredictions = Xi.map((row) => sigmoid(dotProduct(row, beta)));
  const informationMatrix: number[][] = Array(pi).fill(null).map(() =>
    new Array(pi).fill(0)
  );

  for (let i = 0; i < n; i++) {
    const w = finalPredictions[i] * (1 - finalPredictions[i]);
    for (let j = 0; j < pi; j++) {
      for (let k = 0; k < pi; k++) {
        informationMatrix[j][k] += w * Xi[i][j] * Xi[i][k];
      }
    }
  }

  const covMatrix = invertMatrix(informationMatrix);
  const standardErrors = covMatrix
    ? covMatrix.map((row, i) => Math.sqrt(Math.abs(row[i])))
    : new Array(pi).fill(0);

  // Wald test for each coefficient
  const pValues = beta.map((b, i) => {
    const z = standardErrors[i] > 0 ? Math.abs(b / standardErrors[i]) : 0;
    return 2 * (1 - normalCDF(z));
  });

  // Odds ratios
  const oddsRatios = beta.map((b) => Math.exp(b));

  // 95% CIs for coefficients (transformed to ORs)
  const confidenceIntervals: Array<[number, number]> = beta.map((b, i) => [
    Math.exp(b - 1.96 * standardErrors[i]),
    Math.exp(b + 1.96 * standardErrors[i]),
  ]);

  return {
    coefficients: beta,
    standardErrors,
    pValues,
    oddsRatios,
    confidenceIntervals,
    converged,
    iterations,
  };
}

// Helper functions
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  if (n === 0 || A[0].length !== n || b.length !== n) return null;

  // Augment matrix
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    if (Math.abs(augmented[i][i]) < 1e-10) return null;

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  if (n === 0) return null;

  const identity: number[][] = Array(n).fill(null).map((_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  );

  const result: number[][] = [];
  for (let i = 0; i < n; i++) {
    const col = identity.map((row) => row[i]);
    const x = solveLinearSystem(matrix, col);
    if (!x) return null;
    result.push(x);
  }

  // Transpose
  return identity.map((_, i) => result.map((row) => row[i]));
}

function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function inverseNormalCDF(p: number): number {
  // Beasley-Springer-Moro algorithm
  if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;

  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
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
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03,
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
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r +
      a[5]) *
      q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
      c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

export { inverseNormalCDF, normalCDF };
