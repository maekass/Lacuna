import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";
import { buildPendingQueueMetrics } from "@/lib/ingestion/pendingQueueMetrics";

export interface SecIngestStatusPayload {
  ok: true;
  latest: Awaited<ReturnType<typeof getLatestIngestRun>>;
  pendingReviewCount: number;
  oldestPendingIngestedAt: string | null;
  /** Full queue breakdown — same source as GET /api/deals/pending/metrics. */
  queue: Awaited<ReturnType<typeof buildPendingQueueMetrics>>;
  cronPath: string;
  cli: string;
  reviewQueuePath: string;
  pendingApiPath: string;
}

/** Postgres-backed SEC ingest snapshot for status APIs and pipeline UI. */
export async function buildSecIngestStatusPayload(): Promise<
  SecIngestStatusPayload
> {
  const [latest, queue] = await Promise.all([
    getLatestIngestRun(),
    buildPendingQueueMetrics(),
  ]);

  return {
    ok: true,
    latest,
    pendingReviewCount: queue.pending,
    oldestPendingIngestedAt: queue.oldestPendingIngestedAt,
    queue,
    cronPath: "/api/cron/sec-ingest",
    cli: "npm run sec:ingest",
    reviewQueuePath: "/deals#review",
    pendingApiPath: "/api/deals/pending",
  };
}
