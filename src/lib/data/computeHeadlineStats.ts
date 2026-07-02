import type { ModelProvenance } from "@/lib/provenance/modelProvenance";
import type { VerifiedDataset } from "./datasetTypes";
import { computeDisclosureStats } from "./datasetCoverageStats";

export interface HeadlineStatsInput {
  companies: ReadonlyArray<{ sources?: readonly string[] }>;
  acquirers: ReadonlyArray<{ id: string }>;
  acquisitions: ReadonlyArray<{ dealValue?: number; source?: string }>;
  provenance: {
    lastUpdated: string;
    datasetVersion?: string;
  };
}

export interface HeadlineStats {
  companiesInNetwork: number;
  acquirerCount: number;
  networkNodeCount: number;
  verifiedDeals: number;
  disclosedValueMillions: number;
  disclosedValueBillionsLabel: string;
  uniqueSourceCitations: number;
  lastUpdated: string;
  datasetVersion?: string;
}

export interface HeadlineStatTile {
  label: string;
  value: string;
  model: ModelProvenance;
}

const HEADLINE_STATS_MODULE = "src/lib/data/computeHeadlineStats.ts";

/** Per-tile provenance for hub StatTiles (hover → source module). */
export const HEADLINE_STAT_MODELS = {
  companiesInNetwork: {
    module: HEADLINE_STATS_MODULE,
    exportName: "computeHeadlineStats",
    definition:
      "companiesInNetwork = companies.length in dataset.verified.json (via computeDisclosureStats).",
  },
  verifiedDeals: {
    module: HEADLINE_STATS_MODULE,
    exportName: "computeHeadlineStats",
    definition:
      "verifiedDeals = acquisitions.length in dataset.verified.json (via computeDisclosureStats).",
  },
  disclosedValue: {
    module: HEADLINE_STATS_MODULE,
    exportName: "formatDisclosedValueBillions",
    definition:
      "Sum of dealValue (USD millions) on verified acquisitions with disclosed price, formatted as $B.",
  },
  uniqueSourceCitations: {
    module: HEADLINE_STATS_MODULE,
    exportName: "countUniqueSourceCitations",
    definition:
      "Distinct citation strings on company.sources[] and acquisition.source in dataset.verified.json.",
  },
} as const satisfies Record<string, ModelProvenance>;

/** Count distinct citation strings on companies and deals (not provenance category list). */
export function countUniqueSourceCitations(
  companies: ReadonlyArray<{ sources?: readonly string[] }>,
  acquisitions: ReadonlyArray<{ source?: string }>,
): number {
  const citations = new Set<string>();
  for (const company of companies) {
    for (const source of company.sources ?? []) {
      const trimmed = source?.trim();
      if (trimmed) citations.add(trimmed);
    }
  }
  for (const deal of acquisitions) {
    const trimmed = deal.source?.trim();
    if (trimmed) citations.add(trimmed);
  }
  return citations.size;
}

/** Format disclosed deal value (stored in millions) for hub tiles. */
export function formatDisclosedValueBillions(
  disclosedValueMillions: number,
): string {
  return `$${(disclosedValueMillions / 1000).toFixed(1)}B`;
}

/**
 * Hub headline metrics derived from the verified dataset.
 * Shared by UI, `/api/dataset/summary`, and `scripts/compute-dataset-summary.ts`.
 */
export function computeHeadlineStats(input: HeadlineStatsInput): HeadlineStats {
  const disclosure = computeDisclosureStats(input);
  const disclosedValueMillions = input.acquisitions.reduce(
    (sum, deal) => sum + (deal.dealValue ?? 0),
    0,
  );

  return {
    companiesInNetwork: disclosure.companiesTotal,
    acquirerCount: input.acquirers.length,
    networkNodeCount: disclosure.companiesTotal + input.acquirers.length,
    verifiedDeals: disclosure.dealsTotal,
    disclosedValueMillions,
    disclosedValueBillionsLabel: formatDisclosedValueBillions(
      disclosedValueMillions,
    ),
    uniqueSourceCitations: countUniqueSourceCitations(
      input.companies,
      input.acquisitions,
    ),
    lastUpdated: input.provenance.lastUpdated,
    datasetVersion: input.provenance.datasetVersion,
  };
}

export function computeHeadlineStatsFromDataset(
  dataset: VerifiedDataset,
): HeadlineStats {
  return computeHeadlineStats(dataset);
}

/** Stat tiles for HubPage / StatTile. */
export function headlineStatsToTiles(
  stats: HeadlineStats,
): HeadlineStatTile[] {
  return [
    {
      label: "Companies in our network",
      value: stats.companiesInNetwork.toString(),
      model: HEADLINE_STAT_MODELS.companiesInNetwork,
    },
    {
      label: "Verified deals",
      value: stats.verifiedDeals.toString(),
      model: HEADLINE_STAT_MODELS.verifiedDeals,
    },
    {
      label: "In disclosed value",
      value: stats.disclosedValueBillionsLabel,
      model: HEADLINE_STAT_MODELS.disclosedValue,
    },
    {
      label: "Public sources cited",
      value: stats.uniqueSourceCitations.toString(),
      model: HEADLINE_STAT_MODELS.uniqueSourceCitations,
    },
  ];
}
