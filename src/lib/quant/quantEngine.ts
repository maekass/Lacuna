/**
 * Quantitative analysis engine for Lacuna (heuristics — NOT trained models).
 *
 * Four illustrative engines for women's-health M&A exploration:
 *  - ValuationEngine        — multi-method valuation (revenue / EBITDA / TAM / R&D)
 *  - AcquisitionPredictor   — rule-based, weighted driver score → 5-year exit proxy
 *  - HealthImpactModeler    — adoption S-curve → bounded mortality-reduction scenario
 *  - PortfolioOptimizer     — greedy, risk-adjusted bundle selection
 *
 * Every output is a transparent heuristic built on stated assumptions, not an
 * empirically calibrated or trained prediction. Several inputs (revenue, TAM,
 * clinical efficacy, team) are NOT present in Lacuna's verified dataset; when
 * absent they are simply skipped rather than fabricated. See docs/ for limits.
 */

import { quantile } from "simple-statistics";
import { type EmpiricalPriors, getSectorPrior } from "./empiricalPriors";

// ==================== TYPES ====================

/** Clinical development stage — distinct from a company's funding-round stage. */
export type ClinicalStage =
  | "preclinical"
  | "phase2"
  | "phase3"
  | "fda_approved";

export type GeographicRegion = "US" | "Africa" | "Asia" | "LatAm";

export type MaternalCondition =
  | "preeclampsia"
  | "gestational_diabetes"
  | "pcos"
  | "sickle_cell"
  | "maternal_mortality";

/**
 * Quant module's company shape. Bridged from the verified dataset via
 * adaptQuantCompany(); fields with no verified source are left undefined.
 */
export interface QuantCompany {
  id: string;
  name: string;
  /** Free-form sector string from the dataset (drives multiple selection). */
  sector: string;
  /** Funding-round stage from the dataset (e.g. "Series A") — real. */
  fundingStage: string;
  /** Clinical development stage — a documented proxy when not directly known. */
  clinicalStage: ClinicalStage;
  /** Annual revenue in $M — optional; omitted for pre-revenue companies. */
  annualRevenue?: number;
  /** EBITDA in $M — optional. */
  ebitda?: number;
  /** Total funding raised in $M (maps to dataset totalFunding). */
  raisedToDate: number;
  customerCount: number;
  /** Target market size in $M — optional; TAM method is skipped when absent. */
  targetMarketSize?: number;
  geographicFocus: GeographicRegion[];
  condition: MaternalCondition;
  clinicalEfficacy?: {
    effectSize: number; // Cohen's d or similar standardized effect
    sampleSize: number;
    populationDiversity: number; // 0-1, how representative
    africanRepresentation: number; // 0-1, share of trial in sub-Saharan Africa
  };
  teamMetrics?: {
    founderSerialEntrepreneur: boolean;
    advisorStrength: number; // 1-10
    retentionRisk: number; // 1-10 (higher = more risk)
  };
  /**
   * Discount multiplier applied to Africa-focused valuations. Default 0.65 is a
   * heuristic placeholder for observed market underpricing — NOT empirically
   * validated. Override per analysis; set to 1 to disable.
   */
  africaDiscountMultiplier?: number;
}

export interface ValuationResult {
  methodName: string;
  estimate: number; // $M
  lowBound: number;
  highBound: number;
  confidence: number; // 0-1
  reasoning: string;
}

export interface ValuationSummary {
  valuations: ValuationResult[];
  consensusEstimate: number;
  consensusRange: [number, number];
  recommendation: string;
  caveats: string[];
}

export interface AcquisitionPredictionResult {
  probabilityOfAcquisition: number; // 0-1
  confidenceInterval: [number, number];
  timelineMonths: number;
  driverScores: {
    clinicalValidation: number;
    marketTiming: number;
    teamQuality: number;
    strategicFit: number;
    geographicArbitrage: number;
  };
  riskFactors: string[];
  modelCaveats: string[];
}

export interface HealthImpactProjection {
  annualLivesSaved: number[];
  cumulativeLivesSaved: number;
  costPerLifeSaved: number;
  revenueProjection: number[]; // 5-year, $M
  adoptionCurve: number[]; // 0-1 adoption rate per year
  assumptions: string[];
}

export interface ScoredQuantCompany extends QuantCompany {
  acquisitionPrice: number;
  projectedExitValue: number;
  acquisitionProbability: number;
  projectedLivesSaved: number;
  projectedRevenue: number;
  roi: number;
  riskAdjustedRoi: number;
}

