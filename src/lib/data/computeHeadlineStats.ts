import type { ModelProvenance } from "@/lib/provenance/modelProvenance";
import {
  formatDisclosedBillions,
  type LiveDisclosedStats,
  liveDisclosedStats,
} from "@/lib/data/lacunaDataset";
import type { VerifiedDataset } from "./datasetTypes";
import {
  computeDisclosureStats,
  type CoverageDatasetInput,
} from "./datasetCoverageStats";

export interface HeadlineStatsInput extends CoverageDatasetInput {
  provenance: {
    lastUpdated: string;
    datasetVersion?: string;
    datasetHash?: string;
  };
}

export interface HeadlineStats {
  companiesInNetwork: number;
  acquirerCount: number;
  networkNodeCount: number;
  verifiedDeals: number;
  /** All-scope sum of disclosed deal values, preserving the published API key. */
  disclosedValueMillions: number;
  disclosedValueBillionsLabel: string;
  /** Women's-health completed disclosed-only (estimand: disclosed_only_observed_sum). */
  disclosedValueMillionsWh: number;
  disclosedValueBillionsLabelWh: string;
  adjacencyExcludedMillions: number;
  estimand: LiveDisclosedStats["womensHealth"]["estimand"];
  estimandNote: string;
  coverageRate: number;
  coverageDenominator: number;
  coverageReferenceName: string;
  uniqueSourceCitations: number;
  lastUpdated: string;
  datasetVersion?: string;
  datasetHash?: string;
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
  womensHealthDisclosedValue: {
    module: "src/lib/data/lacunaDataset.ts",
    exportName: "liveDisclosedStats",
    definition:
      "Women's-health completed disclosed-only sum (estimand: disclosed_only_observed_sum). " +
      "Excludes adjacency scope and non-completed lifecycle rows. Not a market topline.",
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
  return formatDisclosedBillions(disclosedValueMillions);
}

/**
 * Hub headline metrics derived from the verified dataset.
 * Shared by UI, `/api/dataset/summary`, and `scripts/compute-dataset-summary.ts`.
 *
 * The legacy disclosed-value fields preserve the all-scope sum semantics.
 * Women's-health tiles use lacunaDataset's completed disclosed-only estimand.
 */
export function computeHeadlineStats(input: HeadlineStatsInput): HeadlineStats {
  const disclosure = computeDisclosureStats(input);
  const live = liveDisclosedStats({
    provenance: {
      lastUpdated: input.provenance.lastUpdated,
      datasetVersion: input.provenance.datasetVersion,
      sources: [],
      notes: [],
      purpose: "headline-stats",
      disclaimer: "internal",
    },
    companies: input.companies as VerifiedDataset["companies"],
    acquirers: input.acquirers as VerifiedDataset["acquirers"],
    acquisitions: input.acquisitions as VerifiedDataset["acquisitions"],
  });
  const disclosedValueMillions = input.acquisitions.reduce(
    (sum, deal) => sum + (deal.dealValue ?? 0),
    0,
  );
  const disclosedValueMillionsWh = live.womensHealth.disclosedOnlyTotalMillions;

  return {
    companiesInNetwork: disclosure.companiesTotal,
    acquirerCount: input.acquirers.length,
    networkNodeCount: disclosure.companiesTotal + input.acquirers.length,
    verifiedDeals: disclosure.dealsTotal,
    disclosedValueMillions,
    disclosedValueBillionsLabel: formatDisclosedValueBillions(
      disclosedValueMillions,
    ),
    disclosedValueMillionsWh,
    disclosedValueBillionsLabelWh: formatDisclosedValueBillions(
      disclosedValueMillionsWh,
    ),
    adjacencyExcludedMillions: live.adjacencyExcludedMillions,
    estimand: live.womensHealth.estimand,
    estimandNote: live.womensHealth.estimandNote,
    coverageRate: live.womensHealth.coverage.rate,
    coverageDenominator: live.womensHealth.coverage.denominator,
    coverageReferenceName: live.womensHealth.coverage.referenceName,
    uniqueSourceCitations: countUniqueSourceCitations(
      input.companies,
      input.acquisitions,
    ),
    lastUpdated: input.provenance.lastUpdated,
    datasetVersion: input.provenance.datasetVersion,
    datasetHash: input.provenance.datasetHash,
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
      label: "WH disclosed value (completed)",
      value: stats.disclosedValueBillionsLabelWh,
      model: HEADLINE_STAT_MODELS.womensHealthDisclosedValue,
    },
    {
      label: "Public sources cited",
      value: stats.uniqueSourceCitations.toString(),
      model: HEADLINE_STAT_MODELS.uniqueSourceCitations,
    },
  ];
}
