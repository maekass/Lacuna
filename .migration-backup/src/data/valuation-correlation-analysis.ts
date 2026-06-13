/**
 * Valuation Correlation Analysis
 *
 * Analyzes correlation between evidence maturity and acquisition multiples.
 * Answers: Does clinical evidence predict valuation premium?
 */

import { EvidenceMaturityScore } from "./evidence-maturity-calculator";

export interface CompanyValuationData {
  companyId: string;
  companyName: string;
  sector: string;
  stage: string;
  acquisitionDate?: string;
  dealValue?: number;
  revenueAtAcquisition?: number;
  multiple?: number; // EV/Revenue or EV/ARR
  evidenceScore: EvidenceMaturityScore;
}

export interface CorrelationResult {
  sampleSize: number;
  correlationCoefficient: number; // Pearson r
  rSquared: number;
  pValue?: number;
  interpretation: string;

  // Segment analysis
  highEvidenceMultiple: number; // Avg multiple for score >75
  lowEvidenceMultiple: number; // Avg multiple for score <25
  evidencePremium: number; // Ratio of high/low

  // Regression results
  regression: {
    intercept: number;
    evidenceSlope: number;
    sectorEffects: Map<string, number>;
    stageEffects: Map<string, number>;
  };

  // Insights
  insights: string[];
  recommendations: string[];
}

export interface SegmentAnalysis {
  segment: string;
  count: number;
  avgEvidenceScore: number;
  avgMultiple: number;
  evidenceMultipleCorrelation: number;
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Perform simple linear regression
 */
function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  const correlation = calculateCorrelation(x, y);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const stdX = Math.sqrt(
    x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) / n,
  );
  const stdY = Math.sqrt(
    y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0) / n,
  );

  const slope = correlation * (stdY / stdX);
  const intercept = meanY - slope * meanX;

  return { slope, intercept, r2: correlation * correlation };
}

/**
 * Calculate sector effects (fixed effects)
 */
function calculateSectorEffects(
  data: CompanyValuationData[],
): Map<string, number> {
  const sectorMultiples = new Map<string, number[]>();

  for (const d of data) {
    if (!d.multiple) continue;
    const arr = sectorMultiples.get(d.sector) || [];
    arr.push(d.multiple);
    sectorMultiples.set(d.sector, arr);
  }

  const effects = new Map<string, number>();
  const grandMean =
    data.filter((d) => d.multiple).reduce((sum, d) => sum + d.multiple!, 0) /
    data.filter((d) => d.multiple).length;

  for (const [sector, multiples] of sectorMultiples) {
    const sectorMean = multiples.reduce((a, b) => a + b, 0) / multiples.length;
    effects.set(sector, sectorMean - grandMean);
  }

  return effects;
}

/**
 * Calculate stage effects
 */
function calculateStageEffects(
  data: CompanyValuationData[],
): Map<string, number> {
  const stageMultiples = new Map<string, number[]>();

  for (const d of data) {
    if (!d.multiple) continue;
    const arr = stageMultiples.get(d.stage) || [];
    arr.push(d.multiple);
    stageMultiples.set(d.stage, arr);
  }

  const effects = new Map<string, number>();
  const grandMean =
    data.filter((d) => d.multiple).reduce((sum, d) => sum + d.multiple!, 0) /
    data.filter((d) => d.multiple).length;

  for (const [stage, multiples] of stageMultiples) {
    const stageMean = multiples.reduce((a, b) => a + b, 0) / multiples.length;
    effects.set(stage, stageMean - grandMean);
  }

  return effects;
}

/**
 * Main correlation analysis function
 */
export function analyzeValuationCorrelation(
  data: CompanyValuationData[],
): CorrelationResult {
  // Filter valid data points
  const validData = data.filter((d) =>
    d.multiple !== undefined &&
    d.multiple !== null &&
    !isNaN(d.evidenceScore.overallScore)
  );

  const n = validData.length;

  if (n < 3) {
    return {
      sampleSize: n,
      correlationCoefficient: 0,
      rSquared: 0,
      interpretation: "Insufficient data for correlation analysis (n < 3)",
      highEvidenceMultiple: 0,
      lowEvidenceMultiple: 0,
      evidencePremium: 0,
      regression: {
        intercept: 0,
        evidenceSlope: 0,
        sectorEffects: new Map(),
        stageEffects: new Map(),
      },
      insights: [
        "Need at least 3 acquisitions with known multiples to analyze correlation",
      ],
      recommendations: [
        "Collect more acquisition data with disclosed valuations",
      ],
    };
  }

  // Extract arrays for analysis
  const evidenceScores = validData.map((d) => d.evidenceScore.overallScore);
  const multiples = validData.map((d) => d.multiple!);

  // Calculate correlation
  const correlation = calculateCorrelation(evidenceScores, multiples);
  const regression = linearRegression(evidenceScores, multiples);

  // Segment analysis
  const highEvidence = validData.filter((d) =>
    d.evidenceScore.overallScore >= 75
  );
  const lowEvidence = validData.filter((d) =>
    d.evidenceScore.overallScore < 25
  );

  const highEvidenceMultiple = highEvidence.length > 0
    ? highEvidence.reduce((sum, d) => sum + d.multiple!, 0) /
      highEvidence.length
    : 0;

  const lowEvidenceMultiple = lowEvidence.length > 0
    ? lowEvidence.reduce((sum, d) => sum + d.multiple!, 0) / lowEvidence.length
    : 0;

  const evidencePremium = lowEvidenceMultiple > 0
    ? highEvidenceMultiple / lowEvidenceMultiple
    : 0;

  // Calculate fixed effects
  const sectorEffects = calculateSectorEffects(validData);
  const stageEffects = calculateStageEffects(validData);

  // Generate insights
  const insights = generateInsights(
    correlation,
    evidencePremium,
    highEvidence.length,
    lowEvidence.length,
    n,
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    correlation,
    regression.slope,
    evidencePremium,
  );

  return {
    sampleSize: n,
    correlationCoefficient: correlation,
    rSquared: regression.r2,
    interpretation: interpretCorrelation(correlation),
    highEvidenceMultiple,
    lowEvidenceMultiple,
    evidencePremium,
    regression: {
      intercept: regression.intercept,
      evidenceSlope: regression.slope,
      sectorEffects,
      stageEffects,
    },
    insights,
    recommendations,
  };
}

