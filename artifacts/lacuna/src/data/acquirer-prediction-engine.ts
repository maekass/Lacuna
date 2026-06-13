/**
 * Acquirer Prediction Engine
 *
 * Predicts most likely acquirers for each Lacuna company based on:
 * - Strategic fit (capability gaps)
 * - Historical acquisition patterns
 * - Sector focus and stage preferences
 * - Financial capacity
 */

import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

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
  estimatedValue: { min: number; max: number; median: number };
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
  fairValueEstimate: { min: number; max: number; median: number };
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

// Known strategic acquirers in women's health
export const STRATEGIC_ACQUIRERS: AcquirerProfile[] = [
  {
    id: "cvs-health",
    name: "CVS Health",
    type: "strategic_healthcare",
    marketCap: 130,
    cashOnHand: 12,
    acquisitionHistory: [
      {
        targetName: "Signify Health",
        targetSector: "home_health",
        dealValue: 8000,
        dealDate: "2022-09",
        stageAtAcquisition: "growth",
        strategicRationale: "Expand primary care services",
      },
    ],
    sectorFocus: ["primary_care", "digital_health", "womens_health"],
    stagePreference: ["series_b", "growth", "late_stage"],
    typicalDealSize: { min: 500, max: 10000 },
    recentActivity: "high",
    strategicPriorities: [
      "primary care expansion",
      "digital health",
      "women health services",
    ],
    integrationStyle: "platform",
  },
  {
    id: "unitedhealth",
    name: "UnitedHealth Group",
    type: "strategic_healthcare",
    marketCap: 450,
    cashOnHand: 25,
    acquisitionHistory: [
      {
        targetName: "Change Healthcare",
        targetSector: "healthcare_it",
        dealValue: 13000,
        dealDate: "2022-07",
        stageAtAcquisition: "public",
        strategicRationale: "Healthcare data and analytics",
      },
      {
        targetName: "LHC Group",
        targetSector: "home_health",
        dealValue: 5400,
        dealDate: "2022-03",
        stageAtAcquisition: "public",
        strategicRationale: "Home health expansion",
      },
    ],
    sectorFocus: [
      "healthcare_it",
      "home_health",
      "digital_health",
      "womens_health",
    ],
    stagePreference: ["growth", "late_stage", "public"],
    typicalDealSize: { min: 1000, max: 15000 },
    recentActivity: "high",
    strategicPriorities: [
      "Optum platform",
      "digital health",
      "home-based care",
    ],
    integrationStyle: "hands_on",
  },
  {
    id: "teladoc",
    name: "Teladoc Health",
    type: "strategic_tech",
    marketCap: 2.5,
    acquisitionHistory: [
      {
        targetName: "Livongo",
        targetSector: "digital_therapeutics",
        dealValue: 18500,
        dealDate: "2020-08",
        stageAtAcquisition: "public",
        strategicRationale: "Chronic care management platform",
      },
    ],
    sectorFocus: ["telehealth", "digital_therapeutics", "chronic_care"],
    stagePreference: ["series_b", "growth"],
    typicalDealSize: { min: 100, max: 2000 },
    recentActivity: "medium",
    strategicPriorities: [
      "whole person care",
      "AI integration",
      "chronic conditions",
    ],
    integrationStyle: "platform",
  },
  {
    id: "ro-health",
    name: "Ro Health",
    type: "strategic_tech",
    marketCap: 7,
    acquisitionHistory: [
      {
        targetName: "Modern Fertility",
        targetSector: "fertility",
        dealValue: 150,
        dealDate: "2021-05",
        stageAtAcquisition: "series_a",
        strategicRationale: "Women health expansion",
      },
    ],
    sectorFocus: ["telehealth", "fertility", "mens_health", "womens_health"],
    stagePreference: ["seed", "series_a", "series_b"],
    typicalDealSize: { min: 50, max: 500 },
    recentActivity: "medium",
    strategicPriorities: [
      "platform expansion",
      "women health",
      "fertility services",
    ],
    integrationStyle: "hands_off",
  },
  {
    id: "progyny",
    name: "Progyny",
    type: "strategic_healthcare",
    marketCap: 4,
    acquisitionHistory: [],
    sectorFocus: ["fertility", "womens_health", "benefits_management"],
    stagePreference: ["series_b", "growth"],
    typicalDealSize: { min: 50, max: 300 },
    recentActivity: "low",
    strategicPriorities: [
      "fertility benefits",
      "employer solutions",
      "platform scale",
    ],
    integrationStyle: "hands_on",
  },
  {
    id: "fertility-lifespan",
    name: "Fertility Lifespan",
    type: "pe",
    acquisitionHistory: [
      {
        targetName: "IVF Florida",
        targetSector: "fertility",
        dealValue: 200,
        dealDate: "2019-06",
        stageAtAcquisition: "growth",
        strategicRationale: "Clinic consolidation",
      },
    ],
    sectorFocus: ["fertility", "womens_health"],
    stagePreference: ["growth", "late_stage"],
    typicalDealSize: { min: 100, max: 500 },
    recentActivity: "medium",
    strategicPriorities: [
      "clinic consolidation",
      "platform building",
      "geographic expansion",
    ],
    integrationStyle: "hands_on",
  },
  {
    id: "warburg-pincus",
    name: "Warburg Pincus",
    type: "pe",
    acquisitionHistory: [
      {
        targetName: "Syneos Health",
        targetSector: "cro",
        dealValue: 7100,
        dealDate: "2017-08",
        stageAtAcquisition: "public",
        strategicRationale: "Healthcare services platform",
      },
    ],
    sectorFocus: ["healthcare_services", "digital_health", "womens_health"],
    stagePreference: ["growth", "late_stage"],
    typicalDealSize: { min: 500, max: 5000 },
    recentActivity: "high",
    strategicPriorities: [
      "healthcare services",
      "platform investing",
      "digital health",
    ],
    integrationStyle: "hands_off",
  },
];

