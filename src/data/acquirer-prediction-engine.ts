/**
 * Acquirer Prediction Engine
 *
 * Descriptive acquirer fit scoring from verified deal history and company
 * records. Value estimates use empirical priors from disclosed deal values
 * when supplied by the caller — not fabricated market-cap panels.
 */
import type { EmpiricalPriors } from "@/lib/quant/empiricalPriors";
import { normalizeSectorBucket } from "@/lib/quant/empiricalPriors";
import { isSufficient } from "@/lib/quant/estimators";

// Types
export interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  stage: "seed" | "series_a" | "series_b" | "growth" | "late_stage";
  capabilities: string[];
  technology: string[];
  revenue?: number;
  fundingTotal: number;
  employeeCount?: number;
  foundingDate: string;
  keyCustomers?: string[];
  partnerships?: string[];
  fdaStatus?: "none" | "pending" | "cleared" | "approved";
  clinicalTrials?: number;
}

export interface AcquirerProfile {
  id: string;
  name: string;
  type: "strategic_healthcare" | "strategic_tech" | "pe" | "pharma" | "insurer";
  marketCap?: number; // in billions
  cashOnHand?: number; // in billions
  acquisitionHistory: HistoricalAcquisition[];
  sectorFocus: string[];
  stagePreference: string[];
  typicalDealSize: { min: number; max: number }; // in millions
  recentActivity: "high" | "medium" | "low";
  strategicPriorities: string[];
  integrationStyle: "hands_on" | "hands_off" | "platform";
}

export interface HistoricalAcquisition {
  targetName: string;
  targetSector: string;
  dealValue: number; // in millions
  dealDate: string;
  stageAtAcquisition: string;
  strategicRationale: string;
}

export interface AcquirerMatch {
  acquirer: AcquirerProfile;
  matchScore: number; // 0-100
  likelihood: "high" | "medium" | "low";
  strategicFit: number; // 0-100
  culturalFit: number; // 0-100
  financialFit: number; // 0-100
  marketFit: number; // 0-100
  estimatedValue: { min: number; max: number; median: number } | null;
  valueRationale: string;
  competitiveThreat: "high" | "medium" | "low";
  keyRationale: string[];
}

export interface CompetitiveAnalysis {
  company: CompanyProfile;
  topMatches: AcquirerMatch[];
  predictedWinner?: AcquirerProfile;
  winProbability: number;
  competitiveThreatLevel: "high" | "medium" | "low";
  estimatedBiddingWarPremium: number; // percentage
  fairValueEstimate: { min: number; max: number; median: number } | null;
  timelineEstimate: { months: number; triggers: string[] };
  sectorComparables: ComparableDeal[];
}

export interface ComparableDeal {
  targetName: string;
  acquirerName: string;
  dealValue: number;
  dealDate: string;
  sector: string;
  stage: string;
  revenueMultiple?: number;
}

/**
 * @deprecated Removed — use `buildAcquirerProfilesFromVerified` with verified dataset only.
 */
export const STRATEGIC_ACQUIRERS: AcquirerProfile[] = [];

/**
 * Calculate acquirer-company match score
 */
export function calculateMatchScore(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  empiricalPriors?: EmpiricalPriors,
): AcquirerMatch {
  // Strategic fit: Do capabilities align with acquirer priorities?
  const strategicFit = calculateStrategicFit(company, acquirer);

  // Cultural fit: Integration style compatibility
  const culturalFit = calculateCulturalFit(company, acquirer);

  // Financial fit: Can acquirer afford it?
  const financialFit = calculateFinancialFit(
    company,
    acquirer,
    empiricalPriors,
  );

  // Market fit: Sector and stage alignment
  const marketFit = calculateMarketFit(company, acquirer);

  // Overall match score
  const matchScore = Math.round(
    strategicFit * 0.35 +
      culturalFit * 0.15 +
      financialFit * 0.25 +
      marketFit * 0.25,
  );

  // Estimate value
  const estimatedValue = estimateValue(
    company,
    acquirer,
    matchScore,
    empiricalPriors,
  );

  // Determine likelihood
  let likelihood: "high" | "medium" | "low";
  if (matchScore >= 70) likelihood = "high";
  else if (matchScore >= 45) likelihood = "medium";
  else likelihood = "low";

  // Generate rationale
  const keyRationale = generateRationale(
    company,
    acquirer,
    strategicFit,
    marketFit,
  );

  return {
    acquirer,
    matchScore,
    likelihood,
    strategicFit,
    culturalFit,
    financialFit,
    marketFit,
    estimatedValue,
    valueRationale: estimatedValue?.rationale ??
      "Insufficient disclosed comparables in verified dataset",
    competitiveThreat: "medium", // Default, calculated separately
    keyRationale,
  };
}