function generateInsights(
  correlation: number,
  premium: number,
  highEvidenceCount: number,
  lowEvidenceCount: number,
  totalCount: number,
): string[] {
  const insights: string[] = [];

  if (correlation > 0.5) {
    insights.push(
      `Strong positive correlation (r = ${
        correlation.toFixed(2)
      }): Higher evidence maturity predicts higher multiples`,
    );
  } else if (correlation > 0.3) {
    insights.push(
      `Moderate positive correlation (r = ${
        correlation.toFixed(2)
      }): Evidence maturity associated with valuation premium`,
    );
  } else if (correlation > 0) {
    insights.push(
      `Weak positive correlation (r = ${
        correlation.toFixed(2)
      }): Evidence-valuation relationship exists but is noisy`,
    );
  } else {
    insights.push(
      `No evidence-valuation correlation detected (r = ${
        correlation.toFixed(2)
      })`,
    );
  }

  if (premium > 2) {
    insights.push(
      `Evidence premium: ${
        premium.toFixed(1)
      }x multiple for high vs low evidence companies`,
    );
  }

  insights.push(
    `Sample composition: ${highEvidenceCount} high evidence, ${lowEvidenceCount} low evidence (n=${totalCount})`,
  );

  return insights;
}

function generateRecommendations(
  correlation: number,
  slope: number,
  premium: number,
): string[] {
  const recs: string[] = [];

  if (correlation > 0.5) {
    recs.push(
      "Prioritize companies with Phase 2+ trials for premium valuations",
    );
    recs.push(
      "Factor evidence score into valuation models - each 10-point increase adds ~" +
        (slope * 10).toFixed(1) + "x multiple",
    );
  }

  if (premium < 1.5 && correlation > 0.3) {
    recs.push(
      "Evidence premium appears compressed - potential alpha in evidence-rich targets",
    );
  }

  recs.push(
    "Monitor clinical trial readouts as leading indicators of valuation inflection points",
  );

  return recs;
}

function interpretCorrelation(r: number): string {
  const absR = Math.abs(r);
  if (absR >= 0.7) {
    return "Strong " + (r > 0 ? "positive" : "negative") + " correlation";
  }
  if (absR >= 0.5) {
    return "Moderate " + (r > 0 ? "positive" : "negative") + " correlation";
  }
  if (absR >= 0.3) {
    return "Weak " + (r > 0 ? "positive" : "negative") + " correlation";
  }
  return "Negligible correlation";
}

/**
 * Analyze by segment
 */
export function analyzeBySegment(
  data: CompanyValuationData[],
  segmentKey: "sector" | "stage",
): SegmentAnalysis[] {
  const segments = new Map<string, CompanyValuationData[]>();

  for (const d of data) {
    const key = d[segmentKey];
    const arr = segments.get(key) || [];
    arr.push(d);
    segments.set(key, arr);
  }

  const results: SegmentAnalysis[] = [];

  for (const [segment, companies] of segments) {
    const validData = companies.filter((d) => d.multiple !== undefined);
    if (validData.length < 2) continue;

    const avgEvidence = validData.reduce((sum, d) =>
      sum + d.evidenceScore.overallScore, 0) / validData.length;
    const avgMultiple = validData.reduce((sum, d) =>
      sum + d.multiple!, 0) / validData.length;

    const evidenceScores = validData.map((d) =>
      d.evidenceScore.overallScore
    );
    const multiples = validData.map((d) => d.multiple!);
    const correlation = calculateCorrelation(evidenceScores, multiples);

    results.push({
      segment,
      count: validData.length,
      avgEvidenceScore: avgEvidence,
      avgMultiple,
      evidenceMultipleCorrelation: correlation,
    });
  }

  return results.sort((a, b) =>
    b.evidenceMultipleCorrelation - a.evidenceMultipleCorrelation
  );
}

/**
 * Predict multiple from evidence score
 */
export function predictMultiple(
  evidenceScore: number,
  regression: CorrelationResult["regression"],
  sector?: string,
  stage?: string,
): number {
  let prediction = regression.intercept +
    regression.evidenceSlope * evidenceScore;

  if (sector && regression.sectorEffects.has(sector)) {
    prediction += regression.sectorEffects.get(sector)!;
  }

  if (stage && regression.stageEffects.has(stage)) {
    prediction += regression.stageEffects.get(stage)!;
  }

  return Math.max(0.5, prediction); // Floor at 0.5x
}

export const valuationCorrelationAnalysis = {
  analyze: analyzeValuationCorrelation,
  analyzeBySegment,
  predictMultiple,
};
