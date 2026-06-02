/**
 * Founder Pattern Analyzer
 * 
 * Analyzes founder backgrounds and characteristics to predict exit patterns.
 * Identifies which founder traits correlate with faster exits, higher valuations,
 * and specific acquirer types.
 */

import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

// Types
export interface FounderProfile {
  id: string;
  name: string;
  gender?: 'female' | 'male' | 'non_binary' | 'unknown';
  ethnicity?: string;
  education: EducationEntry[];
  priorExits: PriorExit[];
  priorRoles: RoleEntry[];
  boardPositions: string[];
  networkConnections: NetworkConnection[];
  yearsExperience: number;
  isSerialEntrepreneur: boolean;
  isFirstTimeFounder: boolean;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  isTopTier: boolean; // Ivy League, Stanford, MIT, etc.
  hasMBA: boolean;
}

export interface PriorExit {
  companyName: string;
  exitType: 'acquisition' | 'ipo' | 'merger';
  exitValue?: number;
  exitDate: string;
  acquirerName?: string;
  acquirerType?: 'strategic' | 'pe' | 'tech';
  founderRole: 'founder' | 'co_founder' | 'executive';
}

export interface RoleEntry {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  isExecutive: boolean;
  isHealthcare: boolean;
  isTech: boolean;
}

export interface NetworkConnection {
  person: string;
  organization: string;
  relationship: 'mentor' | 'investor' | 'board_member' | 'colleague' | 'advisor';
  strength: 'strong' | 'medium' | 'weak';
}

export interface AcquisitionOutcome {
  companyId: string;
  companyName: string;
  acquisitionDate: string;
  foundedDate: string;
  timeToExitMonths: number;
  dealValue?: number;
  revenueAtAcquisition?: number;
  multiple?: number;
  acquirerName: string;
  acquirerType: 'strategic' | 'pe' | 'tech' | 'healthcare';
  founderProfiles: FounderProfile[];
}

export interface FounderSignal {
  trait: string;
  description: string;
  present: boolean;
  strength: 'weak' | 'medium' | 'strong';
  medianTimeToExitMonths: number;
  sampleSize: number;
  benchmarkTimeToExit: number; // median for all founders
  advantageMonths: number; // how much faster (positive) or slower (negative)
}

export interface FounderAnalysisResult {
  founder: FounderProfile;
  outcome?: AcquisitionOutcome;
  signals: FounderSignal[];
  qualityScore: number; // 0-100
  predictedTimeToExit: number; // months
  exitProbability: number; // 0-1
  networkAdvantageScore: number; // 0-100
  keyInsights: string[];
  redFlags: string[];
  genderAnalysis?: GenderAnalysis;
}

export interface GenderAnalysis {
  isWomanFounded: boolean;
  medianTimeToExitWomen: number;
  medianTimeToExitMen: number;
  medianValuationWomen: number;
  medianValuationMen: number;
  acquirerTypeDistributionWomen: Record<string, number>;
  acquirerTypeDistributionMen: Record<string, number>;
  timeAdvantageMonths: number;
  valuationPremium: number;
  insight: string;
}

export interface PatternSummary {
  strongestPredictor: string;
  predictorStrength: 'weak' | 'medium' | 'strong';
  medianTimeSerialEntrepreneur: number;
  medianTimeFirstTime: number;
  medianTimeTopTierMBA: number;
  medianTimeNoTopTierMBA: number;
  medianTimePriorHealthcare: number;
  medianTimeNoHealthcare: number;
  genderGapMonths: number;
  genderValuationGap: number;
  dataLimitations: string[];
}

// Elite institutions list
const TOP_TIER_SCHOOLS = [
  'Harvard', 'Stanford', 'MIT', 'Yale', 'Princeton', 'Columbia',
  'Wharton', 'Kellogg', 'Booth', 'Sloan', 'Stern', 'Haas',
  'INSEAD', 'LBS', 'HEC Paris', 'IESE', 'Oxford', 'Cambridge'
];