function calculateStrategicFit(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
): number {
  let score = 50; // Base

  // Check capability alignment
  const capabilityMatches = company.capabilities.filter((cap) =>
    acquirer.strategicPriorities.some((priority) =>
      cap.toLowerCase().includes(priority.toLowerCase()) ||
      priority.toLowerCase().includes(cap.toLowerCase())
    )
  );
  score += capabilityMatches.length * 10;

  // Check technology alignment
  const techMatches = company.technology.filter((tech) =>
    acquirer.strategicPriorities.some((priority) =>
      tech.toLowerCase().includes(priority.toLowerCase())
    )
  );
  score += techMatches.length * 5;

  // Prior acquisitions in similar space
  const similarAcquisitions = acquirer.acquisitionHistory.filter((hist) =>
    hist.targetSector === company.sector ||
    areSectorsRelated(hist.targetSector, company.sector)
  );
  score += similarAcquisitions.length * 8;

  return Math.min(100, score);
}

function calculateCulturalFit(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
): number {
  // Early stage companies prefer hands-off acquirers
  const stagePrefersHandsOff = ["seed", "series_a"].includes(company.stage);
  const acquirerIsHandsOff = acquirer.integrationStyle === "hands_off";

  if (stagePrefersHandsOff && acquirerIsHandsOff) return 80;
  if (!stagePrefersHandsOff && !acquirerIsHandsOff) return 75;
  if (stagePrefersHandsOff && !acquirerIsHandsOff) return 40;
  return 60;
}

function calculateFinancialFit(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  empiricalPriors?: EmpiricalPriors,
): number {
  const estimate = deriveCompanyValueEstimate(company, empiricalPriors);
  if (!estimate) return 50;

  const estimatedValue = estimate.medianM;

  // Check if in typical deal range
  if (estimatedValue < acquirer.typicalDealSize.min) return 40; // Too small
  if (estimatedValue > acquirer.typicalDealSize.max) return 30; // Too large

  // Sweet spot: middle of range
  const rangeMid =
    (acquirer.typicalDealSize.min + acquirer.typicalDealSize.max) / 2;
  const distanceFromMid = Math.abs(estimatedValue - rangeMid);
  const rangeWidth = acquirer.typicalDealSize.max -
    acquirer.typicalDealSize.min;

  return Math.max(40, 100 - (distanceFromMid / rangeWidth) * 40);
}

function calculateMarketFit(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
): number {
  let score = 50;

  // Sector alignment
  if (acquirer.sectorFocus.includes(company.sector)) score += 25;
  else if (
    acquirer.sectorFocus.some((s) => areSectorsRelated(s, company.sector))
  ) score += 15;

  // Stage alignment
  if (acquirer.stagePreference.includes(company.stage)) score += 25;
  else if (isStageNearPreference(company.stage, acquirer.stagePreference)) {
    score += 15;
  }

  return Math.min(100, score);
}

interface CompanyValueEstimate {
  medianM: number;
  rationale: string;
}

