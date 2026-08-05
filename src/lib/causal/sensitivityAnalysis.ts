/**
 * Sensitivity Analysis Framework for Causal Inference
 *
 * Implements:
 * - Oster's Delta: Measures robustness to unobserved confounding
 * - Rotnitzky Bounds: Bounds on treatment effects under confounding
 *
 * Based on:
 * - Oster (2019): "Unobservable Selection and Coefficient Stability"
 * - Rotnitzky et al. (2001): "Inverse Probability Weighted Estimation"
 *
 * TRANSPARENCY PRINCIPLE: Always report what assumptions would need to be true
 */

export interface SensitivityConfig {
  treatmentVariable: string;
  outcomeVariable: string;
  measuredConfounders: string[];
  treatmentEffectWithConfounders: number; // ATE_measured (β1)
  treatmentEffectNaive: number; // ATE_naive (β0)
  rSquaredFull: number; // R² with all confounders
  rSquaredPartial: number; // R² with treatment only
  outcomeVariance: number;
  sampleSize: number;
}

export interface OsterDeltaResult {
  delta: number; // Ratio of unobserved to observed confounder strength
  interpretation: string;
  robustnessThreshold: number; // Typically 1.0 or 2.0
  isRobust: boolean;
  criticalDelta: number; // Delta needed to flip result
  explanation: string;
}

export interface RotnitzkyBounds {
  lowerBound: number;
  upperBound: number;
  pointEstimate: number;
  biasRange: [number, number];
  interpretation: string;
}

export interface SensitivityReport {
  oster: OsterDeltaResult;
  rotnitzky: RotnitzkyBounds;
  summary: string;
  transparencyStatement: string;
  recommendations: string[];
}

/**
 * Calculate Oster's Delta
 *
 * Delta measures how much stronger the unobserved confounder would need to be
 * compared to the observed confounders to explain away the treatment effect.
 *
 * Formula: δ = (β1 - β0)² / (R²_full - R²_partial) × Var(Y|X,Z) / Var(U)
 *
 * Where:
 * - β1 = ATE with measured confounders
 * - β0 = ATE naive (no confounders)
 * - R²_full = R-squared with all observed confounders
 * - R²_partial = R-squared with treatment only
 */
export function calculateOsterDelta(
  config: SensitivityConfig,
): OsterDeltaResult {
  const {
    treatmentEffectWithConfounders: beta1,
    treatmentEffectNaive: beta0,
    rSquaredFull,
    rSquaredPartial,
    outcomeVariance,
  } = config;

  // Calculate coefficient movement
  const coefficientMovement = Math.abs(beta1 - beta0);

  // Calculate R² movement
  const rSquaredMovement = rSquaredFull - rSquaredPartial;

  if (rSquaredMovement <= 0) {
    return {
      delta: Infinity,
      interpretation:
        "No coefficient movement detected - model may be misspecified",
      robustnessThreshold: 1.0,
      isRobust: false,
      criticalDelta: 1.0,
      explanation:
        "R² did not increase when adding confounders. Check model specification.",
    };
  }

  // Oster's delta calculation
  // Delta = (coefficient movement)² / (R² movement)
  // This is the ratio of unobserved to observed confounder strength
  const delta = (coefficientMovement ** 2) /
    (rSquaredMovement * outcomeVariance);

  // Standard robustness threshold: delta > 1 means robust
  // Conservative threshold: delta > 2 means robust
  const robustnessThreshold = 1.0;
  const isRobust = delta > robustnessThreshold;

  // Calculate critical delta (what would flip the result)
  // If beta1 is the estimated effect, critical delta is what would make it zero
  const criticalDelta = (beta1 ** 2) / (rSquaredFull * outcomeVariance);

  // Generate interpretation
  let interpretation: string;
  let explanation: string;

  if (delta > 3) {
    interpretation = "Highly robust to unobserved confounding";
    explanation = `An unobserved confounder would need to be ${
      delta.toFixed(2)
    }x stronger than all observed confounders combined to explain away the treatment effect. This is implausibly large.`;
  } else if (delta > 1.5) {
    interpretation = "Moderately robust to unobserved confounding";
    explanation = `An unobserved confounder would need to be ${
      delta.toFixed(2)
    }x stronger than observed confounders to nullify the result. This is possible but unlikely.`;
  } else if (delta > 0.5) {
    interpretation = "Potentially fragile - further investigation needed";
    explanation = `An unobserved confounder only ${
      delta.toFixed(2)
    }x as strong as observed confounders could flip the result. Caution warranted.`;
  } else {
    interpretation = "Fragile to unobserved confounding";
    explanation = `A relatively weak unobserved confounder (${
      delta.toFixed(2)
    }x observed strength) could explain away the result. Do not rely on this causal claim.`;
  }

  return {
    delta: Math.round(delta * 100) / 100,
    interpretation,
    robustnessThreshold,
    isRobust,
    criticalDelta: Math.round(criticalDelta * 100) / 100,
    explanation,
  };
}

