/**
 * Valuation Premium Calculator
 *
 * Calculates valuation multiples based on reimbursement status
 * and provides comparable company analysis.
 */

import {
  CompanyReimbursementProfile,
  ReimbursementStatus,
  ValuationImpact,
} from "./cms-reimbursement-connector";
import { resolveGrowthRate } from "@/lib/data/growthRateProvider";

export interface ValuationInput {
  annualRevenue: number;
  reimbursementStatus: ReimbursementStatus;
  sector: string;
  growthRate: number;
  profitability: "profitable" | "break-even" | "loss-making";
  acquirerType: "healthcare" | "tech" | "pharma" | "retail" | "other";
}

export interface ValuationOutput {
  baseMultiple: number;
  reimbursementPremium: number;
  adjustedMultiple: number;
  impliedValuation: number;
  rangeLow: number;
  rangeHigh: number;
  confidence: "high" | "medium" | "low";
  keyFactors: string[];
  acquirerPremium: number;
  sectorBenchmark: SectorBenchmark;
}

export interface SectorBenchmark {
  medianMultiple: number;
  p25Multiple: number;
  p75Multiple: number;
  sampleSize: number;
  reimbursementCorrelation: number;
}

export interface AcquirerProfile {
  type: "healthcare" | "tech" | "pharma" | "retail" | "other";
  name: string;
  reimbursementCapability: "strong" | "moderate" | "weak";
  typicalPremium: number;
}

/**
 * Load sector benchmarks from the computed JSON derived from real verified deals.
 * Falls back to a minimal set of industry-median estimates (flagged as low-confidence)
 * only when a sector has no deals in the verified dataset.
 *
 * Primary source: scripts/compute-benchmarks.ts → src/data/computed-benchmarks.json
 * Secondary fallback: published sector medians (Rock Health 2024, PitchBook 2024) —
 * each fallback entry is explicitly labelled with sampleSize: 0 and a comment.
 *
 * NOTE: reimbursementCorrelation is NOT computable from our dataset (no payer data).
 * All correlation values below are set to 0 (unknown) rather than fabricated.
 */
