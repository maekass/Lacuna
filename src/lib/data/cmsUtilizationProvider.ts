/**
 * CMS utilization lookup from computed PUF artifacts.
 *
 * Primary source: `scripts/fetch-cms-utilization.ts` →
 * `src/data/computed-cms-utilization.json`
 */

import computedCmsUtilization from "@/data/computed-cms-utilization.json";

export type CmsUtilizationSource = "cpt" | "sector" | "portfolio_median";

export interface AnnualUsesResolution {
  annualUses: number;
  source: CmsUtilizationSource;
}

interface SectorUtilizationRow {
  sector: string;
  cptCodes: string[];
  avgServicesPerCode: number | null;
}

interface CptUtilizationRow {
  sector: string;
  cptCode: string;
  totalServices?: number | null;
  avgMedicarePayment?: number | null;
}

interface ComputedCmsUtilizationFile {
  sectors: SectorUtilizationRow[];
  utilizationByCptCode: CptUtilizationRow[];
}

function normalizeSectorKey(sector: string): string {
  return sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

interface CmsUtilizationIndex {
  byCptCode: Map<string, number>;
  bySectorKey: Map<string, number>;
  portfolioMedian: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 100;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function loadCmsUtilizationIndex(): CmsUtilizationIndex {
  const raw = computedCmsUtilization as ComputedCmsUtilizationFile;

  const bySectorKey = new Map<string, number>();
  for (const sector of raw.sectors ?? []) {
    if (
      sector.avgServicesPerCode !== null &&
      sector.avgServicesPerCode !== undefined
    ) {
      bySectorKey.set(
        normalizeSectorKey(sector.sector),
        sector.avgServicesPerCode,
      );
    }
  }

  const byCptCode = new Map<string, number>();
  for (const row of raw.utilizationByCptCode ?? []) {
    if (row.totalServices !== null && row.totalServices !== undefined) {
      byCptCode.set(row.cptCode, row.totalServices);
      continue;
    }
    const sectorUses = bySectorKey.get(normalizeSectorKey(row.sector));
    if (sectorUses !== undefined) {
      byCptCode.set(row.cptCode, sectorUses);
    }
  }

  const portfolioMedian = median(
    (raw.sectors ?? [])
      .map((s) => s.avgServicesPerCode)
      .filter((v): v is number => v !== null && v !== undefined),
  );

  return { byCptCode, bySectorKey, portfolioMedian };
}

const utilizationIndex: CmsUtilizationIndex = loadCmsUtilizationIndex();

/**
 * Portfolio-wide median annual services per CPT code from computed CMS PUF data.
 * Replaces the former flat default of 100.
 */
export function getPortfolioMedianAnnualUsesPerCode(): number {
  return utilizationIndex.portfolioMedian;
}

/** @deprecated Use resolveAnnualUsesPerCode — kept for importers expecting a scalar default. */
export const DEFAULT_ANNUAL_USES_PER_CODE =
  getPortfolioMedianAnnualUsesPerCode();

/**
 * Resolve annual Medicare service volume for a CPT code.
 */
export function resolveAnnualUsesPerCode(
  cptCode: string,
): AnnualUsesResolution {
  const cptUses = utilizationIndex.byCptCode.get(cptCode);
  if (cptUses !== undefined) {
    const row = (computedCmsUtilization as ComputedCmsUtilizationFile)
      .utilizationByCptCode
      .find((r) => r.cptCode === cptCode);
    const hasDirect = row?.totalServices !== null &&
      row?.totalServices !== undefined;
    return {
      annualUses: cptUses,
      source: hasDirect ? "cpt" : "sector",
    };
  }

  return {
    annualUses: utilizationIndex.portfolioMedian,
    source: "portfolio_median",
  };
}

/**
 * Estimate annual Medicare reimbursement for matched CPT codes using
 * sourced utilization volumes × Medicare rates.
 */
export function estimateAnnualReimbursementFromCodes(
  codes: Array<{ code: string; medicareRate: number }>,
): number {
  return codes.reduce((sum, entry) => {
    const uses = resolveAnnualUsesPerCode(entry.code).annualUses;
    return sum + entry.medicareRate * uses;
  }, 0);
}

/**
 * Sector-level average annual services per code from computed CMS data.
 */
export function getSectorAvgServicesPerCode(sector: string): number | null {
  return utilizationIndex.bySectorKey.get(normalizeSectorKey(sector)) ?? null;
}