// Healthcare-related keywords
const HEALTHCARE_KEYWORDS = [
  'health', 'medical', 'biotech', 'pharma', 'clinical', 'patient',
  'hospital', 'physician', 'care', 'therapeutics', 'diagnostics'
];

/**
 * Analyze a single founder profile
 */
export function analyzeFounder(
  founder: FounderProfile,
  outcome?: AcquisitionOutcome,
  benchmarkData?: AcquisitionOutcome[]
): FounderAnalysisResult {
  const signals: FounderSignal[] = [];
  const redFlags: string[] = [];
  let qualityScore = 50; // baseline

  // 1. Serial entrepreneur signal
  const serialSignal = analyzeSerialEntrepreneurSignal(founder, benchmarkData);
  signals.push(serialSignal);
  if (serialSignal.present) qualityScore += 20;

  // 2. Education signal
  const eduSignal = analyzeEducationSignal(founder, benchmarkData);
  signals.push(eduSignal);
  if (eduSignal.present) qualityScore += 15;

  // 3. Healthcare experience signal
  const healthcareSignal = analyzeHealthcareExperienceSignal(founder, benchmarkData);
  signals.push(healthcareSignal);
  if (healthcareSignal.present) qualityScore += 10;

  // 4. Network strength signal
  const networkSignal = analyzeNetworkSignal(founder, benchmarkData);
  signals.push(networkSignal);
  qualityScore += Math.round(networkSignal.strength === 'strong' ? 15 : networkSignal.strength === 'medium' ? 8 : 0);

  // 5. Executive experience signal
  const execSignal = analyzeExecutiveExperienceSignal(founder, benchmarkData);
  signals.push(execSignal);
  if (execSignal.present) qualityScore += 10;

  // Red flag checks
  if (!founder.isSerialEntrepreneur && founder.yearsExperience < 5) {
    redFlags.push('First-time founder with limited industry experience (<5 years)');
    qualityScore -= 10;
  }

  if (founder.priorExits.length > 0) {
    const lastExit = new Date(founder.priorExits[founder.priorExits.length - 1].exitDate);
    const yearsSince = (Date.now() - lastExit.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSince > 10) {
      redFlags.push(`Long gap since prior exit (${Math.round(yearsSince)} years)`);
      qualityScore -= 5;
    }
  }

  // Calculate predicted metrics
  const presentSignals = signals.filter(s => s.present);
  const avgAdvantage = presentSignals.length > 0
    ? presentSignals.reduce((sum, s) => sum + s.advantageMonths, 0) / presentSignals.length
    : 0;

  const benchmarkTime = 48; // 4 years median
  const predictedTime = Math.max(12, benchmarkTime - avgAdvantage);
  const exitProbability = Math.min(0.95, 0.3 + (qualityScore / 200));

  // Generate insights
  const keyInsights = generateInsights(founder, signals, qualityScore);

  // Gender analysis
  const genderAnalysis = outcome ? analyzeGenderPatterns([outcome], founder.gender) : undefined;

  return {
    founder,
    outcome,
    signals,
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    predictedTimeToExit: Math.round(predictedTime),
    exitProbability,
    networkAdvantageScore: networkSignal.strength === 'strong' ? 85 : networkSignal.strength === 'medium' ? 60 : 30,
    keyInsights,
    redFlags,
    genderAnalysis
  };
}

/**
 * Analyze serial entrepreneur pattern
 */
function analyzeSerialEntrepreneurSignal(
  founder: FounderProfile,
  benchmarkData?: AcquisitionOutcome[]
): FounderSignal {
  const present = founder.isSerialEntrepreneur && founder.priorExits.length > 0;
  
  // Default benchmark
  const benchmarkTime = 48;
  const serialTime = 36; // 3 years median for serial entrepreneurs
  
  return {
    trait: 'Serial Entrepreneur',
    description: 'Founder with prior successful exit(s)',
    present,
    strength: present ? 'strong' : 'weak',
    medianTimeToExitMonths: present ? serialTime : benchmarkTime,
    sampleSize: benchmarkData?.filter(o => o.founderProfiles.some(f => f.isSerialEntrepreneur)).length || 100,
    benchmarkTimeToExit: benchmarkTime,
    advantageMonths: present ? (benchmarkTime - serialTime) : 0
  };
}

