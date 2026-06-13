/**
 * Evidence Maturity Score (0–100) calculator.
 *
 * Composite of four sub-scores:
 *   Phase Score (30%) — highest clinical trial phase
 *   FDA Status Score (30%) — highest regulatory clearance/approval
 *   Clinical Results Score (20%) — posted results on CTG
 *   Publication Score (20%) — peer-reviewed evidence basis
 */

export interface EvidenceInputs {
  /** Highest trial phase from ClinicalTrials.gov */
  highestPhase: string;
  /** Total trial count */
  totalTrials: number;
  /** Whether any trial has posted results */
  hasPostedResults: boolean;
  /** Highest FDA clearance type */
  highestFDAClearance: string;
  /** Whether the company has an approved drug (NDA) */
  hasDrugApproval: boolean;
  /** Total FDA-regulated products */
  totalFDAProducts: number;
}

export interface EvidenceScore {
  overall: number;
  phaseScore: number;
  fdaStatusScore: number;
  clinicalResultsScore: number;
  publicationScore: number;
  tier:
    | "Pre-clinical"
    | "Early Evidence"
    | "Growing Evidence"
    | "Strong Evidence"
    | "Regulatory Validated";
  tierColor: string;
  narrative: string;
}

const PHASE_SCORES: Record<string, number> = {
  None: 0,
  "Not Applicable": 5,
  NA: 5,
  EARLY_PHASE1: 15,
  PHASE1: 20,
  PHASE2: 40,
  PHASE3: 70,
  "PHASE3_COMPLETE": 100,
};

const FDA_SCORES: Record<string, number> = {
  None: 0,
  "510(K)": 50,
  "510(k)": 50,
  "DE NOVO": 70,
  "De Novo": 70,
  PMA: 85,
  NDA: 100,
};

/** Calculate Phase Score (0–100). */
function calcPhaseScore(highestPhase: string, totalTrials: number): number {
  if (totalTrials === 0) return 0;
  return PHASE_SCORES[highestPhase] ?? 10;
}

/** Calculate FDA Status Score (0–100). */
function calcFDAScore(clearance: string, hasDrug: boolean): number {
  if (hasDrug) return 100;
  return FDA_SCORES[clearance] ?? 0;
}

/** Calculate Clinical Results Score (0–100). */
function calcResultsScore(hasPosted: boolean, totalTrials: number): number {
  if (totalTrials === 0) return 0;
  return hasPosted ? 50 : 0;
}

/**
 * Publication Score proxy — in a static dataset we can't query PubMed live,
 * so we estimate from trial maturity + posted results + FDA status.
 */
function calcPublicationProxy(
  highestPhase: string,
  hasPostedResults: boolean,
  hasDrugApproval: boolean,
): number {
  if (hasDrugApproval) return 80;
  if (
    hasPostedResults &&
    (highestPhase === "PHASE3" || highestPhase === "PHASE3_COMPLETE")
  ) return 70;
  if (hasPostedResults) return 40;
  if (highestPhase === "PHASE2" || highestPhase === "PHASE3") return 25;
  return 0;
}

function tier(score: number): EvidenceScore["tier"] {
  if (score >= 75) return "Regulatory Validated";
  if (score >= 50) return "Strong Evidence";
  if (score >= 30) return "Growing Evidence";
  if (score >= 10) return "Early Evidence";
  return "Pre-clinical";
}

function tierColor(t: EvidenceScore["tier"]): string {
  switch (t) {
    case "Regulatory Validated":
      return "emerald";
    case "Strong Evidence":
      return "sky";
    case "Growing Evidence":
      return "amber";
    case "Early Evidence":
      return "orange";
    case "Pre-clinical":
      return "slate";
  }
}

function narrative(inputs: EvidenceInputs, score: number): string {
  if (score >= 75) {
    return `FDA-cleared/approved product with ${inputs.totalTrials} clinical trial(s) — strong regulatory validation at time of acquisition.`;
  }
  if (score >= 50) {
    return `Significant clinical evidence (${
      inputs.highestPhase.replace("PHASE", "Phase ").replace("_", "/")
    }) with ${inputs.totalTrials} trial(s) — acquirer had high confidence in efficacy data.`;
  }
  if (score >= 30) {
    return `Growing clinical evidence (${inputs.totalTrials} trial(s), ${
      inputs.highestPhase.replace("PHASE", "Phase ")
    }) — acquisition likely driven by pipeline potential.`;
  }
  if (inputs.totalTrials > 0) {
    return `Early-stage evidence (${inputs.totalTrials} trial(s)) — acquisition may reflect strategic platform value or technology bet.`;
  }
  return "No clinical trials or FDA products found — acquisition likely based on technology, team, or market position rather than clinical evidence.";
}

/** Compute Evidence Maturity Score for a company. */
export function computeEvidenceMaturity(inputs: EvidenceInputs): EvidenceScore {
  const phaseScore = calcPhaseScore(inputs.highestPhase, inputs.totalTrials);
  const fdaStatusScore = calcFDAScore(
    inputs.highestFDAClearance,
    inputs.hasDrugApproval,
  );
  const clinicalResultsScore = calcResultsScore(
    inputs.hasPostedResults,
    inputs.totalTrials,
  );
  const publicationScore = calcPublicationProxy(
    inputs.highestPhase,
    inputs.hasPostedResults,
    inputs.hasDrugApproval,
  );

  const overall = Math.round(
    phaseScore * 0.3 +
      fdaStatusScore * 0.3 +
      clinicalResultsScore * 0.2 +
      publicationScore * 0.2,
  );

  const t = tier(overall);

  return {
    overall,
    phaseScore,
    fdaStatusScore,
    clinicalResultsScore,
    publicationScore,
    tier: t,
    tierColor: tierColor(t),
    narrative: narrative(inputs, overall),
  };
}
