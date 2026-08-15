import type { IngestRunStatus } from "@/lib/ingestion/ingestRunState";
import { generatedAtFromProvenance } from "./computedArtifactMeta";
import { hashDataset } from "@/lib/lineage/datasetHash";
import type { VerifiedDataset } from "./datasetTypes";
import {
  computeDisclosureStats,
  type DisclosureStats,
} from "./datasetCoverageStats";
import {
  computeHeadlineStats,
  type HeadlineStats,
} from "./computeHeadlineStats";

export const DATASET_SUMMARY_MODEL = "computeHeadlineStats/v1" as const;

export interface DatasetPipelineStatus {
  secIngestLastRunAt: string | null;
  secIngestStatus: IngestRunStatus | null;
}

export interface DatasetSummary {
  generatedAt: string;
  model: typeof DATASET_SUMMARY_MODEL;
  provenance: {
    lastUpdated: string;
    datasetVersion?: string;
    datasetHash?: string;
  };
  headline: HeadlineStats;
  disclosure: DisclosureStats;
  pipelines: DatasetPipelineStatus;
}

/**
 * Canonical dataset summary for APIs, scripts, and health checks.
 * Recomputed from the verified dataset — never hand-edited.
 */
export function buildDatasetSummary(
  dataset: VerifiedDataset,
  pipelines: DatasetPipelineStatus = {
    secIngestLastRunAt: null,
    secIngestStatus: null,
  },
): DatasetSummary {
  const datasetHash = dataset.provenance.datasetHash ??
    hashDataset(dataset).fullHash;
  return {
    generatedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
    model: DATASET_SUMMARY_MODEL,
    provenance: {
      lastUpdated: dataset.provenance.lastUpdated,
      datasetVersion: dataset.provenance.datasetVersion,
      datasetHash,
    },
    headline: computeHeadlineStats(dataset),
    disclosure: computeDisclosureStats(dataset),
    pipelines,
  };
}
