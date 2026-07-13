/**
 * Presentation layer: recommendations, caveats, and valuation copy.
 */

import type { EmpiricalPriors } from "./empiricalPriors";
import { isSufficient, missingInput, numericOrNull } from "./estimators";
import type {
  QuantCompany,
  QuantValue,
  ValuationResult,
  ValuationSummary,
} from "./types";

export function emptyValuation(
  methodName: string,
  reasoning: string,
): ValuationResult {
  return {
    methodName,
    estimate: missingInput(reasoning),
    confidence: 0,
    reasoning,
  };
}

export function valuationCaveats(priors?: EmpiricalPriors): string[] {
  if (priors) {
    const disclosedFrac = priors.dealCount > 0
      ? priors.disclosedDealCount / priors.dealCount
      : 0;
    return [
      "Comparable-deals method is anchored on verified sector deals; other multiples remain heuristic.",
      priors.derivationNote,
      `Disclosed-price fraction (all deals): ${
        (disclosedFrac * 100).toFixed(0)
      }% — non-random subsample.`,
      "Africa-focus discount is a placeholder, not empirically validated.",
    ];
  }
  return [
    "Heuristic multiples, not a calibrated comparable-company set.",
    "Africa-focus discount is a placeholder, not empirically validated.",
  ];
}

export function buildRecommendation(
  company: QuantCompany,
  consensus: QuantValue<number>,
): string {
  if (!isSufficient(consensus)) return "INSUFFICIENT DATA";

  let recommendation = "FAIR VALUE";
  if (
    company.geographicFocus.includes("Africa") &&
    company.clinicalStage === "phase3"
  ) {
    recommendation =
      "LIKELY UNDERVALUED (Africa discount may not be justified at Phase 3)";
  }
  if (company.clinicalStage === "fda_approved" && consensus.value < 50) {
    recommendation = "STRONG BUY (FDA approved below $50M)";
  }
  return recommendation;
}

export function assembleValuationSummary(
  company: QuantCompany,
  valuations: ValuationResult[],
  consensus: QuantValue<number>,
  priors?: EmpiricalPriors,
): ValuationSummary {
  return {
    valuations,
    consensus,
    recommendation: buildRecommendation(company, consensus),
    caveats: valuationCaveats(priors),
  };
}

export function formatQuantMillions(value: QuantValue<number>): string {
  const n = numericOrNull(value);
  if (n === null) return "insufficient data";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${Math.round(n)}M`;
}

export function acquisitionModelCaveats(
  priors: EmpiricalPriors | undefined,
  exitRate: QuantValue<number>,
): string[] {
  const base = [
    "Driver weights are heuristic, not learned from outcome data.",
    "Scores assume independent, additive drivers; real interactions are non-linear.",
  ];
  if (priors && isSufficient(exitRate)) {
    return [
      ...base,
      `Base rate ${
        (exitRate.value * 100).toFixed(0)
      }% from dataset exit share (n=${exitRate.sampleSize}, BCa 95% CI ${
        (exitRate.confidenceInterval[0] * 100).toFixed(0)
      }–${(exitRate.confidenceInterval[1] * 100).toFixed(0)}%).`,
      exitRate.selectionCaveat ?? priors.derivationNote,
    ];
  }
  return [
    ...base,
    "Base acquisition rate is an un-calibrated proxy — empirical backtesting recommended.",
  ];
}

export function portfolioCaveats(): string[] {
  return [
    "Greedy selection — a knapsack approximation, not a global optimum.",
    "Exit multiples and synergies are heuristic placeholders.",
    "No correlation modeled between acquisition outcomes.",
  ];
}
