/**
 * Deterministic context engine
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
  stage: "seed" | "series_a" | "series_b" | "growth" | "late_stage" | "unknown";
  capabilities: string[];
  technology: string[];
  revenue?: number;
  /** Disclosed total funding in USD millions. Omitted when undisclosed. */
  fundingTotal?: number;
  employeeCount?: number;
  /**
   * Founding year when precision is year. Null when missing.
   * Not a calendar day — year-only evidence is not stored as January 1.
   */
  foundingYear: number | null;
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
  /**
   * Disclosed deal-size range in USD millions.
   * Null when this acquirer has no disclosed prices — not a $10–500M stand-in.
   */
  typicalDealSize: { min: number; max: number } | null;
  recentActivity: "high" | "medium" | "low";
  strategicPriorities: string[];
  integrationStyle: "hands_on" | "hands_off" | "platform";
}

export interface HistoricalAcquisition {
  targetName: string;
  targetSector: string;
  /** USD millions. Null when the deal did not disclose a price. */
  dealValue: number | null;
  dealDate: string;
  stageAtAcquisition: string;
  strategicRationale: string;
}

export interface AcquirerMatch {
  acquirer: AcquirerProfile;
  matchScore: number; // 0-100
  likelihood: "high" | "medium" | "low";
  strategicFit: number; // 0-100
  culturalFit: number | null; // Null when company stage is unknown.
  /** Null when deal size or a value estimate is unavailable. */
  financialFit: number | null;
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
  /**
   * Top match score on a 0–1 scale.
   * A descriptive overlap index, not an acquisition probability.
   */
  overlapIndex: number;
  competitiveThreatLevel: "high" | "medium" | "low";
  estimatedBiddingWarPremium: number | null;
  fairValueEstimate: { min: number; max: number; median: number } | null;
  timelineEstimate: { months: number | null; triggers: string[] };
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
 * Hand-set weights. They are not learned from outcomes.
 * Cultural fit is omitted for unknown company stages, and financial fit is
 * omitted when disclosed deal size or a value estimate is unavailable. The
 * remaining weights are renormalized so omissions are not scored as zeroes.
 */
const MATCH_WEIGHTS = {
  strategic: 0.35,
  cultural: 0.15,
  financial: 0.25,
  market: 0.25,
} as const;

function weightedMatch(
  parts: readonly { score: number; weight: number }[],
): number {
  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  if (!(total > 0)) return 0;
  return Math.round(
    parts.reduce((sum, part) => sum + part.score * part.weight, 0) / total,
  );
}

/**
 * Calculate acquirer-company match score.
 * `likelihood` is an overlap tier (high ≥ 70, medium ≥ 45), not a probability.
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

  const matchScore = weightedMatch([
    { score: strategicFit, weight: MATCH_WEIGHTS.strategic },
    ...(culturalFit === null
      ? []
      : [{ score: culturalFit, weight: MATCH_WEIGHTS.cultural }]),
    ...(financialFit === null
      ? []
      : [{ score: financialFit, weight: MATCH_WEIGHTS.financial }]),
    { score: marketFit, weight: MATCH_WEIGHTS.market },
  ]);

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
): number | null {
  if (company.stage === "unknown") return null;

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
): number | null {
  if (!acquirer.typicalDealSize) return null;
  const estimate = deriveCompanyValueEstimate(company, empiricalPriors);
  if (!estimate) return null;

  const estimatedValue = estimate.medianM;
  const { min, max } = acquirer.typicalDealSize;
  const rangeWidth = max - min;
  if (!(rangeWidth > 0) || !Number.isFinite(estimatedValue)) return null;

  if (estimatedValue < min) return 40;
  if (estimatedValue > max) return 30;

  const rangeMid = (min + max) / 2;
  const distanceFromMid = Math.abs(estimatedValue - rangeMid);
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

/** Derive a company value ($M) from empirical priors only. */
function deriveCompanyValueEstimate(
  company: CompanyProfile,
  empiricalPriors?: EmpiricalPriors,
): CompanyValueEstimate | null {
  const bucket = normalizeSectorBucket(company.sector);
  const sectorPrior = empiricalPriors?.sectorPriors.get(bucket);
  // fundingTotal is already USD millions, matching verified totalFunding.
  const fundingM = company.fundingTotal;

  const fundingMultiple = sectorPrior?.medianFundingMultipleEstimate;
  if (
    typeof fundingM === "number" && fundingM > 0 &&
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

/** Dataset-derived comparable median only — no match-score or premium markup. */
function estimateValue(
  company: CompanyProfile,
  _acquirer: AcquirerProfile,
  _matchScore: number,
  empiricalPriors?: EmpiricalPriors,
): { min: number; max: number; median: number; rationale?: string } | null {
  const base = deriveCompanyValueEstimate(company, empiricalPriors);
  if (!base) return null;

  const median = Math.round(base.medianM);
  return {
    min: median,
    max: median,
    median,
    rationale: base.rationale,
  };
}

function generateRationale(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  strategicFit: number,
  _marketFit: number,
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
  const sortedMatches = allMatches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.acquirer.name.localeCompare(b.acquirer.name);
  });

  // Top 5 matches
  const topMatches = sortedMatches.slice(0, 5);

  // Predict winner (highest match score)
  const predictedWinner = topMatches[0].likelihood === "high"
    ? topMatches[0].acquirer
    : undefined;
  const overlapIndex = topMatches[0].matchScore / 100;

  // Competitive threat assessment
  const highInterestCount =
    topMatches.filter((m) => m.likelihood === "high").length;
  const competitiveThreatLevel = highInterestCount >= 2
    ? "high"
    : highInterestCount === 1
    ? "medium"
    : "low";

  // Invented bidding-war premiums and affinity-adjusted "fair value" are not
  // deal economics. Keep verified sector comparables only.
  const timelineEstimate = estimateTimeline(company, topMatches[0]);

  const sectorComparables = verifiedComparables.filter((d) =>
    areSectorsRelated(d.sector, company.sector)
  );

  return {
    company,
    topMatches,
    predictedWinner,
    overlapIndex,
    competitiveThreatLevel,
    estimatedBiddingWarPremium: null,
    fairValueEstimate: null,
    timelineEstimate,
    sectorComparables,
  };
}

function estimateTimeline(
  company: CompanyProfile,
  _topMatch: AcquirerMatch,
): { months: number | null; triggers: string[] } {
  const triggers: string[] = [];

  if (company.fdaStatus === "pending") triggers.push("FDA approval/clearance");
  if (company.clinicalTrials && company.clinicalTrials > 0) {
    triggers.push("Positive trial results");
  }
  if (company.stage === "series_b") triggers.push("Series C funding");
  if (_topMatch.likelihood === "high") {
    triggers.push("Strategic acquirer approach");
  }

  return { months: null, triggers };
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
  if (stageIdx < 0) return false;

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