/** Derive a company value ($M) from empirical priors, then heuristic fallback. */
function deriveCompanyValueEstimate(
  company: CompanyProfile,
  empiricalPriors?: EmpiricalPriors,
): CompanyValueEstimate | null {
  const bucket = normalizeSectorBucket(company.sector);
  const sectorPrior = empiricalPriors?.sectorPriors.get(bucket);
  const fundingM = company.fundingTotal / 1_000_000;

  const fundingMultiple = sectorPrior?.medianFundingMultipleEstimate;
  if (
    fundingM > 0 &&
    fundingMultiple &&
    isSufficient(fundingMultiple)
  ) {
    const medianM = fundingM * fundingMultiple.value;
    return {
      medianM,
      rationale: `Median ${
        fundingMultiple.value.toFixed(1)
      }x funding-to-exit multiple from ${fundingMultiple.sampleSize} verified ${bucket} deals`,
    };
  }

  const sectorDealMedian = sectorPrior?.medianDealValueEstimate;
  if (sectorDealMedian && isSufficient(sectorDealMedian)) {
    return {
      medianM: sectorDealMedian.value,
      rationale:
        `Median disclosed deal value ($${sectorDealMedian.value}M) from ${
          sectorPrior!.dealCount
        } verified ${bucket} deals`,
    };
  }

  const allDealMedian = empiricalPriors?.medianDealValueAllEstimate;
  if (allDealMedian && isSufficient(allDealMedian)) {
    return {
      medianM: allDealMedian.value,
      rationale:
        `Dataset median disclosed deal value ($${allDealMedian.value}M, n=${
          empiricalPriors!.disclosedDealCount
        })`,
    };
  }

  return null;
}

function estimateValue(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  matchScore: number,
  empiricalPriors?: EmpiricalPriors,
): { min: number; max: number; median: number; rationale?: string } | null {
  const base = deriveCompanyValueEstimate(company, empiricalPriors);
  if (!base) return null;

  const qualityAdjustment = (matchScore - 50) / 100;
  const adjustedValue = base.medianM * (1 + qualityAdjustment * 0.25);
  const strategicPremium = matchScore > 75
    ? 1.15
    : matchScore > 60
    ? 1.08
    : 1.0;

  const median = adjustedValue * strategicPremium;
  const min = median * 0.7;
  const max = median * 1.4;

  return {
    min: Math.round(min),
    max: Math.round(max),
    median: Math.round(median),
    rationale: `${base.rationale}; adjusted for ${matchScore}% strategic fit`,
  };
}

function generateRationale(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  strategicFit: number,
  marketFit: number,
): string[] {
  const rationale: string[] = [];

  if (strategicFit >= 70) {
    rationale.push(
      `Strong strategic fit: ${acquirer.name}'s priorities align with ${company.name}'s capabilities`,
    );
  }

  if (acquirer.sectorFocus.includes(company.sector)) {
    rationale.push(
      `Sector match: ${acquirer.name} actively investing in ${company.sector}`,
    );
  }

  const similarAcqs = acquirer.acquisitionHistory.filter((h) =>
    areSectorsRelated(h.targetSector, company.sector)
  );
  if (similarAcqs.length > 0) {
    rationale.push(
      `Prior acquisitions: ${acquirer.name} acquired ${similarAcqs.length} similar companies`,
    );
  }

  if (acquirer.stagePreference.includes(company.stage)) {
    rationale.push(
      `Stage match: ${acquirer.name} prefers ${company.stage} companies`,
    );
  }

  return rationale.length > 0
    ? rationale
    : ["General strategic interest in healthcare sector"];
}

/**
 * Analyze competitive dynamics for a company
 */
