/**
 * Acquisition, health-impact, and portfolio engines.
 */

import type { EmpiricalPriors } from "./empiricalPriors";
import { getSectorPrior } from "./empiricalPriors";
import {
  isSufficient,
  missingInput,
  numericOrNull,
  pointEstimate,
  sufficient,
} from "./estimators";
import { acquisitionModelCaveats, portfolioCaveats } from "./presentation";
import {
  classifyValuationType,
  DRIVER_WEIGHTS,
  EXIT_MULTIPLE_BY_STAGE,
  IMPACT_ASSUMPTIONS,
  UNCALIBRATED_BASE_RATE,
  yearFiveIndex,
} from "./priors";
import type {
  AcquisitionPredictionResult,
  HealthImpactProjection,
  PortfolioRecommendation,
  QuantCompany,
  QuantValue,
  ScoredQuantCompany,
} from "./types";
import { ValuationEngine } from "./valuationEngine";

export class AcquisitionPredictor {
  constructor(private readonly priors?: EmpiricalPriors) {}

  private scoreClinicalValidation(company: QuantCompany): number {
    const stageScores = {
      preclinical: 1,
      phase2: 4,
      phase3: 7,
      fda_approved: 10,
    } as const;
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
    score += 2;
    if (classifyValuationType(company.sector) === "biotech") score += 2;
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

  private sectorExitRate(company: QuantCompany): QuantValue<number> {
    if (!this.priors) {
      return missingInput("No empirical priors for exit-rate CI");
    }
    const sectorPrior = getSectorPrior(this.priors, company.sector);
    if (!sectorPrior || sectorPrior.companyCount === 0) {
      return this.priors.overallExitRateEstimate;
    }
    return sectorPrior.sectorExitRateEstimate ??
      this.priors.overallExitRateEstimate;
  }

  predictAcquisition(company: QuantCompany): AcquisitionPredictionResult {
    const driverScores = {
      clinicalValidation: this.scoreClinicalValidation(company),
      marketTiming: this.scoreMarketTiming(company),
      teamQuality: this.scoreTeam(company),
      strategicFit: this.scoreStrategicFit(company),
      geographicArbitrage: this.scoreGeographicArbitrage(company),
    };

    const weightedScore = Object.entries(driverScores).reduce(
      (sum, [key, score]) =>
        sum + score * DRIVER_WEIGHTS[key as keyof typeof DRIVER_WEIGHTS],
      0,
    ) / 10;

    const exitRate = this.sectorExitRate(company);
    let baseRate = isSufficient(exitRate)
      ? exitRate.value
      : UNCALIBRATED_BASE_RATE;

    if (this.priors && isSufficient(exitRate)) {
      const sectorPrior = getSectorPrior(this.priors, company.sector);
      if (sectorPrior && this.priors.dealCount > 0) {
        const sectorShare = sectorPrior.dealCount / this.priors.dealCount;
        baseRate *= Math.min(1.2, Math.max(0.8, sectorShare * 5));
      }
    }

    const raw = Math.min(0.95, Math.max(0.05, weightedScore * baseRate));

    let probability: QuantValue<number>;
    if (isSufficient(exitRate)) {
      const lo = Math.min(
        0.95,
        Math.max(0.05, exitRate.confidenceInterval[0] * weightedScore),
      );
      const hi = Math.min(
        0.95,
        Math.max(0.05, exitRate.confidenceInterval[1] * weightedScore),
      );
      probability = sufficient({
        value: raw,
        sampleSize: exitRate.sampleSize,
        confidenceInterval: [lo, hi],
        disclosedFraction: exitRate.disclosedFraction,
        selectionCaveat: exitRate.selectionCaveat,
      });
    } else {
      probability = pointEstimate(
        raw,
        "Un-calibrated base rate — BCa unavailable",
      );
    }

    const timelineMap = {
      preclinical: 60,
      phase2: 48,
      phase3: 24,
      fda_approved: 12,
    } as const;

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

    return {
      probability,
      timelineMonths: timelineMap[company.clinicalStage],
      driverScores,
      riskFactors,
      modelCaveats: acquisitionModelCaveats(this.priors, exitRate),
    };
  }
}

export class HealthImpactModeler {
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
    geographicFocus: QuantCompany["geographicFocus"],
  ): number[] {
    if (geographicFocus.includes("Africa")) {
      return baseCurve.map((a) => a * IMPACT_ASSUMPTIONS.africaAdoptionFactor);
    }
    return baseCurve;
  }

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

