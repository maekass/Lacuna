/**
 * Presentation layer: recommendations, caveats, and valuation copy.
 */

import type { EmpiricalPriors } from "./empiricalPriors";
import { isSufficient, missingInput, numericOrNull } from "./estimators";
import type { ExitRateBasis } from "./leaveOneOutExitRate";
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
      "No geographic haircut is applied. An Africa HQ is not a valuation discount.",
    ];
  }
  return [
    "Heuristic multiples, not a calibrated comparable-company set.",
    "No geographic haircut is applied. An Africa HQ is not a valuation discount.",
  ];
}

export function buildRecommendation(
  _company: QuantCompany,
  consensus: QuantValue<number>,
): string {
  if (!isSufficient(consensus)) return "INSUFFICIENT DATA";
  return "DESCRIPTIVE HEURISTIC ONLY";
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

function formatShare(rate: QuantValue<number>): string {
  if (!isSufficient(rate)) return "unavailable";
  return `${(rate.value * 100).toFixed(0)}% (n=${rate.sampleSize}, interval ${
    (rate.confidenceInterval[0] * 100).toFixed(0)
  }–${(rate.confidenceInterval[1] * 100).toFixed(0)}%)`;
}

export function acquisitionModelCaveats(
  priors: EmpiricalPriors | undefined,
  exitRate: QuantValue<number>,
  basis: ExitRateBasis = "in_sample",
): string[] {
  const base = [
    "Driver weights are heuristic, not learned from outcome data.",
    "Scores assume independent, additive drivers; real interactions are non-linear.",
  ];
  if (priors && isSufficient(exitRate) && basis === "leave_one_out") {
    const inSample = isSufficient(priors.overallExitRateEstimate)
      ? `In-sample catalog share: ${
        formatShare(priors.overallExitRateEstimate)
      }. That share includes every catalog company and is not this index base rate.`
      : "In-sample catalog share is unavailable.";
    return [
      ...base,
      `Leave-one-out base rate ${
        formatShare(exitRate)
      }. The company being scored is excluded from the count. ${inSample}`,
      exitRate.selectionCaveat ?? priors.derivationNote,
    ];
  }
  if (priors && isSufficient(exitRate)) {
    return [
      ...base,
      `In-sample catalog share ${
        formatShare(exitRate)
      }. Leave-one-out is withheld because this company is outside the catalog denominator, or catalog membership was not recorded.`,
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
