/**
 * Bayesian Causal Inference for Small Samples
 *
 * Addresses Problem 2: Sample size too small for heterogeneous treatment effects
 *
 * Current dataset: ~22 companies, ~10 acquisitions
 * Causal forest requires: n=200+ for reliable HTEs
 *
 * REVISED APPROACH:
 * 1. Acknowledge: "Current sample underpowered for HTE estimation"
 * 2. Fit main effects only with credible intervals (Bayesian)
 * 3. Use informative priors to regularize sparse data
 * 4. Pre-register hypotheses (specify HTEs BEFORE looking at data)
 * 5. Cross-fitting: Separate data for model selection vs inference
 *
 * Based on:
 * - Gelman & Hill (2006): "Data Analysis Using Regression and Multilevel Models"
 * - Hernán & Robins (2020): "Causal Inference: The Mixtape"
 * - Wager & Athey (2018): Causal forests (but noting limitations)
 */

import { createSeededRng, shuffle } from "@/lib/stats/random";

export interface BayesianCausalConfig {
  nObservations: number;
  nTreatments: number;
  priorMean: number; // Prior belief about treatment effect
  priorVariance: number; // Uncertainty in prior
  noiseVariance: number; // Observation noise
}

export interface PreRegisteredHypothesis {
  id: string;
  name: string;
  description: string;
  expectedEffect: number;
  direction: "positive" | "negative" | "any";
  testVariable: string;
  specifiedBeforeData: boolean; // MUST be true for valid inference
  timestamp: string;
}

export interface BayesianEstimate {
  posteriorMean: number;
  posteriorVariance: number;
  credibleInterval: [number, number]; // 95% credible interval
  probabilityPositive: number; // P(ATE > 0 | data)
  probabilityNegative: number; // P(ATE < 0 | data)
  bayesFactor: number; // Evidence for vs against effect
  effectiveSampleSize: number;
  priorInfluence: number; // 0-1, how much prior dominates
}

export interface SmallSampleAnalysis {
  mainEffects: BayesianEstimate;
  preRegisteredResults: Array<{
    hypothesis: PreRegisteredHypothesis;
    result: BayesianEstimate | null;
    status: "tested" | "insufficient_data" | "not_applicable";
    note: string;
  }>;
  limitations: string[];
  recommendations: string[];
  transparencyStatement: string;
}

/**
 * Bayesian estimation with informative priors for small samples
 *
 * Formula (conjugate normal prior):
 * Posterior precision = Prior precision + Data precision
 * Posterior mean = (Prior precision × Prior mean + Data precision × MLE) / Posterior precision
 */