// Sector-specific valuation multiples
const SECTOR_MULTIPLES: Record<string, number> = {
  "fertility": 3.5,
  "maternal_health": 4.2,
  "mental_health": 3.8,
  "gynecology": 4.0,
  "telehealth": 3.2,
  "digital_therapeutics": 2.8,
  "diagnostics": 3.0,
  "wearables": 2.5,
};

/**
 * Calculate acquirer-company match score
 */
export function calculateMatchScore(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
): AcquirerMatch {
  // Strategic fit: Do capabilities align with acquirer priorities?
  const strategicFit = calculateStrategicFit(company, acquirer);

  // Cultural fit: Integration style compatibility
  const culturalFit = calculateCulturalFit(company, acquirer);

  // Financial fit: Can acquirer afford it?
  const financialFit = calculateFinancialFit(company, acquirer);

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
  const estimatedValue = estimateValue(company, acquirer, matchScore);

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
    valueRationale: estimatedValue.rationale || "",
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
): number {
  // Estimate company value
  const estimatedValue = (company.fundingTotal * 2.5) / 1000000; // $M

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

function estimateValue(
  company: CompanyProfile,
  acquirer: AcquirerProfile,
  matchScore: number,
): { min: number; max: number; median: number; rationale?: string } {
  // Base multiple for sector
  const baseMultiple = SECTOR_MULTIPLES[company.sector] || 3.0;

  // Adjust for match quality
  const qualityAdjustment = (matchScore - 50) / 100; // -0.5 to +0.5
  const adjustedMultiple = baseMultiple * (1 + qualityAdjustment);

  // Calculate value based on funding
  const fundingM = company.fundingTotal / 1000000;
  const baseValue = fundingM * adjustedMultiple;

  // Premium for strategic fit
  const strategicPremium = matchScore > 75 ? 1.3 : matchScore > 60 ? 1.15 : 1.0;

  const median = baseValue * strategicPremium;
  const min = median * 0.7;
  const max = median * 1.4;

  const rationale = `Based on ${
    adjustedMultiple.toFixed(1)
  }x funding multiple (${company.sector} sector), adjusted for ${matchScore}% strategic fit`;

  return {
    min: Math.round(min),
    max: Math.round(max),
    median: Math.round(median),
    rationale,
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
  acquirers: AcquirerProfile[] = STRATEGIC_ACQUIRERS,
): CompetitiveAnalysis {
  // Calculate matches for all acquirers
  const allMatches = acquirers.map((a) => calculateMatchScore(company, a));

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

  // Fair value estimate (average of top 3)
  const top3Values = topMatches.slice(0, 3).map((m) => m.estimatedValue.median);
  const fairValueMedian = top3Values.reduce((a, b) => a + b, 0) /
    top3Values.length;

  // Timeline estimate
  const timelineEstimate = estimateTimeline(company, topMatches[0]);

  // Get sector comparables
  const sectorComparables = getSectorComparables(company.sector);

  return {
    company,
    topMatches,
    predictedWinner,
    winProbability,
    competitiveThreatLevel,
    estimatedBiddingWarPremium,
    fairValueEstimate: {
      min: Math.round(fairValueMedian * 0.75),
      max: Math.round(fairValueMedian * 1.35),
      median: Math.round(fairValueMedian),
    },
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

function getSectorComparables(sector: string): ComparableDeal[] {
  // Mock comparable deals
  const mockDeals: ComparableDeal[] = [
    {
      targetName: "Modern Fertility",
      acquirerName: "Ro Health",
      dealValue: 150,
      dealDate: "2021-05",
      sector: "fertility",
      stage: "series_a",
      revenueMultiple: 3.2,
    },
    {
      targetName: "Livongo",
      acquirerName: "Teladoc",
      dealValue: 18500,
      dealDate: "2020-08",
      sector: "digital_therapeutics",
      stage: "public",
      revenueMultiple: 4.1,
    },
    {
      targetName: "Maven Clinic",
      acquirerName: "Unknown",
      dealValue: 0,
      dealDate: "2023-01",
      sector: "maternal_health",
      stage: "series_d",
      revenueMultiple: 3.8,
    },
    {
      targetName: "Tia",
      acquirerName: "CVS Health",
      dealValue: 0,
      dealDate: "2023-06",
      sector: "womens_health",
      stage: "series_b",
      revenueMultiple: 3.5,
    },
  ];

  return mockDeals.filter((d) => areSectorsRelated(d.sector, sector));
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
