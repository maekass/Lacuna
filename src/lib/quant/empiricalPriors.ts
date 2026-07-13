/**
 * Empirical priors derived from the verified dataset's actual deal history.
 * Per-sector aggregates are gated behind min sample sizes and surfaced as
 * {@link QuantValue} so small-n buckets cannot render as bare numbers.
 */

import { median } from "simple-statistics";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";
import {
  bcaBootstrapCi,
  disclosedFraction,
  gatedMedian,
  gatedProportionCi,
  heckmanSelectionCaveat,
  isSufficient,
  MIN_FUNDING_MULTIPLE_SAMPLE,
  MIN_SECTOR_SAMPLE,
} from "./estimators";
import type { QuantValue } from "./types";

export interface SectorPrior {
  sector: string;
  dealCount: number;
  disclosedDealCount: number;
  disclosedFraction: number;
  selectionCaveat: string;
  companyCount: number;
  acquiredInSector: number;
  medianDealValueEstimate: QuantValue<number>;
  medianFundingMultipleEstimate: QuantValue<number>;
  sectorExitRateEstimate: QuantValue<number>;
  medianYearsToExit?: number;
}

export interface EmpiricalPriors {
  overallExitRateEstimate: QuantValue<number>;
  companyCount: number;
  dealCount: number;
  disclosedDealCount: number;
  disclosedFraction: number;
  selectionCaveat: string;
  medianDealValueAllEstimate: QuantValue<number>;
  medianFundingMultipleAllEstimate: QuantValue<number>;
  sectorPriors: Map<string, SectorPrior>;
  derivationNote: string;
}

export function normalizeSectorBucket(sector: string): string {
  const s = sector.toLowerCase();
  if (s.includes("diagn") || s.includes("screen") || s.includes("imaging")) {
    return "diagnostics";
  }
  if (s.includes("fertil") || s.includes("reproduct") || s.includes("ivf")) {
    return "fertility";
  }
  if (s.includes("maternal") || s.includes("pregn")) return "maternal";
  if (s.includes("oncolog") || s.includes("cancer")) return "oncology";
  if (s.includes("menopause")) return "menopause";
  if (s.includes("pelvic")) return "pelvic";
  if (s.includes("precision") || s.includes("genomic") || s.includes("gene")) {
    return "precision_medicine";
  }
  if (s.includes("mental") || s.includes("behavior")) return "mental_health";
  if (s.includes("wellness") || s.includes("consumer")) return "wellness";
  if (s.includes("wearable") || s.includes("device")) return "devices";
  return "other";
}

function yearsBetween(foundedYear: number, isoDate: string): number | null {
  const announced = new Date(isoDate);
  if (Number.isNaN(announced.getTime()) || foundedYear <= 1900) return null;
  const years = announced.getFullYear() - foundedYear;
  return years >= 0 && years < 60 ? years : null;
}

