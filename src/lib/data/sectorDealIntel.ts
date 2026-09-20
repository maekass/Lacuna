/**
 * Sector deal context for the Intelligence reimbursement panel.
 *
 * Joins acquisitions → companies on `targetId` and compares `sectorKey`.
 * Name-substring matching is forbidden: "Sividon Diagnostics" is Breast
 * Health, not Diagnostics, and "KaNDy Therapeutics" is Menopause, not
 * Therapeutics.
 */

export const SECTOR_DEAL_TABLE_LIMIT = 8;
export const SECTOR_ACQUIRER_LIMIT = 8;

export interface SectorDealCompany {
  readonly id: string;
  readonly sector: string;
}

export interface SectorDealAcquisition {
  readonly id: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly acquirerName: string;
  readonly announcedDate: string;
  readonly dealValue?: number;
}

export interface SectorDealIntel<T extends SectorDealAcquisition> {
  sector: string;
  companyCount: number;
  /** All verified deals whose target company sector matches, not a table cap. */
  dealCount: number;
  /** Newest-first slice for the table. Length may be < dealCount. */
  deals: T[];
  disclosedCount: number;
  medianDealValueM: number | null;
  acquirers: string[];
}

/** Primary sector label before a `/` taxonomy suffix. */
export function sectorKey(sector: string): string {
  return sector.split("/")[0]?.trim() ?? sector;
}

/**
 * Chip/heading label. The bare `Diagnostic` taxonomy is the Rock Health
 * portfolio cohort — never show it as if it were acquired Diagnostics.
 */
export function displaySectorLabel(sector: string): string {
  return sectorKey(sector) === "Diagnostic"
    ? "Diagnostic (portfolio)"
    : sectorKey(sector);
}

/** Portfolio diagnostic companies, not acquired Diagnostics targets. */
export function isPortfolioDiagnosticSector(sector: string): boolean {
  const key = sectorKey(sector);
  return key === "Diagnostic" || key.includes("(portfolio)");
}

/**
 * Median of disclosed deal values in USD millions.
 * Even-n uses the mean of the two central observations; does not mutate input.
 */
export function medianDisclosedDealValueM(
  values: readonly number[],
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Build descriptive sector intel from verified companies + acquisitions.
 * `dealCount` is the full join; `deals` is a display slice.
 */
export function buildSectorDealIntel<T extends SectorDealAcquisition>(
  sector: string,
  companies: readonly SectorDealCompany[],
  acquisitions: readonly T[],
): SectorDealIntel<T> {
  const companyIds = new Set(
    companies.filter((c) => sectorKey(c.sector) === sector).map((c) => c.id),
  );
  const deals = acquisitions
    .filter((a) => companyIds.has(a.targetId))
    .slice()
    .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate));
  const disclosed = deals
    .map((d) => d.dealValue)
    .filter((v): v is number => typeof v === "number");

  return {
    sector,
    companyCount: companyIds.size,
    dealCount: deals.length,
    deals: deals.slice(0, SECTOR_DEAL_TABLE_LIMIT),
    disclosedCount: disclosed.length,
    medianDealValueM: medianDisclosedDealValueM(disclosed),
    acquirers: [...new Set(deals.map((d) => d.acquirerName))].slice(
      0,
      SECTOR_ACQUIRER_LIMIT,
    ),
  };
}
