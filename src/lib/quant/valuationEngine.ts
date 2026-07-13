/**
 * Multi-method valuation with BCa-backed comparable-deals anchors.
 */

import type { EmpiricalPriors } from "./empiricalPriors";
import { getSectorPrior } from "./empiricalPriors";
import {
  isSufficient,
  missingInput,
  pointEstimate,
  scaleQuantValue,
  weightedConsensus,
} from "./estimators";
import { assembleValuationSummary, emptyValuation } from "./presentation";
import {
  ebitdaMultiple,
  geographicMultiplier,
  revenueMultiple,
  STAGE_RD_MULTIPLES,
  TAM_FORWARD_MULTIPLE,
  TAM_MARGIN,
  TAM_PENETRATION,
} from "./priors";
import type { QuantCompany, QuantValue, ValuationResult } from "./types";

export class ValuationEngine {
  constructor(private readonly priors?: EmpiricalPriors) {}

  valueByRevenueMultiple(company: QuantCompany): ValuationResult {
    if (!company.annualRevenue || company.annualRevenue <= 0) {
      return emptyValuation(
        "Revenue Multiple",
        "Company has no disclosed revenue",
      );
    }
    const multiple = revenueMultiple(company);
    const geoMult = geographicMultiplier(company);
    const estimate = company.annualRevenue * multiple * geoMult;
    const discountNote = geoMult < 1
      ? ` (${((1 - geoMult) * 100).toFixed(0)}% Africa-focus discount)`
      : "";

    return {
      methodName: "Revenue Multiple",
      estimate: pointEstimate(
        estimate,
        "Heuristic multiple — no sector BCa sample for bounds",
      ),
      confidence: company.annualRevenue > 5 ? 0.8 : 0.5,
      reasoning:
        `$${company.annualRevenue}M revenue × ${multiple}x${discountNote}`,
    };
  }

  valueByEBITDAMultiple(company: QuantCompany): ValuationResult {
    if (!company.ebitda || company.ebitda <= 0) {
      return emptyValuation("EBITDA Multiple", "Company not EBITDA positive");
    }
    const multiple = ebitdaMultiple(company);
    const estimate = company.ebitda * multiple * geographicMultiplier(company);
    return {
      methodName: "EBITDA Multiple",
      estimate: pointEstimate(estimate, "Heuristic EBITDA multiple"),
      confidence: 0.85,
      reasoning: `$${company.ebitda}M EBITDA × ${multiple}x multiple`,
    };
  }

  valueByTAM(company: QuantCompany): ValuationResult {
    const tam = company.targetMarketSize;
    if (!tam || tam <= 0) {
      return emptyValuation("TAM-Based", "No target market size available");
    }
    const estimate = tam * TAM_PENETRATION * TAM_MARGIN * TAM_FORWARD_MULTIPLE *
      geographicMultiplier(company);
    return {
      methodName: "TAM-Based",
      estimate: pointEstimate(estimate, "TAM scenario — assumed penetration"),
      confidence: 0.5,
      reasoning: `$${tam}M TAM × ${
        (TAM_PENETRATION * 100).toFixed(0)
      }% penetration × ${
        (TAM_MARGIN * 100).toFixed(0)
      }% margin × ${TAM_FORWARD_MULTIPLE}x`,
    };
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

  valueByRDCost(company: QuantCompany): ValuationResult {
    if (company.raisedToDate <= 0) {
      return emptyValuation("R&D Cost Multiple", "No funding raised on record");
    }
    const multiple = STAGE_RD_MULTIPLES[company.clinicalStage];
    const estimate = company.raisedToDate * multiple * 1.5 *
      geographicMultiplier(company);
    return {
      methodName: "R&D Cost Multiple",
      estimate: pointEstimate(estimate, "Stage-based R&D heuristic"),
      confidence: company.clinicalStage === "fda_approved" ? 0.8 : 0.4,
      reasoning:
        `$${company.raisedToDate}M raised × ${multiple}x ${company.clinicalStage}`,
    };
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
