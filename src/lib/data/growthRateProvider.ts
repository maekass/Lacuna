/**
 * Growth rate lookup from computed operating-growth artifacts.
 *
 * MeshIC rule: no financing-derived or valuation-derived rate is substituted
 * for operating growth. When no comparable revenue series exists, resolution
 * returns NaN with source="withheld"; downstream threshold comparisons then
 * apply no growth premium/discount instead of inventing a neutral rate.
 */

import computedGrowthRates from "@/data/computed-growth-rates.json";

export type GrowthRateConfidence = "high" | "medium" | "low" | "none";
export type GrowthRateSource = "company" | "sector" | "withheld";

export interface GrowthRateResolution {
  growthRate: number;
  source: GrowthRateSource;
  confidence: GrowthRateConfidence;
}

interface CompanyGrowthRow {
  companyId: string;
  companyName: string;
  sector: string;
  cagr: number | null;
  confidence: GrowthRateConfidence;
}

interface SectorMedianRow {
  medianCAGR: number | null;
  sampleSize: number;
  confidence: GrowthRateConfidence | string;
}

interface ComputedGrowthRatesFile {
  companies?: CompanyGrowthRow[];
  sectorMedians?: Record<string, SectorMedianRow>;
}

function normalizeSectorKey(sector: string): string {
  return sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

const SECTOR_ALIASES: Record<string, string> = {
  digital_therapeutics: "digital_health",
  wearable_monitoring: "wearables",
  wearable: "wearables",
  wearables: "wearables",
  gynecology: "gynecological_surgery",
  diagnostics: "diagnostics",
  diagnostic: "diagnostic",
};

const raw = computedGrowthRates as ComputedGrowthRatesFile;
const companyRows = raw.companies ?? [];
const sectorRows = raw.sectorMedians ?? {};
const byCompanyId = new Map(companyRows.map((row) => [row.companyId, row]));
const bySectorKey = new Map(
  Object.entries(sectorRows).map((
    [sector, row],
  ) => [normalizeSectorKey(sector), row]),
);

function toConfidence(value: string | undefined): GrowthRateConfidence {
  if (
    value === "high" || value === "medium" || value === "low" ||
    value === "none"
  ) return value;
  return "none";
}

function finiteRate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveSectorKey(sector: string): string {
  const normalized = normalizeSectorKey(sector);
  return SECTOR_ALIASES[normalized] ?? normalized;
}

export function getCompanyGrowthRate(companyId: string): number | null {
  return finiteRate(byCompanyId.get(companyId)?.cagr);
}

export function getSectorGrowthRate(sector: string): number | null {
  return finiteRate(bySectorKey.get(resolveSectorKey(sector))?.medianCAGR);
}

/**
 * Resolve only observed/comparable operating growth. NaN is an explicit
 * unavailable sentinel kept for backward compatibility with number-typed
 * valuation inputs; it intentionally fails all >/< growth adjustment checks.
 */
export function resolveGrowthRate(input: {
  sector: string;
  companyId?: string;
}): GrowthRateResolution {
  if (input.companyId) {
    const row = byCompanyId.get(input.companyId);
    const rate = finiteRate(row?.cagr);
    if (rate !== null) {
      return {
        growthRate: rate,
        source: "company",
        confidence: toConfidence(row?.confidence),
      };
    }
  }

  const sector = bySectorKey.get(resolveSectorKey(input.sector));
  const sectorRate = finiteRate(sector?.medianCAGR);
  if (sectorRate !== null) {
    return {
      growthRate: sectorRate,
      source: "sector",
      confidence: toConfidence(sector?.confidence),
    };
  }

  return { growthRate: Number.NaN, source: "withheld", confidence: "none" };
}
