/**
 * Evidence Maturity Calculator
 * 
 * Calculates comprehensive 0-100 evidence maturity score combining:
 * - Clinical trial phase (30%)
 * - FDA status (30%)
 * - Clinical results availability (20%)
 * - Publication quality (20%)
 */

import { 
  ClinicalTrial, 
  TrialPhase, 
  PHASE_SCORES,
  CompanyTrialProfile 
} from './clinicaltrials-mcp-connector';
import { 
  FDAProduct, 
  CompanyFDAProfile, 
  FDA_CLEARANCE_SCORES 
} from './openfda-mcp-connector';

export interface EvidenceMaturityInput {
  companyId: string;
  companyName: string;
  acquisitionDate?: string;
  trials: ClinicalTrial[];
  fdaProducts: FDAProduct[];
  manualPublications?: PublicationRecord[];
}

export interface PublicationRecord {
  title: string;
  doi?: string;
  journalName?: string;
  isFlagship: boolean;
  isPreprint: boolean;
  publicationDate?: string;
  peerReviewed: boolean;
}

export interface EvidenceMaturityScore {
  overallScore: number; // 0-100
  phaseScore: number; // 0-100
  fdaStatusScore: number; // 0-100
  clinicalResultsScore: number; // 0-100
  publicationScore: number; // 0-100
  
  // Detailed breakdown
  maxPhase: TrialPhase;
  highestFDAStatus: string;
  hasPhase3Results: boolean;
  hasPublishedResults: boolean;
  hasFlagshipPublication: boolean;
  
  // Timeline insights
  timelineInsights: TimelineInsight[];
  
  // Acquisition context
  atAcquisition: {
    evidenceScore: number;
    phase: TrialPhase;
    hadFDAApproval: boolean;
    monthsSinceApproval?: number;
    description: string;
  };
}

export interface TimelineInsight {
  date: string;
  event: string;
  type: 'trial_start' | 'trial_complete' | 'fda_approval' | 'publication' | 'acquisition';
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
}

// Flagship journals for publication scoring
const FLAGSHIP_JOURNALS = [
  'JAMA', 'New England Journal of Medicine', 'NEJM', 'The Lancet', 'Lancet',
  'Nature Medicine', 'Nature', 'Cell', 'Science',
  'British Medical Journal', 'BMJ', 'The BMJ',
  'Annals of Internal Medicine',
  'Journal of Clinical Oncology',
  'Obstetrics & Gynecology', 'Green Journal',
  'American Journal of Obstetrics & Gynecology', 'AJOG',
  'Fertility and Sterility', 'F&S',
  'Human Reproduction', 'HR',
  'Contraception',
  'Menopause',
  'BJOG: An International Journal of Obstetrics & Gynaecology'
];

/**
 * Calculate comprehensive evidence maturity score
 */
export function calculateEvidenceMaturity(
  input: EvidenceMaturityInput
): EvidenceMaturityScore {
  // 1. Phase Score (30% weight)
  const phaseScore = calculatePhaseScore(input.trials);
  const maxPhase = getMaxPhase(input.trials);

  // 2. FDA Status Score (30% weight)
  const fdaStatusScore = calculateFDAScore(input.fdaProducts);
  const highestFDAStatus = getHighestFDAStatus(input.fdaProducts);

  // 3. Clinical Results Score (20% weight)
  const clinicalResultsScore = calculateClinicalResultsScore(input.trials);
  const hasPhase3Results = hasResultsForPhase(input.trials, 'PHASE_3');

  // 4. Publication Score (20% weight)
  const publicationScore = calculatePublicationScore(
    input.trials,
    input.manualPublications || []
  );
  const hasPublishedResults = input.trials.some(t => t.hasPublishedResults);
  const hasFlagshipPublication = input.trials.some(t => t.isFlagshipJournal) ||
    (input.manualPublications || []).some(p => p.isFlagship);

  // Calculate overall score
  const overallScore = Math.round(
    phaseScore * 0.30 +
    fdaStatusScore * 0.30 +
    clinicalResultsScore * 0.20 +
    publicationScore * 0.20
  );

  // Generate timeline insights
  const timelineInsights = generateTimelineInsights(
    input.trials,
    input.fdaProducts,
    input.acquisitionDate
  );

  // Calculate acquisition context
  const atAcquisition = calculateAcquisitionContext(
    input.trials,
    input.fdaProducts,
    input.acquisitionDate,
    overallScore
  );

  return {
    overallScore,
    phaseScore,
    fdaStatusScore,
    clinicalResultsScore,
    publicationScore,
    maxPhase,
    highestFDAStatus,
    hasPhase3Results,
    hasPublishedResults,
    hasFlagshipPublication,
    timelineInsights,
    atAcquisition
  };
}

