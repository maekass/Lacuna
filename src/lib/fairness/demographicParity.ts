/**
 * Demographic Parity Test (Single Fairness Metric)
 *
 * Chosen because:
 * - Simplest to interpret
 * - Most defensible with small samples
 * - Doesn't require ground truth labels
 *
 * NOT testing all three fairness metrics simultaneously - mathematically
 * impossible to satisfy all three (Kleinberg et al., 2016).
 *
 * Reference: Kleinberg, J., Mullainathan, S., & Raghavan, M. (2016).
 * "Inherent trade-offs in the fair determination of risk scores."
 */

import { normalCdf } from "@/lib/stats/primitives";

export type GenderInference = {
  founder: string;
  inferredGender: "female" | "male" | "ambiguous";
  confidence: number; // 0-1
  source: "common_name" | "context" | "self_disclosed" | "inferred";
};

export type CompanyWithFounders = {
  companyId: string;
  companyName: string;
  founders: GenderInference[];
  sector: string;
  stage: string;
  wasAcquired: boolean;
  acquisitionValue?: number;
  yearFounded: number;
  yearAcquired?: number;
};

// Gender inference quality metrics (from Gender-API documentation)
export const GENDER_INFERENCE_QUALITY = {
  overallAccuracy: 0.94, // 94% accurate
  errorRate: 0.06, // 6% error rate
  highConfidenceThreshold: 0.85,
  ambiguousNameRate: 0.12, // 12% of names are ambiguous

  // Calibrated by name origin
  byOrigin: {
    western: { accuracy: 0.96, ambiguousRate: 0.08 },
    east_asian: { accuracy: 0.88, ambiguousRate: 0.22 },
    south_asian: { accuracy: 0.85, ambiguousRate: 0.28 },
    middle_eastern: { accuracy: 0.83, ambiguousRate: 0.31 },
  },
};

export interface DemographicParityResult {
  // Descriptive statistics (NOT causal)
  womenFoundedRate: number; // % of companies with ≥1 woman founder
  acquiredWomenFoundedRate: number; // % of acquired companies with ≥1 woman founder

  // Demographic parity test
  parityDifference: number; // Difference in acquisition rates
  confidenceInterval: [number, number];
  pValue: number;
  statisticallySignificant: boolean;

  // Power analysis
  observedPower: number;
  minimumDetectableDifference: number;

  // Sensitivity analysis (for ambiguous names)
  sensitivityRange: {
    ifAllAmbiguousWomen: number;
    ifAllAmbiguousMen: number;
    interpretation: string;
  };

  // Limitations
  limitations: string[];
  recommendations: string[];
}

/**
 * Calculate demographic parity with explicit uncertainty
 */
export function calculateDemographicParity(
  companies: CompanyWithFounders[],
): DemographicParityResult {
  // Filter companies with at least one founder
  const validCompanies = companies.filter((c) => c.founders.length > 0);

  // Count companies with at least one woman founder
  const womenFoundedCompanies = validCompanies.filter((c) =>
    c.founders.some((f) =>
      f.inferredGender === "female" &&
      f.confidence >= GENDER_INFERENCE_QUALITY.highConfidenceThreshold
    )
  );

  const acquired = validCompanies.filter((c) => c.wasAcquired);
  const acquiredWomenFounded = acquired.filter((c) =>
    c.founders.some((f) =>
      f.inferredGender === "female" &&
      f.confidence >= GENDER_INFERENCE_QUALITY.highConfidenceThreshold
    )
  );

  // Descriptive rates
  const womenFoundedRate = womenFoundedCompanies.length / validCompanies.length;
  const acquiredWomenFoundedRate = acquired.length > 0
    ? acquiredWomenFounded.length / acquired.length
    : 0;

  // Demographic parity difference
  const womenFoundedAcqRate = womenFoundedCompanies.length > 0
    ? acquiredWomenFounded.length / womenFoundedCompanies.length
    : 0;

  const menFoundedCompanies = validCompanies.filter((c) =>
    !womenFoundedCompanies.includes(c)
  );
  const acquiredMenFounded = menFoundedCompanies.filter((c) => c.wasAcquired);
  const menFoundedAcqRate = menFoundedCompanies.length > 0
    ? acquiredMenFounded.length / menFoundedCompanies.length
    : 0;

  const parityDifference = womenFoundedAcqRate - menFoundedAcqRate;

  // Standard error (proportion difference)
  const se = Math.sqrt(
    (womenFoundedAcqRate * (1 - womenFoundedAcqRate)) /
        Math.max(1, womenFoundedCompanies.length) +
      (menFoundedAcqRate * (1 - menFoundedAcqRate)) /
        Math.max(1, menFoundedCompanies.length),
  );

  const z95 = 1.96;
  const confidenceInterval: [number, number] = [
    parityDifference - z95 * se,
    parityDifference + z95 * se,
  ];

  // Z-test for proportions
  const zScore = se > 0 ? parityDifference / se : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

  // Power analysis
  const n = validCompanies.length;
  const observedPower = calculateStatisticalPower(parityDifference, se);
  const minimumDetectableDifference = calculateMinimumDetectableDifference(se);

  // Sensitivity analysis for ambiguous names
  const ambiguousFounders = validCompanies.flatMap((c) =>
    c.founders.filter((f) => f.inferredGender === "ambiguous")
  );

  const ifAllAmbiguousWomenRate =
    acquired.filter((c) =>
      c.founders.some((f) =>
        f.inferredGender === "female" || f.inferredGender === "ambiguous"
      )
    ).length / Math.max(1, acquired.length);

  // Worst case: All ambiguous = men
  const ifAllAmbiguousMenRate = acquiredWomenFounded.length /
    Math.max(1, acquired.length);

  const limitations = [
    `Sample size n=${n} provides only ${
      (observedPower * 100).toFixed(0)
    }% statistical power to detect a ${
      (parityDifference * 100).toFixed(0)
    }pp difference`,
    `Gender inference has ~${
      (GENDER_INFERENCE_QUALITY.errorRate * 100).toFixed(0)
    }% error rate; ${ambiguousFounders.length} founders flagged as ambiguous`,
    "Cannot test heterogeneous treatment effects by subgroup (n too small)",
    "Dataset includes only acquired companies (selection bias); failure rates unobservable",
    "Causal claims not justified - only descriptive associations",
  ];

  const recommendations = [
    "Report as descriptive statistics, not fairness violation",
    "Acknowledge wide confidence intervals and low power",
    "Conduct sensitivity analysis with ambiguous names",
    "Control for sector and stage confounders before concluding",
    "Collect data on failed companies for proper fairness analysis",
  ];

  return {
    womenFoundedRate,
    acquiredWomenFoundedRate,
    parityDifference,
    confidenceInterval,
    pValue,
    statisticallySignificant: pValue < 0.05,
    observedPower,
    minimumDetectableDifference,
    sensitivityRange: {
      ifAllAmbiguousWomen: ifAllAmbiguousWomenRate,
      ifAllAmbiguousMen: ifAllAmbiguousMenRate,
      interpretation: `Disparity ranges from ${
        (ifAllAmbiguousMenRate * 100).toFixed(0)
      }% to ${
        (ifAllAmbiguousWomenRate * 100).toFixed(0)
      }% depending on ambiguous name assignment`,
    },
    limitations,
    recommendations,
  };
}