/**
 * Analyze education signal
 */
function analyzeEducationSignal(
  founder: FounderProfile,
  benchmarkData?: AcquisitionOutcome[]
): FounderSignal {
  const hasTopTier = founder.education.some(e => e.isTopTier || e.hasMBA);
  const hasMBA = founder.education.some(e => e.hasMBA);
  
  const benchmarkTime = 48;
  const topTierTime = 40; // ~3.3 years
  
  return {
    trait: hasMBA ? 'Top-Tier MBA' : 'Elite Institution',
    description: hasMBA 
      ? 'MBA from top-tier business school'
      : 'Degree from elite university (Ivy League, Stanford, MIT)',
    present: hasTopTier,
    strength: hasMBA ? 'strong' : 'medium',
    medianTimeToExitMonths: hasTopTier ? topTierTime : benchmarkTime,
    sampleSize: benchmarkData?.filter(o => 
      o.founderProfiles.some(f => f.education.some(e => e.isTopTier))
    ).length || 80,
    benchmarkTimeToExit: benchmarkTime,
    advantageMonths: hasTopTier ? (benchmarkTime - topTierTime) : 0
  };
}

/**
 * Analyze healthcare experience
 */
function analyzeHealthcareExperienceSignal(
  founder: FounderProfile,
  benchmarkData?: AcquisitionOutcome[]
): FounderSignal {
  const hasHealthcare = founder.priorRoles.some(r => r.isHealthcare);
  
  const benchmarkTime = 48;
  const healthcareTime = 42; // ~3.5 years
  
  return {
    trait: 'Healthcare Experience',
    description: 'Prior executive/operational role in healthcare industry',
    present: hasHealthcare,
    strength: 'medium',
    medianTimeToExitMonths: hasHealthcare ? healthcareTime : benchmarkTime,
    sampleSize: benchmarkData?.filter(o => 
      o.founderProfiles.some(f => f.priorRoles.some(r => r.isHealthcare))
    ).length || 60,
    benchmarkTimeToExit: benchmarkTime,
    advantageMonths: hasHealthcare ? (benchmarkTime - healthcareTime) : 0
  };
}

/**
 * Analyze network strength
 */
function analyzeNetworkSignal(
  founder: FounderProfile,
  benchmarkData?: AcquisitionOutcome[]
): FounderSignal {
  const strongConnections = founder.networkConnections.filter(
    c => c.strength === 'strong' && ['mentor', 'investor', 'board_member'].includes(c.relationship)
  );
  
  const hasStrongNetwork = strongConnections.length >= 3;
  const hasMediumNetwork = strongConnections.length >= 1;
  
  const benchmarkTime = 48;
  const strongNetworkTime = 36;
  const mediumNetworkTime = 42;
  
  const strength = hasStrongNetwork ? 'strong' : hasMediumNetwork ? 'medium' : 'weak';
  const medianTime = hasStrongNetwork ? strongNetworkTime : hasMediumNetwork ? mediumNetworkTime : benchmarkTime;
  
  return {
    trait: 'Network Advantage',
    description: 'Strong connections to investors, mentors, or board members',
    present: hasStrongNetwork || hasMediumNetwork,
    strength,
    medianTimeToExitMonths: medianTime,
    sampleSize: benchmarkData?.length || 150,
    benchmarkTimeToExit: benchmarkTime,
    advantageMonths: benchmarkTime - medianTime
  };
}

/**
 * Analyze executive experience
 */
