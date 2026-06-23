/**
 * Empirical priors derived from the verified dataset's actual deal history.
 *
 * This is the quant engine's data-retrieval layer: instead of hardcoded
 * heuristic multiples, every prior here is computed from the 58 verified
 * acquisitions (deal values, dates, sectors) and company funding records.
 *
 * Caveats remain — n is small per sector, deal values are disclosed-only
 * (survivorship/disclosure bias), and funding-to-exit multiples exist only
 * where both figures are public. Each prior carries its own sample size so
 * the UI and engines can weight confidence accordingly.
 */

import { median, quantile } from "simple-statistics";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";

// ==================== TYPES ====================

export interface SectorPrior {
  sector: string;
  /** Deals matched to this sector. */
  dealCount: number;
  /** Median disclosed deal value ($M) — undefined when no values disclosed. */
  medianDealValue?: number;
  /** [P25, P75] of disclosed deal values ($M). */
  dealValueIQR?: [number, number];
  /** Median exit-value / total-funding multiple (where both disclosed). */
  medianFundingMultiple?: number;
  /** Sample size behind medianFundingMultiple. */
  fundingMultipleN: number;
  /** Median years from company founding to deal announcement. */
  medianYearsToExit?: number;
}

export interface EmpiricalPriors {
  /** Share of dataset companies that have been acquired (overall base rate). */
  overallExitRate: number;
  /** Companies in the dataset. */
  companyCount: number;
  /** Acquisitions in the dataset. */
  dealCount: number;
  /** Deals with a disclosed value. */
  disclosedDealCount: number;
  /** Median disclosed deal value across all sectors ($M). */
  medianDealValueAll?: number;
  /** Median exit/funding multiple across all sectors. */
  medianFundingMultipleAll?: number;
  /** Per-sector priors keyed by normalized sector bucket. */
  sectorPriors: Map<string, SectorPrior>;
  /** Provenance note for UI disclosure. */
  derivationNote: string;
}

// ==================== SECTOR NORMALIZATION ====================

/**
 * Normalize free-form sector strings into comparable buckets so that
 * "Diagnostics / Oncology" and "Diagnostics" pool into the same prior.
 */
export function normalizeSectorBucket(sector: string): string {
  const s = sector.toLowerCase();
  if (s.includes("diagn") || s.includes("screen") || s.includes("imaging")) {
    return "diagnostics";
  }
  if (s.includes("fertil") || s.includes("reproduct") || s.includes("ivf")) {
    return "fertility";
  }
  if (s.includes("maternal") || s.includes("pregnan")) return "maternal";
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

// ==================== DERIVATION ====================

function yearsBetween(foundedYear: number, isoDate: string): number | null {
  const announced = new Date(isoDate);
  if (Number.isNaN(announced.getTime()) || foundedYear <= 1900) return null;
  const years = announced.getFullYear() - foundedYear;
  return years >= 0 && years < 60 ? years : null;
}

/**
 * Derive empirical priors from the verified dataset. Pure function — same
 * inputs always produce the same priors (no randomness, no fabrication).
 */
export function deriveEmpiricalPriors(
  companies: readonly VerifiedCompanyView[],
  acquisitions: readonly VerifiedAcquisitionView[],
): EmpiricalPriors {
  const companyById = new Map(companies.map((c) => [c.id, c]));

  // Group deals by the *target company's* sector bucket.
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

    // Funding-to-exit multiples: need both dealValue and target totalFunding.
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
      if (target && target.founded !== undefined) {
        const yrs = yearsBetween(target.founded!, deal.announcedDate);
        if (yrs !== null) yearsToExit.push(yrs);
      }
    }
    allFundingMultiples.push(...multiples);

    sectorPriors.set(bucket, {
      sector: bucket,
      dealCount: deals.length,
      medianDealValue: disclosed.length > 0 ? median(disclosed) : undefined,
      dealValueIQR: disclosed.length >= 2
        ? [quantile(disclosed, 0.25), quantile(disclosed, 0.75)]
        : undefined,
      medianFundingMultiple: multiples.length > 0
        ? median(multiples)
        : undefined,
      fundingMultipleN: multiples.length,
      medianYearsToExit: yearsToExit.length > 0
        ? median(yearsToExit)
        : undefined,
    });
  }

  // Overall exit base rate: acquired targets / total companies.
  const acquiredTargetIds = new Set(acquisitions.map((d) => d.targetId));
  const acquiredInDataset =
    companies.filter((c) =>
      acquiredTargetIds.has(c.id) || c.stage.toLowerCase().includes("acquired")
    ).length;
  const overallExitRate = companies.length > 0
    ? acquiredInDataset / companies.length
    : 0;

  return {
    overallExitRate,
    companyCount: companies.length,
    dealCount: acquisitions.length,
    disclosedDealCount: allDisclosedValues.length,
    medianDealValueAll: allDisclosedValues.length > 0
      ? median(allDisclosedValues)
      : undefined,
    medianFundingMultipleAll: allFundingMultiples.length > 0
      ? median(allFundingMultiples)
      : undefined,
    sectorPriors,
    derivationNote:
      `Derived from ${acquisitions.length} verified deals (${allDisclosedValues.length} with disclosed values, ` +
      `${allFundingMultiples.length} with funding-to-exit multiples) across ${companies.length} companies. ` +
      `Disclosed-only values carry disclosure bias; per-sector n is small.`,
  };
}

// ==================== STAGE MEDIAN DERIVATION ====================

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
    s.includes("series d") || s.includes("series e") || s.includes("series f") ||
    s.includes("late stage") || s.includes("pre-ipo")
  ) return "Series D+";
  if (s.includes("series c")) return "Series C";
  if (s.includes("series b")) return "Series B";
  if (s.includes("series a")) return "Series A";
  if (s.includes("seed")) return "Seed";
  return null;
}

/**
 * Derive stage-level funding medians from the verified dataset.
 * Proxy: median total-funding-raised by funding stage (not pre-money valuation).
 */
export function deriveStageMedians(
  companies: readonly VerifiedCompanyView[],
): DatasetStageMedians {
  const byStage = new Map<FundingStageKey, number[]>();
  for (const company of companies) {
    const key = normalizeFundingStage(company.stage);
    if (!key || typeof company.totalFunding !== "number" || company.totalFunding <= 0) {
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
  const totalN = (Object.values(sampleSizes) as number[]).reduce((s, n) => s + n, 0);
  return {
    medians,
    sampleSizes,
    derivationNote:
      `Stage medians derived from ${totalN} verified companies with disclosed funding ` +
      `(proxy: median total-funding-raised by stage — not a pre-money valuation).`,
  };
}

/** Look up the sector prior for a free-form sector string. */
export function getSectorPrior(
  priors: EmpiricalPriors,
  sector: string,
): SectorPrior | undefined {
  return priors.sectorPriors.get(normalizeSectorBucket(sector));
}