export function analyzeCompetitiveDynamics(
  company: CompanyProfile,
  acquirers: AcquirerProfile[],
  verifiedComparables: ComparableDeal[] = [],
  empiricalPriors?: EmpiricalPriors,
): CompetitiveAnalysis {
  if (acquirers.length === 0) {
    throw new Error(
      "analyzeCompetitiveDynamics requires acquirer profiles from the verified dataset",
    );
  }

  const allMatches = acquirers.map((a) =>
    calculateMatchScore(company, a, empiricalPriors)
  );

  // Sort by match score
  const sortedMatches = allMatches.sort((a, b) => b.matchScore - a.matchScore);

  // Top 5 matches
  const topMatches = sortedMatches.slice(0, 5);

  // Predict winner (highest match score)
  const predictedWinner = topMatches[0].likelihood === "high"
    ? topMatches[0].acquirer
    : undefined;
  const winProbability = topMatches[0].matchScore / 100;

  // Competitive threat assessment
  const highInterestCount =
    topMatches.filter((m) => m.likelihood === "high").length;
  const competitiveThreatLevel = highInterestCount >= 2
    ? "high"
    : highInterestCount === 1
    ? "medium"
    : "low";

  // Estimate bidding war premium
  const estimatedBiddingWarPremium = competitiveThreatLevel === "high"
    ? 25
    : competitiveThreatLevel === "medium"
    ? 15
    : 0;

  // Fair value estimate (average of top 3 with disclosed comparables)
  const top3Values = topMatches
    .map((m) => m.estimatedValue?.median)
    .filter((v): v is number => typeof v === "number");
  const fairValueMedian = top3Values.length > 0
    ? top3Values.reduce((a, b) => a + b, 0) / top3Values.length
    : null;

  // Timeline estimate
  const timelineEstimate = estimateTimeline(company, topMatches[0]);

  // Filter verified comparables to this sector — no fabricated deals
  const sectorComparables = verifiedComparables.filter((d) =>
    areSectorsRelated(d.sector, company.sector)
  );

  return {
    company,
    topMatches,
    predictedWinner,
    winProbability,
    competitiveThreatLevel,
    estimatedBiddingWarPremium,
    fairValueEstimate: fairValueMedian !== null
      ? {
        min: Math.round(fairValueMedian * 0.75),
        max: Math.round(fairValueMedian * 1.35),
        median: Math.round(fairValueMedian),
      }
      : null,
    timelineEstimate,
    sectorComparables,
  };
}

function estimateTimeline(
  company: CompanyProfile,
  topMatch: AcquirerMatch,
): { months: number; triggers: string[] } {
  const baseMonths = company.stage === "seed"
    ? 36
    : company.stage === "series_a"
    ? 24
    : company.stage === "series_b"
    ? 18
    : 12;

  const triggers: string[] = [];

  if (company.fdaStatus === "pending") triggers.push("FDA approval/clearance");
  if (company.clinicalTrials && company.clinicalTrials > 0) {
    triggers.push("Positive trial results");
  }
  if (company.stage === "series_b") triggers.push("Series C funding");
  if (topMatch.likelihood === "high") {
    triggers.push("Strategic acquirer approach");
  }

  return { months: baseMonths, triggers };
}

// Helper functions
function areSectorsRelated(sector1: string, sector2: string): boolean {
  const related: Record<string, string[]> = {
    "fertility": ["womens_health", "maternal_health", "reproductive_health"],
    "maternal_health": ["womens_health", "fertility", "pediatrics"],
    "womens_health": ["fertility", "maternal_health", "gynecology"],
    "digital_therapeutics": ["telehealth", "digital_health"],
    "telehealth": ["digital_health", "digital_therapeutics"],
  };

  return sector1 === sector2 ||
    related[sector1]?.includes(sector2) ||
    related[sector2]?.includes(sector1) ||
    false;
}

function isStageNearPreference(stage: string, preferences: string[]): boolean {
  const stageOrder = ["seed", "series_a", "series_b", "growth", "late_stage"];
  const stageIdx = stageOrder.indexOf(stage);

  return preferences.some((pref) => {
    const prefIdx = stageOrder.indexOf(pref);
    return Math.abs(stageIdx - prefIdx) === 1;
  });
}

export const acquirerPredictionEngine = {
  calculateMatch: calculateMatchScore,
  analyze: analyzeCompetitiveDynamics,
  acquirers: STRATEGIC_ACQUIRERS,
};
