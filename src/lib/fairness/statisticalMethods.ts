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

import {
  logGamma,
  normalCdf as normalCDF,
  normalQuantile as inverseNormalCDF,
} from "@/lib/stats/primitives";
import { benjaminiHochberg, type PValuedTest } from "@/lib/stats/fdr";

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
  correctedOddsRatio: number;
  pValue: number;
  interpretation: string;
} {
  const n = a + b + c + d;

  if (n === 0) {
    return {
      oddsRatio: 1,
      correctedOddsRatio: 1,
      pValue: 1,
      interpretation: "No data",
    };
  }

  const numerator = a * d;
  const denominator = b * c;
  const oddsRatio = denominator === 0
    ? (numerator > 0 ? Infinity : 1)
    : numerator / denominator;
  const correctedOddsRatio = (a + 0.5) * (d + 0.5) /
    ((b + 0.5) * (c + 0.5));

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

  return { oddsRatio, correctedOddsRatio, pValue, interpretation };
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

    if (logProb <= observedLogProb + Math.log1p(1e-7)) {
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
  return n <= 1 ? 0 : logGamma(n + 1);
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
  const tests: PValuedTest[] = pValues.map((pValue, index) => ({
    label: String(index),
    pValue,
  }));
  const corrected = benjaminiHochberg(tests, fdr);
  const significant = new Array(pValues.length).fill(false);
  const criticalValues = new Array(pValues.length).fill(0);
  for (const result of corrected) {
    const index = Number(result.label);
    significant[index] = result.significant;
    criticalValues[index] = (result.rank / pValues.length) * fdr;
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
 * Prospective sensitivity analysis for a two-sample proportion comparison.
 *
 * Returns the minimum detectable difference at 80% prospective power rather
 * than post-hoc observed power, which is a deterministic transform of the
 * observed p-value and is not useful for interpreting that same result.
 */
export function powerAnalysis(
  p1: number,
  p2: number,
  n1: number,
  n2: number,
  alpha: number = 0.05,
): {
  minimumDetectableDifference: number;
  recommendedSampleSize: number;
  interpretation: string;
} {
  const zAlpha = inverseNormalCDF(1 - alpha / 2); // Two-sided
  const observedDifference = Math.abs(p1 - p2);
  const totalN = Math.max(1, n1 + n2);
  const pooledP = (p1 * n1 + p2 * n2) / totalN;
  const pooledVariance = pooledP * (1 - pooledP);
  const pooledSe = Math.sqrt(
    pooledVariance / Math.max(1, n1) +
      pooledVariance / Math.max(1, n2),
  );
  const zBeta80 = 0.8416;
  const minimumDetectableDifference = (zAlpha + zBeta80) * pooledSe;

  // Sample size needed for 80% power to detect the observed difference
  const recommendedSampleSize = observedDifference > 0
    ? Math.ceil(
      2 * Math.pow((zAlpha + zBeta80) / observedDifference, 2) *
        pooledVariance,
    )
    : Infinity;

  const interpretation = observedDifference >= minimumDetectableDifference
    ? "Observed difference exceeds the prospective minimum detectable difference"
    : "Observed difference is below the prospective minimum detectable difference";

  return {
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
  const ridge = 1e-4;
  const logLikelihood = (coefficients: number[]): number =>
    Xi.reduce((sum, row, i) => {
      const probability = sigmoid(dotProduct(row, coefficients));
      return sum +
        y[i] * Math.log(Math.max(1e-15, probability)) +
        (1 - y[i]) * Math.log(Math.max(1e-15, 1 - probability));
    }, 0);

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
    for (let j = 1; j < pi; j++) {
      gradient[j] -= ridge * beta[j];
      hessian[j][j] -= ridge;
    }

    // Newton-Raphson update: beta = beta - H^-1 * g.
    const update = solveLinearSystem(hessian, gradient.map((g) => -g));
    if (!update) break;

    const currentLikelihood = logLikelihood(beta);
    let step = 1;
    let newBeta = beta.map((b, i) => b + update[i]);
    while (
      step > 1 / 1024 &&
      (!newBeta.every(Number.isFinite) ||
        logLikelihood(newBeta) < currentLikelihood)
    ) {
      step /= 2;
      newBeta = beta.map((b, i) => b + step * update[i]);
    }
    if (
      !newBeta.every(Number.isFinite) ||
      logLikelihood(newBeta) < currentLikelihood
    ) {
      break;
    }

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
  for (let j = 1; j < pi; j++) {
    informationMatrix[j][j] += ridge;
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

export { inverseNormalCDF, normalCDF };