/**
 * Calculate phase score based on highest phase reached
 */
function calculatePhaseScore(trials: ClinicalTrial[]): number {
  if (trials.length === 0) return 0;
  
  const maxPhase = getMaxPhase(trials);
  return PHASE_SCORES[maxPhase];
}

function getMaxPhase(trials: ClinicalTrial[]): TrialPhase {
  if (trials.length === 0) return 'PRECLINICAL';
  
  const phaseOrder: TrialPhase[] = [
    'PRECLINICAL', 'EARLY_PHASE_1', 'PHASE_1', 'PHASE_1_2', 
    'PHASE_2', 'PHASE_2_3', 'PHASE_3', 'PHASE_4'
  ];
  
  let maxIndex = 0;
  for (const trial of trials) {
    const index = phaseOrder.indexOf(trial.phase);
    if (index > maxIndex) maxIndex = index;
  }
  
  return phaseOrder[maxIndex];
}

/**
 * Calculate FDA status score
 */
function calculateFDAScore(products: FDAProduct[]): number {
  if (products.length === 0) return 0;
  
  // Score based on highest clearance type
  const scores = products.map(p => FDA_CLEARANCE_SCORES[p.clearanceType] || 0);
  return Math.max(...scores);
}

function getHighestFDAStatus(products: FDAProduct[]): string {
  if (products.length === 0) return 'None';
  
  const hierarchy = ['None', '510k', 'OTC', 'ANDA', 'DENovo', 'BLA', 'HDE', 'PMA', 'NDA'];
  let highest = 'None';
  
  for (const product of products) {
    const currentIndex = hierarchy.indexOf(product.clearanceType);
    const highestIndex = hierarchy.indexOf(highest);
    if (currentIndex > highestIndex) {
      highest = product.clearanceType;
    }
  }
  
  return highest;
}

/**
 * Calculate clinical results score
 */
function calculateClinicalResultsScore(trials: ClinicalTrial[]): number {
  if (trials.length === 0) return 0;
  
  const completedTrials = trials.filter(t => 
    t.status === 'COMPLETED' || t.status === 'ACTIVE_NOT_RECRUITING'
  );
  
  if (completedTrials.length === 0) return 0;
  
  const trialsWithResults = completedTrials.filter(t => t.postedResults).length;
  const resultsRatio = trialsWithResults / completedTrials.length;
  
  return Math.round(resultsRatio * 100);
}

function hasResultsForPhase(trials: ClinicalTrial[], phase: TrialPhase): boolean {
  return trials.some(t => 
    t.phase === phase && (t.postedResults || t.hasPublishedResults)
  );
}

/**
 * Calculate publication quality score
 */
function calculatePublicationScore(
  trials: ClinicalTrial[],
  manualPublications: PublicationRecord[]
): number {
  // Publications from trials
  const trialFlagshipCount = trials.filter(t => t.isFlagshipJournal).length;
  const trialRegularCount = trials.filter(t => t.hasPublishedResults && !t.isFlagshipJournal).length;
  
  // Manual publications
  const manualFlagshipCount = manualPublications.filter(p => p.isFlagship).length;
  const manualRegularCount = manualPublications.filter(p => p.peerReviewed && !p.isFlagship).length;
  const preprintCount = manualPublications.filter(p => p.isPreprint).length;
  
  // Calculate score
  let score = 0;
  
  // Flagship publications: 100 points each (max 100)
  const flagshipTotal = trialFlagshipCount + manualFlagshipCount;
  if (flagshipTotal > 0) score = 100;
  else {
    // Regular publications: 60 points
    const regularTotal = trialRegularCount + manualRegularCount;
    if (regularTotal > 0) score = 60;
    else if (preprintCount > 0) score = 30;
  }
  
  return score;
}

/**
 * Generate timeline insights
 */