export interface PortfolioRecommendation {
  companies: ScoredQuantCompany[];
  totalInvestment: number;
  projectedExitValue: number;
  expectedROI: number;
  projectedLivesSaved: number;
  synergiesValue: number;
  diversificationScore: number; // 0-1
  caveats: string[];
}

// ==================== SHARED HELPERS ====================

type ValuationType = "diagnostic" | "femtech" | "biotech";

/** Map a free-form sector string onto a comparable-multiple bucket. */
function classifyValuationType(sector: string): ValuationType {
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

// ==================== VALUATION ENGINE ====================

export class ValuationEngine {
  /**
   * Multi-method valuation for women's-health companies.
   * Methods: Revenue Multiple, EBITDA Multiple, TAM-based, R&D Cost Multiple,
   * and — when empirical priors are supplied — Comparable Deals (anchored on
   * real verified sector deal medians and funding-to-exit multiples).
   * Geographic adjustment is configurable via company.africaDiscountMultiplier
   * (heuristic default 0.65 — not empirically validated).
   */

  constructor(private readonly priors?: EmpiricalPriors) {}

  private MARKET_MULTIPLES = {
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
  };

  /**
   * Forward multiple applied to steady-state annual gross profit in the TAM
   * method, converting an annual-profit figure into an enterprise value. A
   * one-year gross-profit number is NOT a valuation on its own.
   */
  private TAM_FORWARD_MULTIPLE = 6;

  private geographicMultiplier(company: QuantCompany): number {
    if (!company.geographicFocus.includes("Africa")) return 1.0;
    return company.africaDiscountMultiplier ?? 0.65;
  }

  private revenueMultiple(company: QuantCompany): number {
    const type = classifyValuationType(company.sector);
    if (type === "biotech") {
      return company.clinicalStage === "fda_approved"
        ? this.MARKET_MULTIPLES.revenue.biotech_approved
        : this.MARKET_MULTIPLES.revenue.biotech_phase3;
    }
    if (type === "femtech") return this.MARKET_MULTIPLES.revenue.femtech;
    return this.MARKET_MULTIPLES.revenue.diagnostic;
  }

  private ebitdaMultiple(company: QuantCompany): number {
    const type = classifyValuationType(company.sector);
    if (type === "biotech") return this.MARKET_MULTIPLES.ebitda.biotech;
    if (type === "femtech") return this.MARKET_MULTIPLES.ebitda.femtech;
    return this.MARKET_MULTIPLES.ebitda.diagnostic;
  }

  valueByRevenueMultiple(company: QuantCompany): ValuationResult {
    if (!company.annualRevenue || company.annualRevenue <= 0) {
      return emptyValuation(
        "Revenue Multiple",
        "Company has no disclosed revenue",
      );
    }

    const multiple = this.revenueMultiple(company);
    const geoMult = this.geographicMultiplier(company);
    const estimate = company.annualRevenue * multiple * geoMult;
    const discountNote = geoMult < 1
      ? ` (${((1 - geoMult) * 100).toFixed(0)}% Africa-focus discount applied)`
      : "";

    return {
      methodName: "Revenue Multiple",
      estimate,
      lowBound: estimate * 0.8,
      highBound: estimate * 1.2,
      confidence: company.annualRevenue > 5 ? 0.8 : 0.5,
      reasoning:
        `$${company.annualRevenue}M revenue × ${multiple}x multiple${discountNote}`,
    };
  }

  valueByEBITDAMultiple(company: QuantCompany): ValuationResult {
    if (!company.ebitda || company.ebitda <= 0) {
      return emptyValuation("EBITDA Multiple", "Company not EBITDA positive");
    }

    const multiple = this.ebitdaMultiple(company);
    const estimate = company.ebitda * multiple *
      this.geographicMultiplier(company);

    return {
      methodName: "EBITDA Multiple",
      estimate,
      lowBound: estimate * 0.75,
      highBound: estimate * 1.25,
      confidence: 0.85,
      reasoning: `$${company.ebitda}M EBITDA × ${multiple}x multiple`,
    };
  }

  valueByTAM(company: QuantCompany): ValuationResult {
    const tam = company.targetMarketSize;
    if (!tam || tam <= 0) {
      return emptyValuation("TAM-Based", "No target market size available");
    }

    const penetration = 0.05; // assume 5% penetration at acquisition
    const margin = 0.3; // 30% gross margin typical for diagnostics
    const estimate = tam * penetration * margin * this.TAM_FORWARD_MULTIPLE *
      this.geographicMultiplier(company);

    return {
      methodName: "TAM-Based",
      estimate,
      lowBound: estimate * 0.6,
      highBound: estimate * 1.4,
      confidence: 0.5,
      reasoning:
        `$${tam}M TAM × 5% penetration × 30% margin × ${this.TAM_FORWARD_MULTIPLE}x forward multiple`,
    };
  }

  /**
   * Comparable-deals method — anchored on REAL verified acquisitions in the
   * same sector bucket. Uses the empirical funding-to-exit multiple when the
   * company has disclosed funding; otherwise falls back to the sector's median
   * deal value. Confidence scales with the sector's sample size.
   */
  valueByComparableDeals(company: QuantCompany): ValuationResult {
    if (!this.priors) {
      return emptyValuation(
        "Comparable Deals",
        "No empirical priors supplied (engine constructed without dataset)",
      );
    }
    const prior = getSectorPrior(this.priors, company.sector);
    if (!prior || prior.dealCount === 0) {
      return emptyValuation(
        "Comparable Deals",
        "No verified deals in this sector bucket",
      );
    }

    const geoMult = this.geographicMultiplier(company);

    // Preferred anchor: sector funding-to-exit multiple × this company's funding.
    if (
      prior.medianFundingMultiple !== undefined &&
      prior.fundingMultipleN >= 2 &&
      company.raisedToDate > 0
    ) {
      const estimate = company.raisedToDate * prior.medianFundingMultiple *
        geoMult;
      const confidence = Math.min(0.75, 0.35 + prior.fundingMultipleN * 0.08);
      return {
        methodName: "Comparable Deals",
        estimate,
        lowBound: estimate * 0.6,
        highBound: estimate * 1.6,
        confidence,
        reasoning: `$${company.raisedToDate}M raised × ${
          prior.medianFundingMultiple.toFixed(1)
        }x median exit/funding multiple (n=${prior.fundingMultipleN} verified ${prior.sector} deals)`,
      };
    }

    // Fallback anchor: sector median disclosed deal value.
    if (prior.medianDealValue !== undefined) {
      const estimate = prior.medianDealValue * geoMult;
      const [low, high] = prior.dealValueIQR ??
        [estimate * 0.5, estimate * 1.5];
      return {
        methodName: "Comparable Deals",
        estimate,
        lowBound: low,
        highBound: high,
        confidence: Math.min(0.5, 0.2 + prior.dealCount * 0.05),
        reasoning:
          `Median disclosed deal value in ${prior.sector} (n=${prior.dealCount} verified deals)`,
      };
    }

    return emptyValuation(
      "Comparable Deals",
      "Sector deals exist but none disclosed a value",
    );
  }

  valueByRDCost(company: QuantCompany): ValuationResult {
    // Pre-revenue proxy: capital deployed × stage multiple.
    const stageMultiples: Record<ClinicalStage, number> = {
      preclinical: 1.0,
      phase2: 1.2,
      phase3: 2.5,
      fda_approved: 8.0,
    };

    if (company.raisedToDate <= 0) {
      return emptyValuation("R&D Cost Multiple", "No funding raised on record");
    }

    const multiple = stageMultiples[company.clinicalStage];
    const estimate = company.raisedToDate * multiple * 1.5 *
      this.geographicMultiplier(company);

    return {
      methodName: "R&D Cost Multiple",
      estimate,
      lowBound: estimate * 0.7,
      highBound: estimate * 1.5,
      confidence: company.clinicalStage === "fda_approved" ? 0.8 : 0.4,
      reasoning:
        `$${company.raisedToDate}M raised × ${multiple}x ${company.clinicalStage} multiple`,
    };
  }

  valuateCompany(company: QuantCompany): ValuationSummary {
    const valuations = [
      this.valueByRevenueMultiple(company),
      this.valueByEBITDAMultiple(company),
      this.valueByTAM(company),
      this.valueByRDCost(company),
      this.valueByComparableDeals(company),
    ].filter((v) => v.estimate > 0 && v.confidence > 0);

    const caveats = this.priors
      ? [
        "Comparable-deals method is anchored on verified sector deals; other multiples remain heuristic.",
        this.priors.derivationNote,
        "Africa-focus discount is a placeholder, not empirically validated.",
      ]
      : [
        "Heuristic multiples, not a calibrated comparable-company set.",
        "Africa-focus discount is a placeholder, not empirically validated.",
      ];

    // Guard: nothing to value (e.g. no revenue, EBITDA, TAM, or funding).
    const totalConfidence = valuations.reduce(
      (sum, v) => sum + v.confidence,
      0,
    );
    if (valuations.length === 0 || totalConfidence === 0) {
      return {
        valuations,
        consensusEstimate: 0,
        consensusRange: [0, 0],
        recommendation: "INSUFFICIENT DATA",
        caveats,
      };
    }

    const consensusEstimate =
      valuations.reduce((sum, v) => sum + v.estimate * v.confidence, 0) /
      totalConfidence;

    const estimates = valuations.map((v) => v.estimate).sort((a, b) => a - b);
    // simple-statistics quantile() takes p in [0, 1].
    const consensusRange: [number, number] = estimates.length === 1
      ? [estimates[0], estimates[0]]
      : [quantile(estimates, 0.25), quantile(estimates, 0.75)];

    let recommendation = "FAIR VALUE";
    if (
      company.geographicFocus.includes("Africa") &&
      company.clinicalStage === "phase3"
    ) {
      recommendation =
        "LIKELY UNDERVALUED (Africa discount may not be justified at Phase 3)";
    }
    if (company.clinicalStage === "fda_approved" && consensusEstimate < 50) {
      recommendation = "STRONG BUY (FDA approved below $50M)";
    }

    return {
      valuations,
      consensusEstimate,
      consensusRange,
      recommendation,
      caveats,
    };
  }
}

function emptyValuation(
  methodName: string,
  reasoning: string,
): ValuationResult {
  return {
    methodName,
    estimate: 0,
    lowBound: 0,
    highBound: 0,
    confidence: 0,
    reasoning,
  };
}

// ==================== ACQUISITION PROBABILITY PREDICTOR ====================

export class AcquisitionPredictor {
  /**
   * Rule-based 5-year acquisition proxy from a weighted driver score.
   * NOT a trained classifier — weights are heuristic. The base rate is the
   * dataset's observed exit rate when empirical priors are supplied, else an
   * un-calibrated 0.35 proxy. Treat as exploratory framing only.
   */

  constructor(private readonly priors?: EmpiricalPriors) {}

  private scoreClinicalValidation(company: QuantCompany): number {
    const stageScores: Record<ClinicalStage, number> = {
      preclinical: 1,
      phase2: 4,
      phase3: 7,
      fda_approved: 10,
    };

    let score = stageScores[company.clinicalStage];
    if (company.clinicalEfficacy) {
      if (company.clinicalEfficacy.africanRepresentation > 0.2) score += 2;
      if (company.clinicalEfficacy.populationDiversity > 0.7) score += 1;
    }
    return Math.min(score, 10);
  }

  private scoreMarketTiming(company: QuantCompany): number {
    let score = 5;
    if (company.raisedToDate < 10) score += 1;
    if (company.raisedToDate > 50) score -= 2;
    if (company.annualRevenue && company.annualRevenue > 10) score += 2;
    if ((company.targetMarketSize ?? 0) > 1000) score += 2;
    if (company.geographicFocus.length > 2) score += 1;
    return Math.max(1, Math.min(score, 10));
  }

  private scoreTeam(company: QuantCompany): number {
    let score = 5;
    if (company.teamMetrics) {
      if (company.teamMetrics.founderSerialEntrepreneur) score += 3;
      score += company.teamMetrics.advisorStrength;
      score -= company.teamMetrics.retentionRisk * 0.5;
    }
    return Math.max(1, Math.min(score, 10));
  }

  private scoreStrategicFit(company: QuantCompany): number {
    let score = 5;
    score += 2; // maternal health is an active acquisition theme
    if (classifyValuationType(company.sector) === "biotech") score += 2; // IP appeal
    if (company.geographicFocus.includes("Africa")) score += 1;
    return Math.min(score, 10);
  }

  private scoreGeographicArbitrage(company: QuantCompany): number {
    let score = 0;
    if (company.geographicFocus.includes("Africa")) {
      score += 5;
      if (company.geographicFocus.includes("US")) score += 3;
    } else if (company.geographicFocus.includes("US")) {
      score += 2;
    }
    return score;
  }

  predictAcquisition(company: QuantCompany): AcquisitionPredictionResult {
    const driverScores = {
      clinicalValidation: this.scoreClinicalValidation(company),
      marketTiming: this.scoreMarketTiming(company),
      teamQuality: this.scoreTeam(company),
      strategicFit: this.scoreStrategicFit(company),
      geographicArbitrage: this.scoreGeographicArbitrage(company),
    };

    const weights = {
      clinicalValidation: 0.25,
      marketTiming: 0.2,
      teamQuality: 0.2,
      strategicFit: 0.2,
      geographicArbitrage: 0.15,
    };

    // weightedScore ∈ [0, 1]: weighted mean of 0-10 driver scores ÷ 10.
    const weightedScore = Object.entries(driverScores).reduce(
      (sum, [key, score]) => sum + score * weights[key as keyof typeof weights],
      0,
    ) / 10;

    // Base rate: dataset's observed exit rate when priors supplied; the
    // heuristic fallback otherwise. Sector deal activity nudges it ±20%.
    // UNCALIBRATED_BASE_RATE is an industry-wide VC exit proxy, not from data.
    const UNCALIBRATED_BASE_RATE = 0.35;
    let baseRate = this.priors?.overallExitRate ?? UNCALIBRATED_BASE_RATE;
    if (this.priors) {
      const sectorPrior = getSectorPrior(this.priors, company.sector);
      if (sectorPrior && this.priors.dealCount > 0) {
        const sectorShare = sectorPrior.dealCount / this.priors.dealCount;
        // Sectors with above-average deal flow get a bounded uplift.
        const sectorAdjustment = Math.min(1.2, Math.max(0.8, sectorShare * 5));
        baseRate *= sectorAdjustment;
      }
    }
    const probability = Math.min(
      0.95,
      Math.max(0.05, weightedScore * baseRate),
    );

    const ciWidth = company.clinicalStage === "fda_approved" ? 0.1 : 0.25;
    const confidenceInterval: [number, number] = [
      Math.max(0.05, probability - ciWidth),
      Math.min(0.95, probability + ciWidth),
    ];

    const timelineMap: Record<ClinicalStage, number> = {
      preclinical: 60,
      phase2: 48,
      phase3: 24,
      fda_approved: 12,
    };

    const riskFactors: string[] = [];
    if (driverScores.clinicalValidation < 5) {
      riskFactors.push("Early clinical stage");
    }
    if (driverScores.teamQuality < 5) riskFactors.push("Weak management team");
    if (!company.geographicFocus.includes("US")) {
      riskFactors.push("Limited US presence");
    }
    if (driverScores.geographicArbitrage < 2) {
      riskFactors.push("Geographic concentration risk");
    }

    const modelCaveats = [
      "Driver weights are heuristic, not learned from outcome data.",
      this.priors
        ? `Base rate ${
          (this.priors.overallExitRate * 100).toFixed(0)
        }% is the dataset's observed exit share (n=${this.priors.companyCount} companies) — small-n, disclosure-biased.`
        : "Base acquisition rate is an un-calibrated proxy — empirical backtesting recommended.",
      "Scores assume independent, additive drivers; real interactions are non-linear.",
    ];

    return {
      probabilityOfAcquisition: probability,
      confidenceInterval,
      timelineMonths: timelineMap[company.clinicalStage],
      driverScores,
      riskFactors,
      modelCaveats,
    };
  }
}

// ==================== HEALTH IMPACT MODELER ====================

/**
 * Illustrative epidemiological scenario constants. These are documented
 * assumptions for a teaching demo, NOT measured rates. Every figure is an
 * upper-bound sketch; real impact requires trial-, geography-, and
 * condition-specific data the verified dataset does not contain.
 */
const IMPACT_ASSUMPTIONS = {
  yearsOut: 5,
  annualTestingRate: 0.2, // share of at-risk population tested per year
  /** At-risk population reached, by geographic emphasis ($ headcount). */
  population: { africa: 50e6, other: 10e6 },
  /**
   * Baseline maternal mortality among the at-risk, tested population. A small
   * fraction — most tests never sit upstream of a fatal outcome.
   */
  baselineMortalityRate: { africa: 0.01, other: 0.002 },
  /** Adoption is slower in lower-resource settings. */
  africaAdoptionFactor: 0.7,
  testPriceUS: 800,
  testPriceAfrica: 50,
  /** Cap on the relative mortality reduction attributable to one diagnostic. */
  maxMortalityReduction: 0.3,
} as const;

export class HealthImpactModeler {
  /**
   * Models adoption S-curve → bounded mortality-reduction scenario → revenue.
   * Lives-saved is an illustrative upper bound, not a prediction. The clinical
   * effect size is converted to a *bounded* mortality-reduction fraction rather
   * than multiplied directly (Cohen's d is not a probability or a rate).
   */

  private modelSCurveAdoption(
    yearsOut: number,
    inflectionPoint = 2.0,
    maxAdoption = 0.5,
  ): number[] {
    return Array.from({ length: yearsOut }, (_, i) => {
      const year = i + 1;
      const x = (year - inflectionPoint) / 1.5;
      return maxAdoption / (1 + Math.exp(-x));
    });
  }

  private adjustAdoptionForGeography(
    baseCurve: number[],
    geographicFocus: GeographicRegion[],
  ): number[] {
    // Lower-resource settings adopt more slowly across the whole curve.
    if (geographicFocus.includes("Africa")) {
      return baseCurve.map((a) => a * IMPACT_ASSUMPTIONS.africaAdoptionFactor);
    }
    return baseCurve;
  }

  /**
   * Convert a standardized clinical effect size (Cohen's d) into a bounded
   * relative mortality-reduction fraction in [0, maxMortalityReduction].
   * Deliberately conservative — a stand-in for a formal effect-to-outcome model.
   */
  private effectToMortalityReduction(effectSize: number): number {
    const raw = Math.max(0, effectSize) * 0.15;
    return Math.min(IMPACT_ASSUMPTIONS.maxMortalityReduction, raw);
  }

  modelImpact(company: QuantCompany): HealthImpactProjection {
    const { yearsOut, annualTestingRate } = IMPACT_ASSUMPTIONS;
    const isAfrica = company.geographicFocus.includes("Africa");

    const effectSize = company.clinicalEfficacy?.effectSize ?? 0.5;
    const mortalityReduction = this.effectToMortalityReduction(effectSize);
    const targetPopulation = isAfrica
      ? IMPACT_ASSUMPTIONS.population.africa
      : IMPACT_ASSUMPTIONS.population.other;
    const baselineMortalityRate = isAfrica
      ? IMPACT_ASSUMPTIONS.baselineMortalityRate.africa
      : IMPACT_ASSUMPTIONS.baselineMortalityRate.other;

    const adoptionCurve = this.adjustAdoptionForGeography(
      this.modelSCurveAdoption(yearsOut),
      company.geographicFocus,
    );

    // Lives saved = adoption × tested population × baseline mortality among the
    // tested × bounded reduction fraction. Each factor is an explicit assumption.
    const annualLivesSaved = adoptionCurve.map((adoption) =>
      adoption * targetPopulation * annualTestingRate * baselineMortalityRate *
      mortalityReduction
    );
    const cumulativeLivesSaved = annualLivesSaved.reduce((s, a) => s + a, 0);

    const { testPriceUS, testPriceAfrica } = IMPACT_ASSUMPTIONS;
    const africaShare = isAfrica ? 0.3 : 0.0; // share of volume sold at Africa price
    const revenueProjection = adoptionCurve.map((adoption) => {
      const volume = adoption * targetPopulation * annualTestingRate;
      const revenue = volume * (1 - africaShare) * testPriceUS +
        volume * africaShare * testPriceAfrica;
      return revenue / 1e6; // → $M
    });

    const costPerLifeSaved = cumulativeLivesSaved > 0
      ? 1e6 / (cumulativeLivesSaved / yearsOut)
      : Infinity;

    return {
      annualLivesSaved,
      cumulativeLivesSaved,
      costPerLifeSaved,
      revenueProjection,
      adoptionCurve,
      assumptions: [
        "Illustrative scenario — not a forecast. All inputs are stated assumptions.",
        `At-risk population ${(targetPopulation / 1e6).toFixed(0)}M, ${
          (annualTestingRate * 100).toFixed(0)
        }% tested/yr.`,
        `Baseline mortality ${
          (baselineMortalityRate * 100).toFixed(1)
        }% × bounded reduction ${(mortalityReduction * 100).toFixed(0)}%.`,
        "Effect size mapped to a capped mortality-reduction fraction, not applied directly.",
        "No counterfactual, adoption lag, or country-level stratification modeled.",
        "$1M/life cost is a placeholder, not actual intervention cost.",
      ],
    };
  }
}

// ==================== PORTFOLIO OPTIMIZER ====================

/** Exit multiple by clinical stage — earlier = higher upside, higher variance. */
const EXIT_MULTIPLE_BY_STAGE: Record<ClinicalStage, number> = {
  preclinical: 4.0,
  phase2: 3.0,
  phase3: 2.2,
  fda_approved: 1.8,
};

export class PortfolioOptimizer {
  /**
   * Greedy, risk-adjusted bundle selection maximizing expected ROI subject to a
   * budget, a five-company cap, an impact floor, and one-per-condition
   * diversification. Greedy is a knapsack approximation — NOT globally optimal.
   */

  optimizePortfolio(
    candidates: QuantCompany[],
    budget = 250,
    impactFloor = 100000,
  ): PortfolioRecommendation {
    const valuationEngine = new ValuationEngine();
    const predictor = new AcquisitionPredictor();
    const impactModeler = new HealthImpactModeler();

    const scoredCompanies: ScoredQuantCompany[] = candidates.map((company) => {
      const valuation = valuationEngine.valuateCompany(company);
      const impact = impactModeler.modelImpact(company);
      const probability = predictor.predictAcquisition(company)
        .probabilityOfAcquisition;
      const acquisitionPrice = valuation.consensusEstimate;
      // Exit multiple varies by stage, so ROI is not a constant across companies.
      const exitMultiple = EXIT_MULTIPLE_BY_STAGE[company.clinicalStage];
      const projectedExitValue = acquisitionPrice * exitMultiple;
      const roi = acquisitionPrice > 0
        ? (projectedExitValue - acquisitionPrice) / acquisitionPrice
        : 0;

      return {
        ...company,
        acquisitionPrice,
        projectedExitValue,
        acquisitionProbability: probability,
        projectedLivesSaved: impact.cumulativeLivesSaved,
        projectedRevenue: impact.revenueProjection[yearFiveIndex] ?? 0,
        roi,
        riskAdjustedRoi: roi * probability,
      };
    });

    // Rank by risk-adjusted return per dollar (budget-efficiency).
    const sorted = [...scoredCompanies].sort((a, b) =>
      (b.riskAdjustedRoi / (b.acquisitionPrice || 1)) -
      (a.riskAdjustedRoi / (a.acquisitionPrice || 1))
    );

    const portfolio: ScoredQuantCompany[] = [];
    let remainingBudget = budget;
    let totalLivesSaved = 0;
    const conditionsUsed = new Set<MaternalCondition>();

    for (const company of sorted) {
      const price = company.acquisitionPrice || 0;
      if (price <= 0) continue;
      if (conditionsUsed.has(company.condition)) continue;
      if (price > remainingBudget) continue;

      portfolio.push(company);
      remainingBudget -= price;
      totalLivesSaved += company.projectedLivesSaved;
      conditionsUsed.add(company.condition);

      if (portfolio.length >= 5 || totalLivesSaved >= impactFloor) break;
    }

    const totalInvestment = portfolio.reduce(
      (s, c) => s + c.acquisitionPrice,
      0,
    );
    const projectedExitValue = portfolio.reduce(
      (s, c) => s + c.projectedExitValue,
      0,
    );
    const expectedROI = totalInvestment > 0
      ? (projectedExitValue - totalInvestment) / totalInvestment
      : 0;

    // Placeholder linear synergy model — replace with deal-specific analysis.
    const synergiesValue = portfolio.length * 5 +
      (portfolio.length > 0 ? 15 : 0);
    const diversificationScore = conditionsUsed.size /
      Math.min(conditionsUsed.size + 1, 5);

    return {
      companies: portfolio,
      totalInvestment,
      projectedExitValue,
      expectedROI,
      projectedLivesSaved: totalLivesSaved,
      synergiesValue,
      diversificationScore,
      caveats: [
        "Greedy selection — a knapsack approximation, not a global optimum.",
        "Exit multiples and synergies are heuristic placeholders.",
        "No correlation modeled between acquisition outcomes.",
      ],
    };
  }
}

const yearFiveIndex = IMPACT_ASSUMPTIONS.yearsOut - 1;
