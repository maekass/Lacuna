/** Minimal shape for coverage stats — works with raw JSON or derived views. */
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

export interface CoverageDatasetInput {
  companies: ReadonlyArray<{
    id: string;
    sector: string;
    lastKnownValuation?: number;
  }>;
  acquisitions: ReadonlyArray<{
    targetId: string;
    acquirerId: string;
    announcedDate: string;
    dealValue?: number;
    dealValueNote?: string;
  }>;
  acquirers: ReadonlyArray<{ id: string }>;
}

export interface SectorDealCount {
  sector: string;
  companies: number;
  deals: number;
  disclosedPrices: number;
}

export interface YearDealCount {
  year: number;
  count: number;
  disclosedPrices: number;
}

export interface DisclosureStats {
  dealsTotal: number;
  dealsDisclosed: number;
  dealsUndisclosed: number;
  dealsWithValueNote: number;
  disclosureRate: number;
  companiesWithValuation: number;
  companiesTotal: number;
  valuationRate: number;
}

/** Minimum n thresholds used in methodology docs for UI badges. */
export interface EffectiveNBadges {
  network: {
    n: number;
    label: string;
    tier: "insufficient" | "low" | "medium" | "high";
  };
  competitive: {
    n: number;
    label: string;
    tier: "insufficient" | "low" | "medium" | "high";
  };
  priceAnalytics: {
    n: number;
    label: string;
    tier: "insufficient" | "low" | "medium" | "high";
  };
  dealVelocity: {
    n: number;
    label: string;
    tier: "insufficient" | "low" | "medium" | "high";
  };
}

function tierFromN(
  n: number,
  thresholds: { insufficient: number; low: number; medium: number },
): EffectiveNBadges["network"]["tier"] {
  if (n < thresholds.insufficient) return "insufficient";
  if (n < thresholds.low) return "low";
  if (n < thresholds.medium) return "medium";
  return "high";
}

export function computeDisclosureStats(
  dataset: CoverageDatasetInput,
): DisclosureStats {
  const { companies, acquisitions } = dataset;
  let dealsDisclosed = 0;
  let dealsWithValueNote = 0;
  for (const d of acquisitions) {
    if (typeof d.dealValue === "number") dealsDisclosed += 1;
    if (d.dealValueNote?.trim()) dealsWithValueNote += 1;
  }
  const dealsTotal = acquisitions.length;
  const companiesWithValuation =
    companies.filter((c) => typeof c.lastKnownValuation === "number").length;
  return {
    dealsTotal,
    dealsDisclosed,
    dealsUndisclosed: dealsTotal - dealsDisclosed,
    dealsWithValueNote,
    disclosureRate: dealsTotal > 0 ? dealsDisclosed / dealsTotal : 0,
    companiesWithValuation,
    companiesTotal: companies.length,
    valuationRate: companies.length > 0
      ? companiesWithValuation / companies.length
      : 0,
  };
}

export function computeSectorDealCounts(
  dataset: CoverageDatasetInput,
): SectorDealCount[] {
  const companySector = new Map(dataset.companies.map((c) => [c.id, c.sector]));
  const sectors = new Set(dataset.companies.map((c) => c.sector));

  return [...sectors]
    .sort()
    .map((sector) => {
      const companies = dataset.companies.filter((c) =>
        c.sector === sector
      ).length;
      const deals = dataset.acquisitions.filter((d) =>
        companySector.get(d.targetId) === sector
      );
      const disclosedPrices =
        deals.filter((d) => typeof d.dealValue === "number").length;
      return { sector, companies, deals: deals.length, disclosedPrices };
    });
}

export function computeYearDealCounts(
  dataset: CoverageDatasetInput,
): YearDealCount[] {
  const byYear = new Map<number, { count: number; disclosedPrices: number }>();
  for (const d of dataset.acquisitions) {
    const year = new Date(d.announcedDate).getFullYear();
    const row = byYear.get(year) ?? { count: 0, disclosedPrices: 0 };
    row.count += 1;
    if (typeof d.dealValue === "number") row.disclosedPrices += 1;
    byYear.set(year, row);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, row]) => ({ year, ...row }));
}

export function computeEffectiveNBadges(
  dataset: CoverageDatasetInput,
): EffectiveNBadges {
  const dealCount = dataset.acquisitions.length;
  const disclosed =
    dataset.acquisitions.filter((d) => typeof d.dealValue === "number").length;
  const acquirerIds = new Set(dataset.acquisitions.map((d) => d.acquirerId));
  const nodeCount = dataset.companies.length + dataset.acquirers.length;

  return {
    network: {
      n: dealCount,
      label: `${nodeCount} nodes, ${dealCount} edges`,
      tier: tierFromN(dealCount, { insufficient: 5, low: 10, medium: 20 }),
    },
    competitive: {
      n: dealCount,
      label: `${dealCount} deals, ${acquirerIds.size} buyers`,
      tier: tierFromN(dealCount, { insufficient: 5, low: 15, medium: 30 }),
    },
    priceAnalytics: {
      n: disclosed,
      label: `${disclosed} disclosed prices`,
      tier: tierFromN(disclosed, { insufficient: 3, low: 8, medium: 15 }),
    },
    dealVelocity: {
      n: dealCount,
      label: `${dealCount} deals`,
      tier: tierFromN(dealCount, { insufficient: 5, low: 20, medium: 50 }),
    },
  };
}

const COVERAGE_MODULE = "src/lib/data/datasetCoverageStats.ts";

/** Hover provenance for DataCoverageCard stat tiles. */
export const COVERAGE_STAT_MODELS = {
  companies: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition: "companiesTotal = companies.length in dataset.verified.json.",
  },
  deals: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition: "dealsTotal = acquisitions.length in dataset.verified.json.",
  },
  disclosedPrice: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition: "Deals with numeric dealValue on verified acquisitions.",
  },
  undisclosedPrice: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition: "Deals without numeric dealValue on verified acquisitions.",
  },
  valuationCoverage: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition:
      "companiesWithValuation / companiesTotal where lastKnownValuation is set.",
  },
  disclosureRate: {
    module: COVERAGE_MODULE,
    exportName: "computeDisclosureStats",
    definition: "dealsDisclosed / dealsTotal (numeric dealValue required).",
  },
  effectiveN: {
    module: COVERAGE_MODULE,
    exportName: "computeEffectiveNBadges",
    definition:
      "Tiered sample-size badges from deal/node/disclosed-price counts (methodology thresholds).",
  },
} as const satisfies Record<string, ModelProvenance>;