    const annualLivesSaved = adoptionCurve.map((adoption) =>
      adoption * targetPopulation * annualTestingRate * baselineMortalityRate *
      mortalityReduction
    );
    const cumulativeLivesSaved = annualLivesSaved.reduce((s, a) => s + a, 0);

    const africaShare = isAfrica ? 0.3 : 0.0;
    const revenueProjection = adoptionCurve.map((adoption) => {
      const volume = adoption * targetPopulation * annualTestingRate;
      const revenue =
        volume * (1 - africaShare) * IMPACT_ASSUMPTIONS.testPriceUS +
        volume * africaShare * IMPACT_ASSUMPTIONS.testPriceAfrica;
      return revenue / 1e6;
    });

    return {
      annualLivesSaved,
      cumulativeLivesSaved,
      costPerLifeSaved: cumulativeLivesSaved > 0
        ? 1e6 / (cumulativeLivesSaved / yearsOut)
        : Infinity,
      revenueProjection,
      adoptionCurve,
      assumptions: [
        "Illustrative scenario — not a forecast.",
        `At-risk population ${(targetPopulation / 1e6).toFixed(0)}M.`,
        "Effect size mapped to capped mortality-reduction fraction.",
      ],
    };
  }
}

export class PortfolioOptimizer {
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
      const prob = numericOrNull(
        predictor.predictAcquisition(company).probability,
      ) ?? 0;
      const acquisitionPrice = numericOrNull(valuation.consensus) ?? 0;
      const exitMultiple = EXIT_MULTIPLE_BY_STAGE[company.clinicalStage];
      const projectedExitValue = acquisitionPrice * exitMultiple;
      const roi = acquisitionPrice > 0
        ? (projectedExitValue - acquisitionPrice) / acquisitionPrice
        : 0;

      return {
        ...company,
        acquisitionPrice,
        projectedExitValue,
        acquisitionProbability: prob,
        projectedLivesSaved: impact.cumulativeLivesSaved,
        projectedRevenue: impact.revenueProjection[yearFiveIndex] ?? 0,
        roi,
        riskAdjustedRoi: roi * prob,
      };
    });

    const sorted = [...scoredCompanies].sort((a, b) =>
      (b.riskAdjustedRoi / (b.acquisitionPrice || 1)) -
      (a.riskAdjustedRoi / (a.acquisitionPrice || 1))
    );

    const portfolio: ScoredQuantCompany[] = [];
    let remainingBudget = budget;
    let totalLivesSaved = 0;
    const conditionsUsed = new Set<QuantCompany["condition"]>();

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
    const roiValue = totalInvestment > 0
      ? (projectedExitValue - totalInvestment) / totalInvestment
      : 0;
    const expectedROI: QuantValue<number> = totalInvestment > 0
      ? pointEstimate(roiValue, "Portfolio-level ROI — no BCa resample")
      : missingInput("Empty portfolio");

    return {
      companies: portfolio,
      totalInvestment,
      projectedExitValue,
      expectedROI,
      projectedLivesSaved: totalLivesSaved,
      synergiesValue: portfolio.length * 5 + (portfolio.length > 0 ? 15 : 0),
      diversificationScore: conditionsUsed.size /
        Math.min(conditionsUsed.size + 1, 5),
      caveats: portfolioCaveats(),
    };
  }
}