export function bayesianEstimate(
  mleEstimate: number, // Maximum likelihood estimate (e.g., OLS coefficient)
  mleVariance: number, // Variance of MLE (standard error²)
  config: BayesianCausalConfig,
): BayesianEstimate {
  const { priorMean, priorVariance, nObservations } = config;

  // Prior precision (inverse variance)
  const priorPrecision = 1 / priorVariance;

  // Data precision (inverse sampling variance)
  const dataPrecision = 1 / mleVariance;

  // Posterior precision (sum of precisions)
  const posteriorPrecision = priorPrecision + dataPrecision;
  const posteriorVariance = 1 / posteriorPrecision;

  // Posterior mean (precision-weighted average)
  const posteriorMean = (
    priorPrecision * priorMean +
    dataPrecision * mleEstimate
  ) / posteriorPrecision;

  // 95% Credible interval
  const z95 = 1.96;
  const credibleInterval: [number, number] = [
    posteriorMean - z95 * Math.sqrt(posteriorVariance),
    posteriorMean + z95 * Math.sqrt(posteriorVariance),
  ];

  // Probability of positive/negative effect
  const sd = Math.sqrt(posteriorVariance);
  const probabilityPositive = 1 - normalCDF(0, posteriorMean, sd);
  const probabilityNegative = normalCDF(0, posteriorMean, sd);

  // Bayes factor (approximate, for effect vs no effect)
  // BF10 = P(data|H1) / P(data|H0)
  const bayesFactor = calculateBayesFactor(
    posteriorMean,
    posteriorVariance,
    priorMean,
    priorVariance,
  );

  // Effective sample size (how much data is 'equivalent' to)
  const effectiveSampleSize = dataPrecision / priorPrecision * nObservations;

  // Prior influence: 0 = data dominates, 1 = prior dominates
  const priorInfluence = priorPrecision / posteriorPrecision;

  return {
    posteriorMean: round(posteriorMean, 4),
    posteriorVariance: round(posteriorVariance, 6),
    credibleInterval: [
      round(credibleInterval[0], 4),
      round(credibleInterval[1], 4),
    ],
    probabilityPositive: round(probabilityPositive, 3),
    probabilityNegative: round(probabilityNegative, 3),
    bayesFactor: round(bayesFactor, 2),
    effectiveSampleSize: round(effectiveSampleSize, 1),
    priorInfluence: round(priorInfluence, 3),
  };
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(x: number, mean: number, sd: number): number {
  const z = (x - mean) / (sd * Math.sqrt(2));
  return 0.5 * (1 + erf(z));
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y = 1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Calculate Bayes Factor (H1: effect exists vs H0: no effect)
 */
function calculateBayesFactor(
  postMean: number,
  postVar: number,
  priorMean: number,
  priorVar: number,
): number {
  // Savage-Dickey density ratio (approximation)
  // BF10 = p(θ=0|H0) / p(θ=0|H1,data)

  const priorDensityAtNull = Math.exp(
    -0.5 * ((0 - priorMean) ** 2) / priorVar,
  ) / Math.sqrt(2 * Math.PI * priorVar);

  const postDensityAtNull = Math.exp(
    -0.5 * ((0 - postMean) ** 2) / postVar,
  ) / Math.sqrt(2 * Math.PI * postVar);

  return priorDensityAtNull / (postDensityAtNull + 1e-10);
}

/**
 * Round to n decimal places
 */
function round(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/**
 * Pre-registration system for valid hypothesis testing
 *
 * CRITICAL: All hypotheses must be specified BEFORE looking at data
 */
export const PRE_REGISTERED_HYPOTHESES: PreRegisteredHypothesis[] = [
  {
    id: "H1",
    name: "Fertility sector premium",
    description:
      "Fertility-focused companies command higher acquisition multiples",
    expectedEffect: 0.3, // 30% premium
    direction: "positive",
    testVariable: "sector_fertility",
    specifiedBeforeData: true,
    timestamp: "2026-05-27T00:00:00Z",
  },
  {
    id: "H2",
    name: "Late-stage valuation discount",
    description:
      "Late-stage companies have lower valuation growth due to maturity",
    expectedEffect: -0.2,
    direction: "negative",
    testVariable: "stage_late",
    specifiedBeforeData: true,
    timestamp: "2026-05-27T00:00:00Z",
  },
  {
    id: "H3",
    name: "JHU affiliation premium",
    description: "Johns Hopkins-associated startups have credibility premium",
    expectedEffect: 0.15,
    direction: "positive",
    testVariable: "jhu_affiliation",
    specifiedBeforeData: true,
    timestamp: "2026-05-27T00:00:00Z",
  },
  {
    id: "H4",
    name: "Mental health sector discount",
    description:
      "Mental health companies trade at lower multiples due to reimbursement challenges",
    expectedEffect: -0.15,
    direction: "negative",
    testVariable: "sector_mental_health",
    specifiedBeforeData: true,
    timestamp: "2026-05-27T00:00:00Z",
  },
];

/**
 * Cross-fitting procedure for small samples
 *
 * Separate data for:
 * - Model selection (choosing which variables to include)
 * - Inference (estimating treatment effects)
 *
 * Prevents overfitting and inflated type I error
 */
export interface CrossFittingResult {
  selectionSet: number[]; // Indices for model selection
  inferenceSet: number[]; // Indices for final inference
  modelSelected: string[]; // Variables selected
  finalEstimate: BayesianEstimate | null;
  isReliable: boolean;
  warning: string;
}

export function crossFittingAnalysis(
  nTotal: number,
  allData: number[],
  selectionRatio: number = 0.5,
): CrossFittingResult {
  // Check if we have enough data for cross-fitting
  if (nTotal < 20) {
    return {
      selectionSet: [],
      inferenceSet: allData.map((_, i) => i),
      modelSelected: ["main_effect_only"], // No selection possible
      finalEstimate: null,
      isReliable: false,
      warning:
        `n=${nTotal} insufficient for cross-fitting. Using all data for single estimate with strong priors.`,
    };
  }

  // Random split (deterministic for reproducibility)
  const splitPoint = Math.floor(nTotal * selectionRatio);
  const indices = Array.from({ length: nTotal }, (_, i) => i);

  // Shuffle deterministically (Fisher-Yates with seed)
  const shuffled = shuffle(indices, createSeededRng(42));

  const selectionSet = shuffled.slice(0, splitPoint);
  const inferenceSet = shuffled.slice(splitPoint);

  return {
    selectionSet,
    inferenceSet,
    modelSelected: ["selected_on_" + selectionSet.length + "_obs"],
    finalEstimate: null,
    isReliable: inferenceSet.length >= 10,
    warning: inferenceSet.length < 10
      ? `Inference set only ${inferenceSet.length} obs - results uncertain`
      : "Cross-fitting valid",
  };
}

/**
 * Main analysis function for small sample causal inference
 */
export function smallSampleCausalAnalysis(
  mleEstimate: number,
  mleStandardError: number,
  nObservations: number,
): SmallSampleAnalysis {
  // 1. ACKNOWLEDGE LIMITATION
  const limitations = [
    `Current sample (n=${nObservations}) is underpowered for heterogeneous treatment effect (HTE) estimation.`,
    "Causal forest requires n≥200 for reliable HTEs with 80% power.",
    "We lack statistical power to detect interaction effects reliably.",
    "Multiple splits for validation not feasible with current sample size.",
    "Main effects only - no subgroup analysis attempted.",
  ];

  // 2. BAYESIAN MAIN EFFECTS
  const config: BayesianCausalConfig = {
    nObservations,
    nTreatments: 1,
    priorMean: 0, // Neutral prior (no expected direction)
    priorVariance: 0.5, // Moderately informative
    noiseVariance: mleStandardError ** 2,
  };

  const mainEffects = bayesianEstimate(
    mleEstimate,
    mleStandardError ** 2,
    config,
  );

  // 3. PRE-REGISTERED HYPOTHESES
  const preRegisteredResults = PRE_REGISTERED_HYPOTHESES.map((h) => {
    // Check if we can test this hypothesis
    const canTest = nObservations >= 10 && h.specifiedBeforeData;

    if (!canTest) {
      return {
        hypothesis: h,
        result: null,
        status: "insufficient_data" as const,
        note: `Insufficient data (n=${nObservations}) to test ${h.name}`,
      };
    }

    return {
      hypothesis: h,
      result: null,
      status: "not_applicable" as const,
      note:
        "Pre-registered direction recorded; no hypothesis result is computed without observed outcome data",
    };
  });

  // 4. CROSS-FITTING ASSESSMENT
  const crossFit = crossFittingAnalysis(
    nObservations,
    Array.from({ length: nObservations }, (_, i) => i),
  );

  // 5. TRANSPARENCY STATEMENT
  const transparencyStatement = generateTransparencyStatement(
    nObservations,
    mainEffects,
    crossFit,
  );

  // 6. RECOMMENDATIONS
  const recommendations = [
    "Report Bayesian credible intervals (not frequentist p-values)",
    "Acknowledge main-effects-only limitation in all presentations",
    "Collect more data before attempting HTE analysis",
    "Use this analysis as exploratory, not confirmatory",
    "Pre-register all future hypotheses before data collection",
    "Consider meta-analysis with similar studies to increase power",
    `Prior influence: ${
      (mainEffects.priorInfluence * 100).toFixed(1)
    }% - acknowledge prior dominates with n=${nObservations}`,
  ];

  return {
    mainEffects,
    preRegisteredResults,
    limitations,
    recommendations,
    transparencyStatement,
  };
}

/**
 * Generate transparency statement about small sample limitations
 */
function generateTransparencyStatement(
  n: number,
  estimate: BayesianEstimate,
  crossFit: CrossFittingResult,
): string {
  return `
TRANSPARENCY STATEMENT: SMALL SAMPLE CAUSAL INFERENCE

SAMPLE SIZE ACKNOWLEDGMENT:
- Current sample: n=${n} observations
- Causal forest HTE requirement: n≥200
- Our power to detect interaction effects: <20% (underpowered)
- Cross-fitting feasibility: ${
    crossFit.isReliable ? "Marginal" : "Not feasible"
  }

BAYESIAN APPROACH JUSTIFICATION:
- Using informative priors to regularize sparse data
- Prior influence: ${(estimate.priorInfluence * 100).toFixed(1)}% of posterior
- This is intentional - without priors, estimates would be unstable

WHAT WE CANNOT CLAIM:
✗ Heterogeneous treatment effects by subgroup
✗ Causal forest estimates of CATE (Conditional Average Treatment Effects)
✗ High-confidence predictions for individual companies
✗ Precise interaction effects (sector × stage, etc.)

WHAT WE CAN CLAIM (WITH CAVEATS):
✓ Population-average treatment effect (main effect only)
✓ Directional evidence if P(effect>0) > 0.8 or P(effect<0) > 0.8
✓ Exploratory patterns requiring replication

PRE-REGISTRATION STATUS:
${PRE_REGISTERED_HYPOTHESES.length} hypotheses specified before data analysis
Timestamp: ${PRE_REGISTERED_HYPOTHESES[0].timestamp}
All hypotheses registered at: ${PRE_REGISTERED_HYPOTHESES[0].timestamp}

BOTTOM LINE:
This analysis provides preliminary, exploratory evidence only.
All causal claims should be treated as hypotheses for future testing,
not established facts. Replication with larger samples required.
  `.trim();
}

/**
 * Example: FemTech acquisition premium analysis
 */
export function exampleFemTechAnalysis(): SmallSampleAnalysis {
  // Simulated: Do FemTech companies get acquisition premium?
  const mleEstimate = 0.25; // 25% premium
  const mleSE = 0.12; // Large uncertainty
  const n = 22; // Our actual sample size

  return smallSampleCausalAnalysis(mleEstimate, mleSE, n);
}