export function deriveEmpiricalPriors(
  companies: readonly VerifiedCompanyView[],
  acquisitions: readonly VerifiedAcquisitionView[],
): EmpiricalPriors {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const acquiredTargetIds = new Set(acquisitions.map((d) => d.targetId));

  const dealsBySector = new Map<string, VerifiedAcquisitionView[]>();
  for (const deal of acquisitions) {
    const target = companyById.get(deal.targetId);
    const bucket = normalizeSectorBucket(target?.sector ?? "other");
    const list = dealsBySector.get(bucket) ?? [];
    list.push(deal);
    dealsBySector.set(bucket, list);
  }

  const allDisclosedValues: number[] = [];
  const allFundingMultiples: number[] = [];
  const sectorPriors = new Map<string, SectorPrior>();

  for (const [bucket, deals] of dealsBySector) {
    const disclosed = deals
      .map((d) => d.dealValue)
      .filter((v): v is number => typeof v === "number" && v > 0);
    allDisclosedValues.push(...disclosed);

    const multiples: number[] = [];
    const yearsToExit: number[] = [];
    for (const deal of deals) {
      const target = companyById.get(deal.targetId);
      if (
        typeof deal.dealValue === "number" && deal.dealValue > 0 &&
        typeof target?.totalFunding === "number" && target.totalFunding > 0
      ) {
        multiples.push(deal.dealValue / target.totalFunding);
      }
      if (target?.founded !== undefined) {
        const yrs = yearsBetween(target.founded, deal.announcedDate);
        if (yrs !== null) yearsToExit.push(yrs);
      }
    }
    allFundingMultiples.push(...multiples);

    const sectorCompanies = companies.filter(
      (c) => normalizeSectorBucket(c.sector) === bucket,
    );
    const acquiredInSector = sectorCompanies.filter((c) =>
      acquiredTargetIds.has(c.id) || c.stage.toLowerCase().includes("acquired")
    ).length;

    const dealFrac = disclosedFraction(disclosed.length, deals.length);

    sectorPriors.set(bucket, {
      sector: bucket,
      dealCount: deals.length,
      disclosedDealCount: disclosed.length,
      disclosedFraction: dealFrac,
      selectionCaveat: heckmanSelectionCaveat(disclosed.length, deals.length),
      companyCount: sectorCompanies.length,
      acquiredInSector,
      medianDealValueEstimate: gatedMedian(disclosed, {
        minSampleSize: MIN_SECTOR_SAMPLE,
        disclosedCount: disclosed.length,
        totalCount: deals.length,
      }),
      medianFundingMultipleEstimate: bcaBootstrapCi(
        multiples,
        median,
        {
          minSampleSize: MIN_FUNDING_MULTIPLE_SAMPLE,
          disclosedCount: disclosed.length,
          totalCount: deals.length,
        },
      ),
      sectorExitRateEstimate: gatedProportionCi(
        acquiredInSector,
        sectorCompanies.length,
        { minSampleSize: MIN_SECTOR_SAMPLE },
      ),
      medianYearsToExit: yearsToExit.length > 0
        ? median(yearsToExit)
        : undefined,
    });
  }

  const acquiredInDataset =
    companies.filter((c) =>
      acquiredTargetIds.has(c.id) || c.stage.toLowerCase().includes("acquired")
    ).length;

  const disclosedDealCount =
    acquisitions.filter((d) =>
      typeof d.dealValue === "number" && d.dealValue > 0
    ).length;

  const overallFrac = disclosedFraction(
    disclosedDealCount,
    acquisitions.length,
  );

  return {
    overallExitRateEstimate: gatedProportionCi(
      acquiredInDataset,
      companies.length,
      { minSampleSize: MIN_SECTOR_SAMPLE },
    ),
    companyCount: companies.length,
    dealCount: acquisitions.length,
    disclosedDealCount,
    disclosedFraction: overallFrac,
    selectionCaveat: heckmanSelectionCaveat(
      disclosedDealCount,
      acquisitions.length,
    ),
    medianDealValueAllEstimate: gatedMedian(allDisclosedValues, {
      minSampleSize: MIN_SECTOR_SAMPLE,
      disclosedCount: disclosedDealCount,
      totalCount: acquisitions.length,
    }),
    medianFundingMultipleAllEstimate: bcaBootstrapCi(
      allFundingMultiples,
      median,
      {
        minSampleSize: MIN_FUNDING_MULTIPLE_SAMPLE,
        disclosedCount: disclosedDealCount,
        totalCount: acquisitions.length,
      },
    ),
    sectorPriors,
    derivationNote:
      `Derived from ${acquisitions.length} verified deals (${disclosedDealCount} disclosed, ` +
      `${allFundingMultiples.length} with funding multiples) across ${companies.length} companies. ` +
      `Per-sector aggregates require n≥${MIN_SECTOR_SAMPLE}; disclosed-only values carry selection bias.`,
  };
}

export type FundingStageKey =
  | "Pre-Seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+";

export interface DatasetStageMedians {
  medians: Partial<Record<FundingStageKey, number>>;
  sampleSizes: Partial<Record<FundingStageKey, number>>;
  derivationNote: string;
}

function normalizeFundingStage(stage: string): FundingStageKey | null {
  const s = stage.toLowerCase();
  if (s.includes("pre-seed") || s.includes("pre seed")) return "Pre-Seed";
  if (
    s.includes("series d") || s.includes("series e") ||
    s.includes("series f") ||
    s.includes("late stage") || s.includes("pre-ipo")
  ) return "Series D+";
  if (s.includes("series c")) return "Series C";
  if (s.includes("series b")) return "Series B";
  if (s.includes("series a")) return "Series A";
  if (s.includes("seed")) return "Seed";
  return null;
}

export function deriveStageMedians(
  companies: readonly VerifiedCompanyView[],
): DatasetStageMedians {
  const byStage = new Map<FundingStageKey, number[]>();
  for (const company of companies) {
    const key = normalizeFundingStage(company.stage);
    if (
      !key || typeof company.totalFunding !== "number" ||
      company.totalFunding <= 0
    ) {
      continue;
    }
    const list = byStage.get(key) ?? [];
    list.push(company.totalFunding);
    byStage.set(key, list);
  }
  const medians: Partial<Record<FundingStageKey, number>> = {};
  const sampleSizes: Partial<Record<FundingStageKey, number>> = {};
  for (const [key, values] of byStage) {
    medians[key] = median(values);
    sampleSizes[key] = values.length;
  }
  const totalN = (Object.values(sampleSizes) as number[]).reduce(
    (s, n) => s + n,
    0,
  );
  return {
    medians,
    sampleSizes,
    derivationNote:
      `Stage medians from ${totalN} companies with disclosed funding ` +
      `(proxy: median total-funding-raised by stage).`,
  };
}

export function getSectorPrior(
  priors: EmpiricalPriors,
  sector: string,
): SectorPrior | undefined {
  return priors.sectorPriors.get(normalizeSectorBucket(sector));
}

/** @deprecated Use overallExitRateEstimate via isSufficient() */
export function overallExitRateScalar(priors: EmpiricalPriors): number {
  return isSufficient(priors.overallExitRateEstimate)
    ? priors.overallExitRateEstimate.value
    : 0;
}
