import type { EvidenceClass } from "@/lib/evidence";
import type { EvidenceInputs } from "@/lib/evidence/evidenceMaturityCalculator";

/**
 * Conservative taxonomy priors for evidence maturity when live CTG/FDA
 * enrichment has not run. Used only when the company has a stored
 * `evidenceClass` — not a substitute for trial/regulatory lookups, and not
 * applied when the class is missing.
 */
const TAXONOMY_BASELINE: Record<EvidenceClass, EvidenceInputs> = {
  clinical_therapeutic: {
    highestPhase: "PHASE2",
    totalTrials: 1,
    hasPostedResults: false,
    highestFDAClearance: "None",
    hasDrugApproval: false,
    totalFDAProducts: 0,
  },
  diagnostic_genomic: {
    highestPhase: "PHASE1",
    totalTrials: 1,
    hasPostedResults: false,
    highestFDAClearance: "510(K)",
    hasDrugApproval: false,
    totalFDAProducts: 1,
  },
  fertility_science: {
    highestPhase: "PHASE2",
    totalTrials: 1,
    hasPostedResults: false,
    highestFDAClearance: "None",
    hasDrugApproval: false,
    totalFDAProducts: 0,
  },
  care_delivery: {
    highestPhase: "NA",
    totalTrials: 1,
    hasPostedResults: false,
    highestFDAClearance: "None",
    hasDrugApproval: false,
    totalFDAProducts: 0,
  },
  consumer_wellness: {
    highestPhase: "None",
    totalTrials: 0,
    hasPostedResults: false,
    highestFDAClearance: "None",
    hasDrugApproval: false,
    totalFDAProducts: 0,
  },
  portfolio_investment: {
    highestPhase: "None",
    totalTrials: 0,
    hasPostedResults: false,
    highestFDAClearance: "None",
    hasDrugApproval: false,
    totalFDAProducts: 0,
  },
};

export type EvidenceInputSource = "live" | "taxonomy" | "empty";

/** Taxonomy prior inputs from a stored evidence class. */
export function deriveTaxonomyEvidenceInputs(
  evidenceClass: EvidenceClass,
): EvidenceInputs {
  return TAXONOMY_BASELINE[evidenceClass];
}

/** True when CTG/FDA maps contain real enrichment for this company name. */
export function hasLiveEvidenceEnrichment(
  companyName: string,
  ctg: { trials: number; highestPhase: string } | undefined,
  fda: { clearance: string; hasDrug: boolean; products: number } | undefined,
): boolean {
  if (!ctg && !fda) return false;
  if (ctg && (ctg.trials > 0 || ctg.highestPhase !== "None")) return true;
  if (
    fda &&
    (fda.hasDrug || fda.products > 0 ||
      (fda.clearance && fda.clearance !== "None"))
  ) {
    return true;
  }
  return false;
}

/** Prefer live API enrichment; use a stored class taxonomy prior; else empty. */
export function resolveEvidenceInputs(
  evidenceClass: EvidenceClass | undefined,
  ctg:
    | { trials: number; highestPhase: string; hasResults: boolean }
    | undefined,
  fda: { clearance: string; hasDrug: boolean; products: number } | undefined,
): { inputs: EvidenceInputs; source: EvidenceInputSource } {
  const live = hasLiveEvidenceEnrichment(
    "",
    ctg ? { trials: ctg.trials, highestPhase: ctg.highestPhase } : undefined,
    fda
      ? {
        clearance: fda.clearance,
        hasDrug: fda.hasDrug,
        products: fda.products,
      }
      : undefined,
  );

  if (live) {
    return {
      source: "live",
      inputs: {
        highestPhase: ctg?.highestPhase || "None",
        totalTrials: ctg?.trials || 0,
        hasPostedResults: ctg?.hasResults || false,
        highestFDAClearance: fda?.clearance || "None",
        hasDrugApproval: fda?.hasDrug || false,
        totalFDAProducts: fda?.products || 0,
      },
    };
  }

  if (evidenceClass && evidenceClass !== "portfolio_investment") {
    return {
      source: "taxonomy",
      inputs: deriveTaxonomyEvidenceInputs(evidenceClass),
    };
  }

  return {
    source: "empty",
    inputs: {
      highestPhase: "None",
      totalTrials: 0,
      hasPostedResults: false,
      highestFDAClearance: "None",
      hasDrugApproval: false,
      totalFDAProducts: 0,
    },
  };
}