/**
 * Calculate Rotnitzky Bounds
 *
 * Provides bounds on the treatment effect under various assumptions about
 * the strength of unobserved confounding.
 *
 * The bounds account for:
 * - Maximum bias from unobserved confounding
 * - Sensitivity to selection on unobservables
 */
export function calculateRotnitzkyBounds(
  ate: number,
  standardError: number,
  rSquared: number,
  maxConfoundingStrength: number = 0.3,
): RotnitzkyBounds {
  // Calculate bias bounds based on maximum confounding strength
  // Bias = maxConfoundingStrength × SE × sqrt(1 - R²)
  const biasFactor = maxConfoundingStrength * Math.sqrt(1 - rSquared);
  const maxBias = biasFactor * standardError * 3; // 3 sigma bound

  const lowerBound = ate - maxBias;
  const upperBound = ate + maxBias;

  // Bias range for reporting
  const biasRange: [number, number] = [-maxBias, maxBias];

  // Generate interpretation
  let interpretation: string;

  if (lowerBound > 0 || upperBound < 0) {
    interpretation = `Treatment effect remains ${
      lowerBound > 0 ? "positive" : "negative"
    } even under maximum confounding (${
      maxConfoundingStrength * 100
    }% strength). Result is robust.`;
  } else if (lowerBound < 0 && upperBound > 0 && ate > 0) {
    interpretation =
      `Treatment effect could flip to negative under strong confounding. Point estimate is positive but bounds include zero and negative values.`;
  } else if (lowerBound < 0 && upperBound > 0 && ate < 0) {
    interpretation =
      `Treatment effect could flip to positive under strong confounding. Point estimate is negative but bounds include zero and positive values.`;
  } else {
    interpretation =
      "Bounds are wide - high uncertainty about true treatment effect.";
  }

  return {
    lowerBound: Math.round(lowerBound * 1000) / 1000,
    upperBound: Math.round(upperBound * 1000) / 1000,
    pointEstimate: ate,
    biasRange,
    interpretation,
  };
}

/**
 * Generate comprehensive sensitivity report
 */
export function generateSensitivityReport(
  config: SensitivityConfig,
  standardError: number,
): SensitivityReport {
  const oster = calculateOsterDelta(config);
  const rotnitzky = calculateRotnitzkyBounds(
    config.treatmentEffectWithConfounders,
    standardError,
    config.rSquaredFull,
  );

  // Generate summary
  const summary = `
Sensitivity Analysis Summary:
- Treatment Effect (with confounders): ${
    config.treatmentEffectWithConfounders.toFixed(3)
  }
- Treatment Effect (naive): ${config.treatmentEffectNaive.toFixed(3)}
- Oster's Delta: ${oster.delta} (${oster.interpretation})
- Rotnitzky Bounds: [${rotnitzky.lowerBound}, ${rotnitzky.upperBound}]
- Robustness: ${
    oster.isRobust ? "PASS" : "FAIL"
  } (threshold: ${oster.robustnessThreshold})
  `.trim();

  // Generate transparency statement
  const transparencyStatement = generateTransparencyStatement(
    config,
    oster,
    rotnitzky,
  );

  // Generate recommendations
  const recommendations = generateRecommendations(oster, rotnitzky);

  return {
    oster,
    rotnitzky,
    summary,
    transparencyStatement,
    recommendations,
  };
}

/**
 * Generate explicit transparency statement about assumptions
 */
function generateTransparencyStatement(
  _config: SensitivityConfig,
  oster: OsterDeltaResult,
  rotnitzky: RotnitzkyBounds,
): string {
  const assumptions = [
    `1. LINEARITY: We assume linear relationships between treatment, confounders, and outcome.`,
    `2. NO INTERACTION: We assume measured and unmeasured confounders do not interact.`,
    `3. COMMON SUPPORT: We assume overlap in confounder distributions across treatment groups.`,
    `4. SUTVA: We assume no interference between units (stable unit treatment value assumption).`,
    `5. UNCONFOUNDEDNESS (input-conditional): The supplied inputs produce Oster's δ = ${oster.delta}.`,
    ``,
    `WHAT WOULD NEED TO BE TRUE TO INVALIDATE OUR CLAIM:`,
    `- An unobserved confounder ${oster.delta}x stronger than ALL observed confounders combined`,
    `- Selection bias exceeding ${
      (rotnitzky.biasRange[1] / Math.abs(rotnitzky.pointEstimate) * 100)
        .toFixed(1)
    }% of the treatment effect`,
    `- Systematic measurement error in treatment assignment exceeding ${
      (0.1 * 100).toFixed(0)
    }%`,
    ``,
    `INPUT-CONDITIONAL INTERPRETATION: ${
      oster.isRobust
        ? "Under these supplied inputs, the sensitivity calculation is relatively robust to the modeled confounding scenario."
        : "Under these supplied inputs, the sensitivity calculation is potentially fragile and should be treated cautiously."
    }`,
  ];

  return assumptions.join("\n");
}