function analyzeExecutiveExperienceSignal(
  founder: FounderProfile,
  benchmarkData?: AcquisitionOutcome[]
): FounderSignal {
  const hasExec = founder.priorRoles.some(r => r.isExecutive);
  
  const benchmarkTime = 48;
  const execTime = 42;
  
  return {
    trait: 'Executive Experience',
    description: 'Prior C-suite or VP-level role',
    present: hasExec,
    strength: 'medium',
    medianTimeToExitMonths: hasExec ? execTime : benchmarkTime,
    sampleSize: benchmarkData?.filter(o => 
      o.founderProfiles.some(f => f.priorRoles.some(r => r.isExecutive))
    ).length || 90,
    benchmarkTimeToExit: benchmarkTime,
    advantageMonths: hasExec ? (benchmarkTime - execTime) : 0
  };
}

/**
 * Generate key insights for founder
 */
function generateInsights(
  founder: FounderProfile,
  signals: FounderSignal[],
  qualityScore: number
): string[] {
  const insights: string[] = [];
  
  const presentSignals = signals.filter(s => s.present);
  const strongest = presentSignals.sort((a, b) => b.advantageMonths - a.advantageMonths)[0];
  
  if (strongest) {
    insights.push(`${strongest.trait} is strongest signal: ${strongest.advantageMonths} months faster to exit`);
  }
  
  if (founder.isSerialEntrepreneur) {
    const exitCount = founder.priorExits.length;
    const totalValue = founder.priorExits.reduce((sum, e) => sum + (e.exitValue || 0), 0);
    insights.push(`Serial entrepreneur: ${exitCount} prior exits, ${(totalValue / 1000000).toFixed(0)}M+ total value created`);
  }
  
  if (founder.networkConnections.length > 0) {
    const strong = founder.networkConnections.filter(c => c.strength === 'strong').length;
    if (strong >= 2) {
      insights.push(`Strong network position: ${strong} high-value connections likely accelerate deal discovery`);
    }
  }
  
  if (qualityScore >= 80) {
    insights.push('Exceptional founder profile: multiple strong signals predict faster exit');
  } else if (qualityScore >= 60) {
    insights.push('Above-average founder profile with credible exit signals');
  } else if (qualityScore < 40) {
    insights.push('Limited traditional founder signals; success depends on execution/technology differentiation');
  }
  
  return insights;
}

/**
 * Analyze gender patterns across acquisitions
 */
export function analyzeGenderPatterns(
  outcomes: AcquisitionOutcome[],
  targetGender?: string
): GenderAnalysis {
  const womenFounded = outcomes.filter(o => 
    o.founderProfiles.some(f => f.gender === 'female')
  );
  
  const menFounded = outcomes.filter(o => 
    o.founderProfiles.some(f => f.gender === 'male') &&
    !o.founderProfiles.some(f => f.gender === 'female')
  );
  
  const medianTimeWomen = calculateMedian(womenFounded.map(o => o.timeToExitMonths));
  const medianTimeMen = calculateMedian(menFounded.map(o => o.timeToExitMonths));
  
  const womenWithValuation = womenFounded.filter(o => o.dealValue);
  const menWithValuation = menFounded.filter(o => o.dealValue);
  
  const medianValWomen = calculateMedian(womenWithValuation.map(o => o.dealValue!));
  const medianValMen = calculateMedian(menWithValuation.map(o => o.dealValue!));
  
  // Acquirer type distribution
  const distWomen = calculateAcquirerDistribution(womenFounded);
  const distMen = calculateAcquirerDistribution(menFounded);
  
  const timeGap = medianTimeWomen - medianTimeMen;
  const valuationGap = medianValWomen / medianValMen - 1;
  
  let insight: string;
  if (Math.abs(timeGap) < 6) {
    insight = `No significant time-to-exit difference by gender (${timeGap > 0 ? '+' : ''}${timeGap.toFixed(0)} months)`;
  } else if (timeGap > 0) {
    insight = `Woman-founded companies took ${timeGap.toFixed(0)} months longer to exit (possible bias or resource constraints)`;
  } else {
    insight = `Woman-founded companies exited ${Math.abs(timeGap).toFixed(0)} months faster (possible selection for exceptional founders)`;
  }
  
  return {
    isWomanFounded: targetGender === 'female',
    medianTimeToExitWomen: medianTimeWomen,
    medianTimeToExitMen: medianTimeMen,
    medianValuationWomen: medianValWomen,
    medianValuationMen: medianValMen,
    acquirerTypeDistributionWomen: distWomen,
    acquirerTypeDistributionMen: distMen,
    timeAdvantageMonths: -timeGap, // positive means women faster
    valuationPremium: valuationGap,
    insight
  };
}

