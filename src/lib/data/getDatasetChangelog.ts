import type { VerifiedDataset } from "./datasetTypes";
import computedSummary from "@/data/computed-dataset-summary.json";
import {
  formatTierCoverageLabel,
  formatVerifiedGrowthLabel,
  type TierCoverageCounts,
} from "@/lib/data/datasetCoverage";

export interface DatasetChangelog {
  currentDealCount: number;
  priorDealCount: number;
  dealsAddedSinceSnapshot: number;
  currentLastUpdated: string;
  priorLastUpdated: string;
  hasNewDeals: boolean;
  label: string;
  /** Tier 2 staging rows — null until Postgres metrics load. */
  candidateCount: number | null;
  coverageLabel: string;
}

/** Attach Tier 2 candidate count to a verified-only changelog snapshot. */
export function mergeChangelogWithCandidates(
  changelog: DatasetChangelog,
  candidateCount: number | null,
): DatasetChangelog {
  const counts: TierCoverageCounts = {
    verifiedDealCount: changelog.currentDealCount,
    stagingCandidateCount: candidateCount,
  };
  return {
    ...changelog,
    candidateCount,
    coverageLabel: formatTierCoverageLabel(counts),
  };
}

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