/**
 * Generate actionable recommendations based on sensitivity analysis
 */
function generateRecommendations(
  oster: OsterDeltaResult,
  _rotnitzky: RotnitzkyBounds,
): string[] {
  const recommendations: string[] = [];

  if (!oster.isRobust) {
    recommendations.push(
      "Consider collecting additional confounder data; supplied inputs may not represent the target population",
      "Consider propensity score matching or inverse probability weighting",
      "Run placebo tests to assess specification validity",
      'Report results as "associational" rather than "causal" until robustness improves',
    );
  } else if (oster.delta < 2) {
    recommendations.push(
      "MODERATE: The supplied inputs are somewhat robust but sensitive to strong confounding",
      "Conduct additional sensitivity analyses with different confounder sets",
      "Consider bounding approaches for reporting uncertainty",
      "Collect qualitative data to assess plausibility of unobserved confounders",
    );
  } else {
    recommendations.push(
      "STRONG: Under the supplied inputs, results are robust to the modeled levels of unobserved confounding",
      "Still report sensitivity bounds in all publications",
      'Consider this result as "preliminary causal evidence" pending replication',
      "Document the sensitivity analysis methodology for transparency",
    );
  }

  // Always include these
  recommendations.push(
    "Report Oster's δ and Rotnitzky bounds in all tables/figures",
    "Conduct falsification tests with negative control outcomes",
    "Share analysis code and data for reproducibility",
  );

  return recommendations;
}

/**
 * Example usage for FemTech investment analysis
 */
export function exampleFemTechAnalysis(): SensitivityReport {
  const config: SensitivityConfig = {
    treatmentVariable: "digital_health_intervention",
    outcomeVariable: "maternal_mortality_reduction",
    measuredConfounders: ["age", "income", "insurance_status", "comorbidities"],
    treatmentEffectWithConfounders: -0.15, // 15% mortality reduction
    treatmentEffectNaive: -0.25, // 25% without confounders
    rSquaredFull: 0.65,
    rSquaredPartial: 0.45,
    outcomeVariance: 1.0,
    sampleSize: 5000,
  };

  const standardError = 0.03;

  return generateSensitivityReport(config, standardError);
}

/**
 * Calculate bounds for different confounding scenarios
 */
export function scenarioBounds(
  ate: number,
  se: number,
  r2: number,
): Array<
  { scenario: string; maxConfounding: number; bounds: RotnitzkyBounds }
> {
  const scenarios = [
    { name: "Weak confounding", strength: 0.1 },
    { name: "Moderate confounding", strength: 0.3 },
    { name: "Strong confounding", strength: 0.5 },
    { name: "Extreme confounding", strength: 0.8 },
  ];

  return scenarios.map((s) => ({
    scenario: s.name,
    maxConfounding: s.strength,
    bounds: calculateRotnitzkyBounds(ate, se, r2, s.strength),
  }));
}

/**
 * Visual representation of sensitivity (for dashboards)
 */
export interface SensitivityVisualization {
  osterPlot: {
    delta: number;
    threshold: number;
    criticalDelta: number;
    zone: "robust" | "moderate" | "fragile";
  };
  boundsPlot: {
    pointEstimate: number;
    confidenceInterval: [number, number];
    rotnitzkyBounds: [number, number];
    worstCaseScenario: number;
  };
}

export function generateVisualizationData(
  config: SensitivityConfig,
  se: number,
): SensitivityVisualization {
  const oster = calculateOsterDelta(config);
  const rotnitzky = calculateRotnitzkyBounds(
    config.treatmentEffectWithConfounders,
    se,
    config.rSquaredFull,
  );

  const zone: "robust" | "moderate" | "fragile" = oster.delta > 2
    ? "robust"
    : oster.delta > 1
    ? "moderate"
    : "fragile";

  return {
    osterPlot: {
      delta: oster.delta,
      threshold: oster.robustnessThreshold,
      criticalDelta: oster.criticalDelta,
      zone,
    },
    boundsPlot: {
      pointEstimate: config.treatmentEffectWithConfounders,
      confidenceInterval: [
        config.treatmentEffectWithConfounders - 1.96 * se,
        config.treatmentEffectWithConfounders + 1.96 * se,
      ],
      rotnitzkyBounds: [rotnitzky.lowerBound, rotnitzky.upperBound],
      worstCaseScenario: rotnitzky.biasRange[1],
    },
  };
}
