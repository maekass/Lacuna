import type { VerifiedDataset } from "./datasetTypes";
import computedSummary from "@/data/computed-dataset-summary.json";

export interface DatasetChangelog {
  currentDealCount: number;
  priorDealCount: number;
  dealsAddedSinceSnapshot: number;
  currentLastUpdated: string;
  priorLastUpdated: string;
  hasNewDeals: boolean;
  label: string;
}

/**
 * Compares live verified dataset against the last computed snapshot for hub/methods footnotes.
 */
export function getDatasetChangelog(dataset: VerifiedDataset): DatasetChangelog {
  const currentDealCount = dataset.acquisitions.length;
  const priorDealCount = computedSummary.headline.verifiedDeals;
  const dealsAddedSinceSnapshot = Math.max(0, currentDealCount - priorDealCount);
  const currentLastUpdated = dataset.provenance.lastUpdated;
  const priorLastUpdated = computedSummary.provenance.lastUpdated;
  const hasNewDeals = dealsAddedSinceSnapshot > 0;

  const label = hasNewDeals
    ? `+${dealsAddedSinceSnapshot} verified deal${
      dealsAddedSinceSnapshot === 1 ? "" : "s"
    } since ${priorLastUpdated}`
    : `${currentDealCount} verified deals · last updated ${currentLastUpdated}`;

  return {
    currentDealCount,
    priorDealCount,
    dealsAddedSinceSnapshot,
    currentLastUpdated,
    priorLastUpdated,
    hasNewDeals,
    label,
  };
}
