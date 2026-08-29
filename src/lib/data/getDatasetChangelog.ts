import type { VerifiedDataset } from "./datasetTypes";
import computedSummary from "@/data/computed-dataset-summary.json";
import {
  type DatasetChangelog,
  formatTierCoverageLabel,
  formatVerifiedGrowthLabel,
  type TierCoverageCounts,
} from "@/lib/data/datasetCoverage";

export type { DatasetChangelog };
export { mergeChangelogWithCandidates } from "@/lib/data/datasetCoverage";

/**
 * Compares live verified dataset against the last computed snapshot for hub/methods footnotes.
 */
export function getDatasetChangelog(
  dataset: VerifiedDataset,
): DatasetChangelog {
  const currentDealCount = dataset.acquisitions.length;
  const priorDealCount = computedSummary.headline.verifiedDeals;
  const dealsAddedSinceSnapshot = Math.max(
    0,
    currentDealCount - priorDealCount,
  );
  const currentLastUpdated = dataset.provenance.lastUpdated;
  const priorLastUpdated = computedSummary.provenance.lastUpdated;
  const hasNewDeals = dealsAddedSinceSnapshot > 0;

  const label = formatVerifiedGrowthLabel({
    added: dealsAddedSinceSnapshot,
    priorSnapshotDate: priorLastUpdated,
    currentLastUpdated,
    currentDealCount,
  });

  const counts: TierCoverageCounts = {
    verifiedDealCount: currentDealCount,
    stagingCandidateCount: null,
  };

  return {
    currentDealCount,
    priorDealCount,
    dealsAddedSinceSnapshot,
    currentLastUpdated,
    priorLastUpdated,
    hasNewDeals,
    label,
    candidateCount: null,
    coverageLabel: formatTierCoverageLabel(counts),
  };
}
