/**
 * Multi-method valuation with BCa-backed comparable-deals anchors.
 */

import type { EmpiricalPriors } from "./empiricalPriors";
import { getSectorPrior } from "./empiricalPriors";
import {
  isSufficient,
  missingInput,
  scaleQuantValue,
  weightedConsensus,
} from "./estimators";
import { assembleValuationSummary, emptyValuation } from "./presentation";
import { geographicMultiplier } from "./priors";
import type { QuantCompany, ValuationResult } from "./types";

const HEURISTIC_WITHHELD =
  "Insufficient disclosed data — invented TAM, sector-multiple, and R&D priors are not used";

export class ValuationEngine {
  constructor(private readonly priors?: EmpiricalPriors) {}

  valueByRevenueMultiple(_company: QuantCompany): ValuationResult {
    return emptyValuation("Revenue Multiple", HEURISTIC_WITHHELD);
  }

  valueByEBITDAMultiple(_company: QuantCompany): ValuationResult {
    return emptyValuation("EBITDA Multiple", HEURISTIC_WITHHELD);
  }

  valueByTAM(_company: QuantCompany): ValuationResult {
    return emptyValuation("TAM-Based", HEURISTIC_WITHHELD);
  }

  valueByComparableDeals(company: QuantCompany): ValuationResult {
    if (!this.priors) {
      return emptyValuation(
        "Comparable Deals",
        "No empirical priors supplied",
      );
    }
    const prior = getSectorPrior(this.priors, company.sector);
    if (!prior || prior.dealCount === 0) {
      return emptyValuation(
        "Comparable Deals",
        "No verified deals in this sector bucket",
      );
    }

    const geoMult = geographicMultiplier(company);
    const disclosed = prior.disclosedDealCount;
    const total = prior.dealCount;

    if (
      prior.medianFundingMultipleEstimate &&
      isSufficient(prior.medianFundingMultipleEstimate) &&
      company.raisedToDate > 0
    ) {
      const anchor = scaleQuantValue(
        prior.medianFundingMultipleEstimate,
        company.raisedToDate * geoMult,
      );
      const n = prior.medianFundingMultipleEstimate.sampleSize;
      return {
        methodName: "Comparable Deals",
        estimate: anchor,
        confidence: Math.min(0.75, 0.35 + n * 0.08),
        reasoning:
          `$${company.raisedToDate}M raised × sector exit/funding multiple (n=${n}, disclosed ${(disclosedFractionLabel(
            disclosed,
            total,
          ))})`,
      };
    }

    if (
      prior.medianDealValueEstimate &&
      isSufficient(prior.medianDealValueEstimate)
    ) {
      const anchor = scaleQuantValue(prior.medianDealValueEstimate, geoMult);
      return {
        methodName: "Comparable Deals",
        estimate: anchor,
        confidence: Math.min(0.5, 0.2 + prior.dealCount * 0.05),
        reasoning: `Sector median disclosed deal value (${
          disclosedFractionLabel(disclosed, total)
        })`,
      };
    }

    return emptyValuation(
      "Comparable Deals",
      prior.medianDealValueEstimate?.kind === "insufficient"
        ? prior.medianDealValueEstimate.message
        : "Sector deals exist but none meet sample threshold",
    );
  }

  valueByRDCost(_company: QuantCompany): ValuationResult {
    return emptyValuation("R&D Cost Multiple", HEURISTIC_WITHHELD);
  }

  valuateCompany(company: QuantCompany) {
    const valuations = [
      this.valueByRevenueMultiple(company),
      this.valueByEBITDAMultiple(company),
      this.valueByTAM(company),
      this.valueByRDCost(company),
      this.valueByComparableDeals(company),
    ].filter((v) => isSufficient(v.estimate) && v.confidence > 0);

    const consensus = weightedConsensus(
      valuations.map((v) => ({
        value: v.estimate,
        weight: v.confidence,
      })),
    );

    if (!isSufficient(consensus)) {
      return assembleValuationSummary(
        company,
        valuations,
        missingInput(
          "No valuation methods produced sufficient estimates",
        ),
        this.priors,
      );
    }

    return assembleValuationSummary(
      company,
      valuations,
      consensus,
      this.priors,
    );
  }
}

function disclosedFractionLabel(disclosed: number, total: number): string {
  return `${disclosed}/${total} disclosed (${
    total > 0 ? ((disclosed / total) * 100).toFixed(0) : 0
  }%)`;
}