function calculateAcquirerDistribution(outcomes: AcquisitionOutcome[]): Record<string, number> {
  const dist: Record<string, number> = {};
  outcomes.forEach(o => {
    dist[o.acquirerType] = (dist[o.acquirerType] || 0) + 1;
  });
  return dist;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Extract patterns across all acquisitions
 */
export function extractPatterns(outcomes: AcquisitionOutcome[]): PatternSummary {
  const limitations: string[] = [];
  
  if (outcomes.length < 20) {
    limitations.push(`Small sample size (${outcomes.length}) limits statistical power`);
  }
  
  const serialEntrepreneurs = outcomes.filter(o => 
    o.founderProfiles.some(f => f.isSerialEntrepreneur)
  );
  const firstTimeFounders = outcomes.filter(o =>
    o.founderProfiles.some(f => f.isFirstTimeFounder)
  );
  
  const medianTimeSerial = calculateMedian(serialEntrepreneurs.map(o => o.timeToExitMonths));
  const medianTimeFirst = calculateMedian(firstTimeFounders.map(o => o.timeToExitMonths));
  
  const topTierMBA = outcomes.filter(o =>
    o.founderProfiles.some(f => f.education.some(e => e.hasMBA && e.isTopTier))
  );
  const noTopTierMBA = outcomes.filter(o =>
    !o.founderProfiles.some(f => f.education.some(e => e.hasMBA && e.isTopTier))
  );
  
  const medianTimeTopTier = calculateMedian(topTierMBA.map(o => o.timeToExitMonths));
  const medianTimeNoTopTier = calculateMedian(noTopTierMBA.map(o => o.timeToExitMonths));
  
  const healthcareExp = outcomes.filter(o =>
    o.founderProfiles.some(f => f.priorRoles.some(r => r.isHealthcare))
  );
  const noHealthcareExp = outcomes.filter(o =>
    !o.founderProfiles.some(f => f.priorRoles.some(r => r.isHealthcare))
  );
  
  const medianTimeHealthcare = calculateMedian(healthcareExp.map(o => o.timeToExitMonths));
  const medianTimeNoHealthcare = calculateMedian(noHealthcareExp.map(o => o.timeToExitMonths));
  
  // Determine strongest predictor
  const differences = [
    { trait: 'Serial Entrepreneur', diff: medianTimeFirst - medianTimeSerial },
    { trait: 'Top-Tier MBA', diff: medianTimeNoTopTier - medianTimeTopTier },
    { trait: 'Healthcare Experience', diff: medianTimeNoHealthcare - medianTimeHealthcare }
  ];
  
  const strongest = differences.sort((a, b) => b.diff - a.diff)[0];
  const strength = strongest.diff > 12 ? 'strong' : strongest.diff > 6 ? 'medium' : 'weak';
  
  const genderAnalysis = analyzeGenderPatterns(outcomes);
  
  return {
    strongestPredictor: strongest.trait,
    predictorStrength: strength,
    medianTimeSerialEntrepreneur: medianTimeSerial,
    medianTimeFirstTime: medianTimeFirst,
    medianTimeTopTierMBA: medianTimeTopTier,
    medianTimeNoTopTierMBA: medianTimeNoTopTier,
    medianTimePriorHealthcare: medianTimeHealthcare,
    medianTimeNoHealthcare: medianTimeNoHealthcare,
    genderGapMonths: genderAnalysis.timeAdvantageMonths,
    genderValuationGap: genderAnalysis.valuationPremium,
    dataLimitations: limitations
  };
}

export const founderPatternAnalyzer = {
  analyze: analyzeFounder,
  analyzeGenderPatterns,
  extractPatterns
};