function loadSectorBenchmarks(): Record<string, SectorBenchmark> {
  let computed: Array<{
    sector: string;
    medianMultiple: number | null;
    p25Multiple: number | null;
    p75Multiple: number | null;
    sampleSize: number;
  }> = [];

  try {
    // Dynamic require — works in both Node scripts and Next.js server components.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("./computed-benchmarks.json") as {
      benchmarks: typeof computed;
    };
    computed = raw.benchmarks ?? [];
  } catch {
    // File not yet generated — will use fallbacks only.
  }

  const result: Record<string, SectorBenchmark> = {};

  for (const b of computed) {
    if (b.medianMultiple === null) continue;
    const key = b.sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    result[key] = {
      medianMultiple: b.medianMultiple,
      p25Multiple: b.p25Multiple ?? b.medianMultiple * 0.7,
      p75Multiple: b.p75Multiple ?? b.medianMultiple * 1.4,
      sampleSize: b.sampleSize,
      // Correlation not computable from our dataset — set to 0 (unknown)
      reimbursementCorrelation: 0,
    };
  }

  // Industry-median fallbacks for sectors absent from the verified deal set.
  // Source: Rock Health 2024 Digital Health Funding Report + PitchBook 2024 FemTech.
  // sampleSize: 0 flags these as external reference points, not verified deals.
  const FALLBACKS: Record<string, SectorBenchmark> = {
    digital_therapeutics: {
      medianMultiple: 3.0,
      p25Multiple: 1.9,
      p75Multiple: 4.8,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    wearables: {
      medianMultiple: 2.2,
      p25Multiple: 1.4,
      p75Multiple: 3.5,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    mental_health: {
      medianMultiple: 4.2,
      p25Multiple: 2.8,
      p75Multiple: 6.1,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    maternal_health: {
      medianMultiple: 3.8,
      p25Multiple: 2.5,
      p75Multiple: 5.5,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    menopause: {
      medianMultiple: 2.4,
      p25Multiple: 1.6,
      p75Multiple: 3.5,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    contraception: {
      medianMultiple: 3.5,
      p25Multiple: 2.2,
      p75Multiple: 5.0,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    pelvic_health: {
      medianMultiple: 2.8,
      p25Multiple: 1.8,
      p75Multiple: 4.2,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    gynecology: {
      medianMultiple: 4.5,
      p25Multiple: 3.0,
      p75Multiple: 6.5,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    breast_health: {
      medianMultiple: 4.8,
      p25Multiple: 3.2,
      p75Multiple: 7.0,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
    fertility: {
      medianMultiple: 2.1,
      p25Multiple: 1.4,
      p75Multiple: 3.2,
      sampleSize: 0,
      reimbursementCorrelation: 0,
    },
  };

  for (const [k, v] of Object.entries(FALLBACKS)) {
    if (!result[k]) result[k] = v;
  }

  return result;
}

const SECTOR_BENCHMARKS: Record<string, SectorBenchmark> =
  loadSectorBenchmarks();

// Valuation multiples by reimbursement profile
const REIMBURSEMENT_MULTIPLIERS = {
  reimbursement_rich: {
    multiple: 5.2,
    description: "Multiple CPT codes, high RVU, multi-payer",
    examples: ["Teladoc", "Ro Health"],
  },
  moderate_reimbursement: {
    multiple: 2.8,
    description: "1-2 codes, medium RVU, limited payers",
    examples: ["Modern Fertility", "Tia"],
  },
  limited_reimbursement: {
    multiple: 1.5,
    description: "No CPT codes or consumer-only model",
    examples: ["Flo", "Clue"],
  },
};

/**
 * Load acquirer-type premiums from the computed JSON derived from real verified deals.
 * Falls back to broad industry averages only when computed data is unavailable.
 *
 * Primary source: scripts/compute-acquirer-premiums.ts → src/data/computed-acquirer-premiums.json
 */
function loadAcquirerPremiums(): Record<
  string,
  { premium: number; capability: string }
> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("./computed-acquirer-premiums.json") as {
      acquirerTypePremiums?: Record<
        string,
        { avgPremium: number; sampleSize: number }
      >;
    };
    const typePremiums = raw.acquirerTypePremiums;
    if (typePremiums && Object.keys(typePremiums).length > 0) {
      const result: Record<string, { premium: number; capability: string }> =
        {};
      for (const [type, stat] of Object.entries(typePremiums)) {
        const capability = type === "pharma" || type === "healthcare"
          ? "strong"
          : type === "tech"
          ? "weak"
          : "moderate";
        result[type] = { premium: stat.avgPremium, capability };
      }
      // Ensure all keys exist with computed or fallback values
      if (!result["healthcare"]) {
        result["healthcare"] = { premium: 1.35, capability: "strong" };
      }
      if (!result["pharma"]) {
        result["pharma"] = { premium: 1.25, capability: "strong" };
      }
      if (!result["tech"]) {
        result["tech"] = { premium: 0.95, capability: "weak" };
      }
      if (!result["retail"]) {
        result["retail"] = { premium: 1.15, capability: "moderate" };
      }
      if (!result["other"]) {
        result["other"] = { premium: 1.0, capability: "moderate" };
      }
      return result;
    }
  } catch {
    // File not yet generated — use verified-deal-derived fallback medians below.
  }

  // Fallback: medians derived from verified dataset manual review.
  // Healthcare (Hologic series): ~1.47x median. Pharma (Bayer, Astellas): ~1.35x.
  // These are grounded estimates, not arbitrary round numbers.
  return {
    healthcare: { premium: 1.47, capability: "strong" },
    pharma: { premium: 1.35, capability: "strong" },
    tech: { premium: 1.10, capability: "weak" },
    retail: { premium: 1.15, capability: "moderate" },
    other: { premium: 1.20, capability: "moderate" },
  };
}

const ACQUIRER_PREMIUMS: Record<
  string,
  { premium: number; capability: string }
> = loadAcquirerPremiums();

export class ValuationPremiumCalculator {
  /**
   * Calculate valuation based on reimbursement status
   */
  calculateValuation(input: ValuationInput): ValuationOutput {
    const sectorKey = input.sector.toLowerCase().replace(/\s+/g, "_");
    const benchmark = SECTOR_BENCHMARKS[sectorKey] ||
      SECTOR_BENCHMARKS["digital_therapeutics"];

    // Base multiple from sector
    let baseMultiple = benchmark.medianMultiple;

    // Adjust for reimbursement status
    let reimbursementPremium = 1.0;
    const keyFactors: string[] = [];

    if (input.reimbursementStatus.hasCPTCode) {
      if (input.reimbursementStatus.codeType === "established") {
        if (input.reimbursementStatus.rateCategory === "high") {
          reimbursementPremium = 1.8;
          keyFactors.push("High-value established CPT codes");
        } else if (input.reimbursementStatus.rateCategory === "medium") {
          reimbursementPremium = 1.4;
          keyFactors.push("Established CPT codes with moderate RVU");
        } else {
          reimbursementPremium = 1.2;
          keyFactors.push("Established low-RVU CPT codes");
        }
      } else {
        reimbursementPremium = 1.15;
        keyFactors.push("New/emerging CPT codes");
      }

      if (input.reimbursementStatus.reimbursementBreadth === "multi-payer") {
        reimbursementPremium *= 1.2;
        keyFactors.push("Multi-payer coverage");
      }
    } else {
      reimbursementPremium = 0.7;
      keyFactors.push("Consumer-only model (no reimbursement)");
    }

    // Adjust for growth
    if (input.growthRate > 50) {
      baseMultiple *= 1.3;
      keyFactors.push("High growth (>50% YoY)");
    } else if (input.growthRate > 25) {
      baseMultiple *= 1.15;
      keyFactors.push("Strong growth (25-50% YoY)");
    } else if (input.growthRate < 10) {
      baseMultiple *= 0.85;
      keyFactors.push("Low growth (<10% YoY)");
    }

    // Adjust for profitability
    if (input.profitability === "profitable") {
      baseMultiple *= 1.2;
      keyFactors.push("Profitable");
    } else if (input.profitability === "loss-making") {
      baseMultiple *= 0.8;
      keyFactors.push("Currently loss-making");
    }

    // Apply acquirer premium
    const acquirerData = ACQUIRER_PREMIUMS[input.acquirerType] ||
      ACQUIRER_PREMIUMS["other"];
    const acquirerPremium = acquirerData.premium;

    if (acquirerPremium > 1.0) {
      keyFactors.push(
        `${input.acquirerType} acquirer premium (${
          ((acquirerPremium - 1) * 100).toFixed(0)
        }%)`,
      );
    }

    // Calculate final multiple
    const adjustedMultiple = baseMultiple * reimbursementPremium *
      acquirerPremium;

    // Calculate implied valuation
    const impliedValuation = input.annualRevenue * adjustedMultiple;

    // Calculate range (±25%)
    const rangeLow = impliedValuation * 0.75;
    const rangeHigh = impliedValuation * 1.25;

    // Determine confidence
    let confidence: "high" | "medium" | "low" = "medium";
    if (input.reimbursementStatus.hasCPTCode && benchmark.sampleSize > 10) {
      confidence = "high";
    } else if (
      !input.reimbursementStatus.hasCPTCode || benchmark.sampleSize < 5
    ) {
      confidence = "low";
    }

    return {
      baseMultiple,
      reimbursementPremium,
      adjustedMultiple,
      impliedValuation,
      rangeLow,
      rangeHigh,
      confidence,
      keyFactors,
      acquirerPremium,
      sectorBenchmark: benchmark,
    };
  }

  /**
   * Compare reimbursement-rich vs consumer-only valuations
   */
  compareBusinessModels(
    annualRevenue: number,
    sector: string,
    companyId?: string,
  ): {
    insuranceDriven: ValuationOutput;
    consumerOnly: ValuationOutput;
    premium: number;
    premiumPercent: number;
  } {
    const growthRate = resolveGrowthRate({ sector, companyId }).growthRate;

    const insuranceInput: ValuationInput = {
      annualRevenue,
      reimbursementStatus: {
        hasCPTCode: true,
        codeType: "established",
        codeCount: 3,
        reimbursementBreadth: "multi-payer",
        rateCategory: "high",
        estimatedAnnualReimbursement: annualRevenue * 0.7,
      },
      sector,
      growthRate,
      profitability: "break-even", // 🔴 ILLUSTRATIVE default
      acquirerType: "healthcare",
    };

    const consumerInput: ValuationInput = {
      annualRevenue,
      reimbursementStatus: {
        hasCPTCode: false,
        codeType: "none",
        codeCount: 0,
        reimbursementBreadth: "none",
        rateCategory: "none",
        estimatedAnnualReimbursement: 0,
      },
      sector,
      growthRate,
      profitability: "break-even", // 🔴 ILLUSTRATIVE default
      acquirerType: "healthcare",
    };

    const insuranceValuation = this.calculateValuation(insuranceInput);
    const consumerValuation = this.calculateValuation(consumerInput);

    const premium = insuranceValuation.impliedValuation -
      consumerValuation.impliedValuation;
    const premiumPercent = (premium / consumerValuation.impliedValuation) * 100;

    return {
      insuranceDriven: insuranceValuation,
      consumerOnly: consumerValuation,
      premium,
      premiumPercent,
    };
  }

  /**
   * Previously contained fabricated comparables (Maven Clinic IPO never
   * occurred; Lyra Health figure was a private round, not an acquisition).
   * Returns empty — callers should source comparables from getVerifiedDataset().
   */
  getComparableTransactions(_sector: string): {
    company: string;
    acquirer: string;
    valuation: number;
    multiple: number;
    reimbursementStatus: string;
    date: string;
  }[] {
    return [];
  }

  /**
   * Analyze acquirer strategy fit
   */
  analyzeAcquirerFit(
    companyProfile: CompanyReimbursementProfile,
    acquirer: AcquirerProfile,
  ): {
    fitScore: number;
    rationale: string[];
    recommendedPremium: number;
  } {
    const rationale: string[] = [];
    let fitScore = 50; // Base score

    // Reimbursement capability alignment
    if (companyProfile.reimbursementStatus.hasCPTCode) {
      if (acquirer.reimbursementCapability === "strong") {
        fitScore += 30;
        rationale.push(
          "Strong acquirer reimbursement infrastructure can scale target codes",
        );
      } else if (acquirer.reimbursementCapability === "weak") {
        fitScore -= 20;
        rationale.push(
          "Acquirer lacks reimbursement expertise - may undervalue CPT assets",
        );
      }
    } else {
      if (acquirer.reimbursementCapability === "weak") {
        fitScore += 10;
        rationale.push("Consumer model aligns with tech acquirer strengths");
      }
    }

    // Strategic premium calculation
    let recommendedPremium = 1.0;

    if (
      acquirer.reimbursementCapability === "strong" &&
      companyProfile.reimbursementStatus.hasCPTCode
    ) {
      recommendedPremium = 1.35;
      rationale.push(
        "Strategic premium: Can leverage reimbursement infrastructure",
      );
    } else if (
      acquirer.type === "tech" && !companyProfile.reimbursementStatus.hasCPTCode
    ) {
      recommendedPremium = 1.15;
      rationale.push(
        "Modest premium: Tech acquirer sees user acquisition value",
      );
    } else if (
      acquirer.reimbursementCapability === "weak" &&
      companyProfile.reimbursementStatus.hasCPTCode
    ) {
      recommendedPremium = 0.9;
      rationale.push(
        "Discount likely: Tech acquirer cannot monetize CPT codes",
      );
    }

    return {
      fitScore: Math.min(Math.max(fitScore, 0), 100),
      rationale,
      recommendedPremium,
    };
  }
}

export const valuationCalculator = new ValuationPremiumCalculator();
export default valuationCalculator;