/**
 * Calculate statistical power for proportion test
 */
function calculateStatisticalPower(
  effectSize: number,
  standardError: number,
): number {
  if (standardError === 0) return 0;

  // Approximate power calculation
  const z_alpha = 1.96; // Two-sided 0.05
  const z_beta = (Math.abs(effectSize) / standardError) - z_alpha;

  // Power = 1 - β = P(Z > z_beta)
  return Math.max(0, Math.min(1, normalCdf(z_beta)));
}

/**
 * Minimum detectable difference with given sample size
 */
function calculateMinimumDetectableDifference(standardError: number): number {
  // For 80% power, two-sided alpha = 0.05
  return 2.8 * standardError;
}

/**
 * Founder characteristic analysis (descriptive, not causal)
 */
export interface FounderCharacteristics {
  womenFounders: {
    count: number;
    sectorDistribution: Record<string, number>;
    stageDistribution: Record<string, number>;
    avgNetworkSize: number;
    avgAcquisitionValue: number;
  };
  menFounders: {
    count: number;
    sectorDistribution: Record<string, number>;
    stageDistribution: Record<string, number>;
    avgNetworkSize: number;
    avgAcquisitionValue: number;
  };
  systemicDifferences: string[];
}

export function analyzeFounderCharacteristics(
  companies: CompanyWithFounders[],
): FounderCharacteristics {
  const womenLed = companies.filter((c) =>
    c.founders.some((f) =>
      f.inferredGender === "female" &&
      f.confidence >= GENDER_INFERENCE_QUALITY.highConfidenceThreshold
    )
  );
  const menLed = companies.filter((c) => !womenLed.includes(c));

  const getSectorDist = (
    cos: CompanyWithFounders[],
  ): Record<string, number> => {
    const dist: Record<string, number> = {};
    cos.forEach((c) => {
      dist[c.sector] = (dist[c.sector] || 0) + 1;
    });
    return dist;
  };

  const getStageDist = (cos: CompanyWithFounders[]): Record<string, number> => {
    const dist: Record<string, number> = {};
    cos.forEach((c) => {
      dist[c.stage] = (dist[c.stage] || 0) + 1;
    });
    return dist;
  };

  const avgAcqValue = (cos: CompanyWithFounders[]): number => {
    const acquired = cos.filter((c) => c.wasAcquired && c.acquisitionValue);
    return acquired.length > 0
      ? acquired.reduce((sum, c) => sum + (c.acquisitionValue || 0), 0) /
        acquired.length
      : 0;
  };

  const systemicDifferences: string[] = [];

  // Identify systemic differences
  const womenSectors = getSectorDist(womenLed);
  const menSectors = getSectorDist(menLed);

  Object.keys(womenSectors).forEach((sector) => {
    const womenPct = (womenSectors[sector] || 0) / Math.max(1, womenLed.length);
    const menPct = (menSectors[sector] || 0) / Math.max(1, menLed.length);

    if (Math.abs(womenPct - menPct) > 0.15) {
      systemicDifferences.push(
        `${sector}: ${(womenPct * 100).toFixed(0)}% women vs ${
          (menPct * 100).toFixed(0)
        }% men`,
      );
    }
  });

  return {
    womenFounders: {
      count: womenLed.length,
      sectorDistribution: womenSectors,
      stageDistribution: getStageDist(womenLed),
      avgNetworkSize: 0, // Would need network data
      avgAcquisitionValue: avgAcqValue(womenLed),
    },
    menFounders: {
      count: menLed.length,
      sectorDistribution: getSectorDist(menLed),
      stageDistribution: getStageDist(menLed),
      avgNetworkSize: 0,
      avgAcquisitionValue: avgAcqValue(menLed),
    },
    systemicDifferences,
  };
}