function generateTimelineInsights(
  trials: ClinicalTrial[],
  products: FDAProduct[],
  acquisitionDate?: string
): TimelineInsight[] {
  const insights: TimelineInsight[] = [];
  
  // Trial start events
  for (const trial of trials) {
    if (trial.startDate) {
      insights.push({
        date: trial.startDate,
        event: `${trial.phase} Trial Started`,
        type: 'trial_start',
        description: `${trial.title.substring(0, 50)}...`,
        impact: 'positive'
      });
    }
    
    if (trial.completionDate) {
      insights.push({
        date: trial.completionDate,
        event: `${trial.phase} Trial Completed`,
        type: 'trial_complete',
        description: trial.postedResults ? 'Results posted' : 'Results pending',
        impact: trial.postedResults ? 'positive' : 'neutral'
      });
    }
  }
  
  // FDA approval events
  for (const product of products) {
    insights.push({
      date: product.approvalDate,
      event: `FDA ${product.clearanceType} Approved`,
      type: 'fda_approval',
      description: product.productName,
      impact: 'positive'
    });
  }
  
  // Acquisition event
  if (acquisitionDate) {
    insights.push({
      date: acquisitionDate,
      event: 'Company Acquired',
      type: 'acquisition',
      description: 'Acquisition date',
      impact: 'positive'
    });
  }
  
  // Sort by date
  return insights.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Calculate evidence maturity at acquisition time
 */
function calculateAcquisitionContext(
  trials: ClinicalTrial[],
  products: FDAProduct[],
  acquisitionDate?: string,
  currentScore: number = 0
): EvidenceMaturityScore['atAcquisition'] {
  if (!acquisitionDate) {
    return {
      evidenceScore: currentScore,
      phase: getMaxPhase(trials),
      hadFDAApproval: products.length > 0,
      description: 'No acquisition date specified - showing current status'
    };
  }
  
  const acquisitionTime = new Date(acquisitionDate).getTime();
  
  // Filter trials active at acquisition
  const activeTrials = trials.filter(t => {
    const start = t.startDate ? new Date(t.startDate).getTime() : 0;
    const complete = t.completionDate ? new Date(t.completionDate).getTime() : Infinity;
    return start <= acquisitionTime && acquisitionTime <= complete;
  });
  
  // Find FDA approvals before acquisition
  const approvalsBefore = products.filter(p => 
    new Date(p.approvalDate).getTime() <= acquisitionTime
  );
  
  const hadFDAApproval = approvalsBefore.length > 0;
  const phaseAtAcquisition = getMaxPhase(activeTrials);
  
  // Calculate months since approval
  let monthsSinceApproval: number | undefined;
  let description: string;
  
  if (hadFDAApproval) {
    const latestApproval = Math.max(...approvalsBefore.map(p => 
      new Date(p.approvalDate).getTime()
    ));
    const diffMs = acquisitionTime - latestApproval;
    monthsSinceApproval = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsSinceApproval < 0) {
      description = `Acquired ${Math.abs(monthsSinceApproval)} months BEFORE FDA approval`;
    } else if (monthsSinceApproval < 6) {
      description = `Acquired within 6 months of FDA approval (valuation trigger)`;
    } else {
      description = `Acquired ${monthsSinceApproval} months post-FDA approval`;
    }
  } else {
    description = `Pre-FDA approval acquisition (${phaseAtAcquisition} phase)`;
  }
  
  return {
    evidenceScore: calculateHistoricalScore(activeTrials, approvalsBefore),
    phase: phaseAtAcquisition,
    hadFDAApproval,
    monthsSinceApproval,
    description
  };
}

function calculateHistoricalScore(
  trials: ClinicalTrial[],
  products: FDAProduct[]
): number {
  const phaseScore = calculatePhaseScore(trials);
  const fdaScore = calculateFDAScore(products);
  const resultsScore = calculateClinicalResultsScore(trials);
  
  return Math.round(phaseScore * 0.30 + fdaScore * 0.30 + resultsScore * 0.20);
}

/**
 * Batch analyze multiple companies
 */
export function batchCalculateEvidenceMaturity(
  inputs: EvidenceMaturityInput[]
): Map<string, EvidenceMaturityScore> {
  const results = new Map<string, EvidenceMaturityScore>();
  
  for (const input of inputs) {
    const score = calculateEvidenceMaturity(input);
    results.set(input.companyId, score);
  }
  
  return results;
}

/**
 * Get evidence maturity category
 */
export function getMaturityCategory(score: number): {
  category: 'high' | 'medium' | 'low' | 'none';
  label: string;
  description: string;
} {
  if (score >= 75) {
    return {
      category: 'high',
      label: 'High Evidence Maturity',
      description: 'Phase 3+ trials, FDA approval, published results'
    };
  } else if (score >= 50) {
    return {
      category: 'medium',
      label: 'Medium Evidence Maturity',
      description: 'Phase 2 trials, pending FDA or results'
    };
  } else if (score >= 25) {
    return {
      category: 'low',
      label: 'Low Evidence Maturity',
      description: 'Early phase trials, no FDA product'
    };
  } else {
    return {
      category: 'none',
      label: 'No Clinical Evidence',
      description: 'No registered trials or regulatory submissions'
    };
  }
}

export const evidenceMaturityCalculator = {
  calculate: calculateEvidenceMaturity,
  batchCalculate: batchCalculateEvidenceMaturity,
  getCategory: getMaturityCategory
};
