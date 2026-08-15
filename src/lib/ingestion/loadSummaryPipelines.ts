import process from "node:process";
import type { DatasetPipelineStatus } from "@/lib/data/buildDatasetSummary";
import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";
import { reportWarning } from "@/lib/observability/reportError";

const EMPTY_PIPELINES: DatasetPipelineStatus = {
  secIngestLastRunAt: null,
  secIngestStatus: null,
};

/**
 * Optional SEC ingest timestamps for dataset summary.
 * A down or unset database must not take down the summary API in static mode.
 */
export async function loadSummaryPipelines(): Promise<DatasetPipelineStatus> {
  if (!process.env.DATABASE_URL?.trim()) {
    return EMPTY_PIPELINES;
  }

  try {
    const latest = await getLatestIngestRun();
    if (!latest) return EMPTY_PIPELINES;
    return {
      secIngestLastRunAt: latest.ended_at ?? latest.started_at,
      secIngestStatus: latest.status,
    };
  } catch (error) {
    reportWarning("ingest.summaryPipelines", error, { optional: true });
    return EMPTY_PIPELINES;
  }
}
