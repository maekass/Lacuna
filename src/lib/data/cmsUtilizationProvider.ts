/**
 * CMS utilization lookup from computed PUF artifacts.
 *
 * Primary source: `scripts/fetch-cms-utilization.ts` →
 * `src/data/computed-cms-utilization.json`
 */

import computedCmsUtilization from "@/data/computed-cms-utilization.json";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

export type CmsUtilizationSource = "cpt" | "sector" | "withheld";

export interface AnnualUsesResolution {
  annualUses: number;
  source: CmsUtilizationSource;
}

interface SectorUtilizationRow {
  sector: string;
  cptCodes: string[];
  avgServicesPerCode: number | null;
}

export type CmsRowProvenanceKind = "api" | "hardcoded_fallback";

interface CptUtilizationRow {
  sector: string;
  cptCode: string;
  totalServices?: number | null;
  avgMedicarePayment?: number | null;
  provenanceKind?: CmsRowProvenanceKind;
  pufDataYear?: number | "unknown";
  fetchedAt?: string;
  roundingGrid?: number | null;
}

interface ComputedCmsUtilizationFile {
  source?: string;
  intendedSource?: string;
  generatedAt?: string;
  evidenceStatus?: string;
  sectors: SectorUtilizationRow[];
  utilizationByCptCode: CptUtilizationRow[];
}

export interface CmsUtilizationProvenance {
  readonly source: string;
  readonly intendedSource: string | null;
  readonly generatedAt: string | null;
  readonly evidenceStatus: string | null;
  readonly withheld: boolean;
  readonly allHardcodedFallback: boolean;
  readonly fallbackRowCount: number;
  readonly rowCount: number;
}

function normalizeSectorKey(sector: string): string {
  return sector.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

interface CmsUtilizationIndex {
  byCptCode: Map<string, number>;
  bySectorKey: Map<string, number>;
  portfolioMedian: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
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
  return utilizationIndex.portfolioMedian ?? 0;
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
    annualUses: 0,
    source: "withheld",
  };
}

function decisionGradeUsesForCode(cptCode: string): number | null {
  const row = (computedCmsUtilization as ComputedCmsUtilizationFile)
    .utilizationByCptCode
    .find((candidate) => candidate.cptCode === cptCode);
  if (!row) return null;
  if (row.provenanceKind === "hardcoded_fallback") return null;
  if (row.totalServices === null || row.totalServices === undefined) {
    return null;
  }
  return row.totalServices;
}

/**
 * Estimate annual Medicare reimbursement from decision-grade utilization only.
 * Hardcoded fallback rows and unknown CPT codes contribute nothing.
 */
export function estimateAnnualReimbursementFromCodes(
  codes: Array<{ code: string; medicareRate: number }>,
): number {
  return codes.reduce((sum, entry) => {
    const uses = decisionGradeUsesForCode(entry.code);
    if (uses === null) return sum;
    return sum + entry.medicareRate * uses;
  }, 0);
}

/**
 * Sector-level average annual services per code from computed CMS data.
 */
export function getSectorAvgServicesPerCode(sector: string): number | null {
  return utilizationIndex.bySectorKey.get(normalizeSectorKey(sector)) ?? null;
}

/**
 * Artifact-level provenance. Fallback rows and withheld-empty files must be
 * disclosed — never labeled as a live CMS pull.
 */
export function getCmsUtilizationProvenance(): CmsUtilizationProvenance {
  const raw = computedCmsUtilization as ComputedCmsUtilizationFile;
  const rows = raw.utilizationByCptCode ?? [];
  const fallbackRowCount =
    rows.filter((row) => row.provenanceKind === "hardcoded_fallback").length;
  const evidenceStatus = raw.evidenceStatus ?? null;
  const withheld = (evidenceStatus ?? "").startsWith("withheld") ||
    rows.length === 0;
  return {
    source: raw.source ?? "",
    intendedSource: raw.intendedSource ?? null,
    generatedAt: raw.generatedAt ?? null,
    evidenceStatus,
    withheld,
    allHardcodedFallback: rows.length > 0 && fallbackRowCount === rows.length,
    fallbackRowCount,
    rowCount: rows.length,
  };
}

/** True when any CPT row is the in-script fallback table. */
export function isCmsUtilizationHardcodedFallback(): boolean {
  return getCmsUtilizationProvenance().fallbackRowCount > 0;
}

const CMS_UTILIZATION_MODULE = "src/lib/data/cmsUtilizationProvider.ts";

/** Hover provenance for CMS utilization disclosure counts. */
export const CMS_UTILIZATION_MODELS = {
  fallbackRowCount: {
    module: CMS_UTILIZATION_MODULE,
    exportName: "getCmsUtilizationProvenance",
    definition:
      "Count of in-repo hardcoded CMS utilization CPT rows — not a data.cms.gov PUF pull.",
  },
  rowCount: {
    module: CMS_UTILIZATION_MODULE,
    exportName: "getCmsUtilizationProvenance",
    definition: "Total CPT rows in computed-cms-utilization.json.",
  },
} as const satisfies Record<string, ModelProvenance>;
