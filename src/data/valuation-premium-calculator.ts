/**
 * Valuation Premium Calculator
 *
 * Calculates valuation multiples based on reimbursement status
 * and provides comparable company analysis.
 */

import {
  CompanyReimbursementProfile,
  ReimbursementStatus,
} from "./cms-reimbursement-connector";
import { resolveGrowthRate } from "@/lib/data/growthRateProvider";
import { isSufficient, missingInput } from "@/lib/quant/estimators";
import type { QuantValue } from "@/lib/quant/types";

export interface ValuationInput {
  annualRevenue: number;
  reimbursementStatus: ReimbursementStatus;
  sector: string;
  growthRate: number;
  profitability: "profitable" | "break-even" | "loss-making";
  acquirerType: "healthcare" | "tech" | "pharma" | "retail" | "other";
}

export interface ValuationOutput {
  baseMultiple: number | null;
  reimbursementPremium: number | null;
  adjustedMultiple: number | null;
  impliedValuation: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  confidence: "high" | "medium" | "low";
  keyFactors: string[];
  acquirerPremium: number | null;
  sectorBenchmark: SectorBenchmark | null;
  benchmarkEstimate: QuantValue<number>;
}

export interface SectorBenchmark {
  medianMoic: number;
  p25Moic: number | null;
  p75Moic: number | null;
  sampleSize: number;
  definition: string;
}

export interface AcquirerProfile {
  type: "healthcare" | "tech" | "pharma" | "retail" | "other";
  name: string;
  reimbursementCapability: "strong" | "moderate" | "weak";
  typicalPremium: number;
}

/**
 * Load sector benchmarks from the computed JSON derived from real verified deals.
 */
function loadSectorBenchmarks(): {
  benchmarks: Record<string, SectorBenchmark>;
  withheld: Record<string, QuantValue<number>>;
} {
  let computed: Array<{
    sector: string;
    definition: string;
    medianMoic?: { kind: "sufficient"; value: number };
    p25Moic?: { kind: "sufficient"; value: number };
    p75Moic?: { kind: "sufficient"; value: number };
    sampleSize: number;
  }> = [];
  let withheld: Array<{
    metricId: string;
    scope: string;
    reason: string;
    lineage: { n: number };
  }> = [];

  try {
    // Dynamic require — works in both Node scripts and Next.js server components.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("./computed-benchmarks.json") as {
      benchmarks: typeof computed;
      withheld: typeof withheld;
    };
    computed = raw.benchmarks ?? [];
    withheld = raw.withheld ?? [];
  } catch {
    // File not yet generated.
  }

  const result: Record<string, SectorBenchmark> = {};
  const withheldResult: Record<string, QuantValue<number>> = {};

  for (const b of computed) {
    if (!b.medianMoic || b.medianMoic.kind !== "sufficient") continue;
    const key = b.sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    result[key] = {
      medianMoic: b.medianMoic.value,
      p25Moic: b.p25Moic?.value ?? null,
      p75Moic: b.p75Moic?.value ?? null,
      sampleSize: b.sampleSize,
      definition: b.definition,
    };
  }

  for (const entry of withheld) {
    if (entry.metricId !== "sector.moic.median") continue;
    const key = entry.scope.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    withheldResult[key] = {
      kind: "insufficient",
      code: "small_sample",
      message: entry.reason,
      sampleSize: entry.lineage.n,
      minRequired: 5,
    };
  }

  return { benchmarks: result, withheld: withheldResult };
}

const loadedSectorBenchmarks = loadSectorBenchmarks();
const SECTOR_BENCHMARKS = loadedSectorBenchmarks.benchmarks;
const WITHHELD_SECTOR_BENCHMARKS = loadedSectorBenchmarks.withheld;

/**
 * Load acquirer-type premiums from the computed JSON derived from real verified deals.
 * Primary source: scripts/compute-acquirer-premiums.ts → src/data/computed-acquirer-premiums.json
 */
function loadAcquirerPremiums(): Record<
  string,
  { premium: number; capability: string }
> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("./computed-acquirer-premiums.json") as {
      premiumMetrics?: Record<string, {
        estimate?: { kind: "sufficient"; value: number };
      }>;
    };
    const result: Record<string, { premium: number; capability: string }> = {};
    for (const [metricId, metric] of Object.entries(raw.premiumMetrics ?? {})) {
      if (!metric.estimate || metric.estimate.kind !== "sufficient") continue;
      const denominator = metricId.split(".").at(-1);
      if (denominator === "preDealValuation") {
        result.preDealValuation = {
          premium: metric.estimate.value,
          capability: "unknown",
        };
      }
    }
    return result;
  } catch {
    return {};
  }
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
    const benchmark = SECTOR_BENCHMARKS[sectorKey];

    if (!benchmark || benchmark.sampleSize < 1) {
      const benchmarkEstimate = WITHHELD_SECTOR_BENCHMARKS[sectorKey] ??
        missingInput("No verified-deal benchmark for this sector");
      return {
        baseMultiple: null,
        reimbursementPremium: null,
        adjustedMultiple: null,
        impliedValuation: null,
        rangeLow: null,
        rangeHigh: null,
        confidence: "low",
        keyFactors: [
          isSufficient(benchmarkEstimate)
            ? "No verified-deal benchmark for this sector"
            : benchmarkEstimate.message,
        ],
        acquirerPremium: null,
        sectorBenchmark: null,
        benchmarkEstimate,
      };
    }
    const acquirerData = ACQUIRER_PREMIUMS[input.acquirerType];
    if (!acquirerData) {
      const benchmarkEstimate: QuantValue<number> = {
        kind: "insufficient",
        code: "missing_input",
        message: "No denominator-specific acquirer premium is available",
        sampleSize: benchmark.sampleSize,
        minRequired: 1,
      };
      return {
        baseMultiple: null,
        reimbursementPremium: null,
        adjustedMultiple: null,
        impliedValuation: null,
        rangeLow: null,
        rangeHigh: null,
        confidence: "low",
        keyFactors: [benchmarkEstimate.message],
        acquirerPremium: null,
        sectorBenchmark: benchmark,
        benchmarkEstimate,
      };
    }

    // Base multiple from sector
    let baseMultiple = benchmark.medianMoic;

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
      benchmarkEstimate: {
        kind: "sufficient",
        value: benchmark.medianMoic,
        sampleSize: benchmark.sampleSize,
        confidenceInterval: [benchmark.medianMoic, benchmark.medianMoic],
      },
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
    premium: number | null;
    premiumPercent: number | null;
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

    const premium = isSufficient(insuranceValuation.benchmarkEstimate) &&
        isSufficient(consumerValuation.benchmarkEstimate)
      ? insuranceValuation.impliedValuation! -
        consumerValuation.impliedValuation!
      : null;
    const premiumPercent = premium !== null &&
        consumerValuation.impliedValuation !== null &&
        consumerValuation.impliedValuation !== 0
      ? (premium / consumerValuation.impliedValuation) * 100
      : null;

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
  getComparableTransactions(sector: string): {
    company: string;
    acquirer: string;
    valuation: number;
    multiple: number;
    reimbursementStatus: string;
    date: string;
  }[] {
    void sector;
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
