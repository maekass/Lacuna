/**
 * Heuristic priors and classification helpers for the quant engine.
 * Distinct from empiricalPriors.ts (verified-dataset derivation).
 */

import type { ClinicalStage, QuantCompany } from "./types";

export type ValuationType = "diagnostic" | "femtech" | "biotech";

export const MARKET_MULTIPLES = {
  revenue: {
    diagnostic: 6.0,
    femtech: 8.0,
    biotech_phase3: 2.5,
    biotech_approved: 8.0,
  },
  ebitda: {
    diagnostic: 18,
    femtech: 20,
    biotech: 25,
  },
} as const;

export const TAM_FORWARD_MULTIPLE = 6;
export const TAM_PENETRATION = 0.05;
export const TAM_MARGIN = 0.3;

export const STAGE_RD_MULTIPLES: Record<ClinicalStage, number> = {
  preclinical: 1.0,
  phase2: 1.2,
  phase3: 2.5,
  fda_approved: 8.0,
};

export const EXIT_MULTIPLE_BY_STAGE: Record<ClinicalStage, number> = {
  preclinical: 4.0,
  phase2: 3.0,
  phase3: 2.2,
  fda_approved: 1.8,
};

export const IMPACT_ASSUMPTIONS = {
  yearsOut: 5,
  annualTestingRate: 0.2,
  population: { africa: 50e6, other: 10e6 },
  baselineMortalityRate: { africa: 0.01, other: 0.002 },
  africaAdoptionFactor: 0.7,
  testPriceUS: 800,
  testPriceAfrica: 50,
  maxMortalityReduction: 0.3,
} as const;

export const DRIVER_WEIGHTS = {
  clinicalValidation: 0.25,
  marketTiming: 0.2,
  teamQuality: 0.2,
  strategicFit: 0.2,
  geographicArbitrage: 0.15,
} as const;

export const UNCALIBRATED_BASE_RATE = 0.35;

export function classifyValuationType(sector: string): ValuationType {
  const s = sector.toLowerCase();
  if (
    s.includes("diagn") || s.includes("screen") || s.includes("test") ||
    s.includes("imaging")
  ) {
    return "diagnostic";
  }
  if (
    s.includes("biotech") || s.includes("therap") || s.includes("pharma") ||
    s.includes("drug") || s.includes("gene")
  ) {
    return "biotech";
  }
  return "femtech";
}

export function geographicMultiplier(company: QuantCompany): number {
  if (!company.geographicFocus.includes("Africa")) return 1.0;
  return company.africaDiscountMultiplier ?? 0.65;
}

export function revenueMultiple(company: QuantCompany): number {
  const type = classifyValuationType(company.sector);
  if (type === "biotech") {
    return company.clinicalStage === "fda_approved"
      ? MARKET_MULTIPLES.revenue.biotech_approved
      : MARKET_MULTIPLES.revenue.biotech_phase3;
  }
  if (type === "femtech") return MARKET_MULTIPLES.revenue.femtech;
  return MARKET_MULTIPLES.revenue.diagnostic;
}

export function ebitdaMultiple(company: QuantCompany): number {
  const type = classifyValuationType(company.sector);
  if (type === "biotech") return MARKET_MULTIPLES.ebitda.biotech;
  if (type === "femtech") return MARKET_MULTIPLES.ebitda.femtech;
  return MARKET_MULTIPLES.ebitda.diagnostic;
}

export const yearFiveIndex = IMPACT_ASSUMPTIONS.yearsOut - 1;
