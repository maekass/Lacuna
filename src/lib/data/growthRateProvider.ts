/**
 * Growth rate lookup from computed CAGR artifacts.
 *
 * Primary source: `scripts/compute-growth-rates.ts` →
 * `src/data/computed-growth-rates.json`
 */

import computedGrowthRates from "@/data/computed-growth-rates.json";

export type GrowthRateConfidence = "high" | "medium" | "low";

export interface GrowthRateResolution {
  growthRate: number;
  source: "company" | "sector" | "portfolio_median";
  confidence: GrowthRateConfidence;
}

interface CompanyGrowthRow {
  companyId: string;
  companyName: string;
  sector: string;
  cagr: number | null;
  confidence: GrowthRateConfidence | "none";
}

interface SectorMedianRow {
  medianCAGR: number;
  sampleSize: number;
  confidence: string;
}

interface ComputedGrowthRatesFile {
  companies: CompanyGrowthRow[];
  sectorMedians: Record<string, SectorMedianRow>;
}

function normalizeSectorKey(sector: string): string {
  return sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Maps UI / connector sector slugs to normalized keys in sectorMedians. */
const SECTOR_ALIASES: Record<string, string> = {
  digital_therapeutics: "digital_health",
  wearable_monitoring: "wearables",
  wearable: "wearables",
  wearables: "wearables",
  gynecology: "gynecological_surgery",
  diagnostics: "diagnostics",
  diagnostic: "diagnostic",
};

interface GrowthRateIndex {
  byCompanyId: Map<string, CompanyGrowthRow>;
  bySectorKey: Map<string, SectorMedianRow>;
  portfolioMedian: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function loadGrowthRateIndex(): GrowthRateIndex {
  const raw = computedGrowthRates as ComputedGrowthRatesFile;

  const byCompanyId = new Map<string, CompanyGrowthRow>();
  for (const row of raw.companies) {
    byCompanyId.set(row.companyId, row);
  }

  const bySectorKey = new Map<string, SectorMedianRow>();
  for (const [sectorName, stat] of Object.entries(raw.sectorMedians ?? {})) {
    bySectorKey.set(normalizeSectorKey(sectorName), stat);
  }

  const portfolioMedian = median(
    Object.values(raw.sectorMedians ?? {}).map((s) => s.medianCAGR),
  );

  return { byCompanyId, bySectorKey, portfolioMedian };
}

const growthIndex: GrowthRateIndex = loadGrowthRateIndex();

function toConfidence(value: string | undefined): GrowthRateConfidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function resolveSectorKey(sector: string): string {
  const normalized = normalizeSectorKey(sector);
  return SECTOR_ALIASES[normalized] ?? normalized;
}

/**
 * Look up a company-specific CAGR from computed growth rates.
 */
export function getCompanyGrowthRate(companyId: string): number | null {
  const row = growthIndex.byCompanyId.get(companyId);
  if (!row || row.cagr === null) return null;
  return row.cagr;
}

/**
 * Look up sector median CAGR from computed growth rates.
 */
export function getSectorGrowthRate(sector: string): number | null {
  const stat = growthIndex.bySectorKey.get(resolveSectorKey(sector));
  return stat?.medianCAGR ?? null;
}

/**
 * Resolve growth rate: company-specific CAGR when available, else sector median,
 * else portfolio-wide sector median from computed JSON.
 */
export function resolveGrowthRate(input: {
  sector: string;
  companyId?: string;
}): GrowthRateResolution {
  if (input.companyId) {
    const row = growthIndex.byCompanyId.get(input.companyId);
    if (row?.cagr !== null && row?.cagr !== undefined) {
      return {
        growthRate: row.cagr,
        source: "company",
        confidence: row.confidence === "none" ? "low" : row.confidence,
      };
    }
  }

  const sectorStat = growthIndex.bySectorKey.get(resolveSectorKey(input.sector));
  if (sectorStat) {
    return {
      growthRate: sectorStat.medianCAGR,
      source: "sector",
      confidence: toConfidence(sectorStat.confidence),
    };
  }

  return {
    growthRate: growthIndex.portfolioMedian,
    source: "portfolio_median",
    confidence: "low",
  };
}
