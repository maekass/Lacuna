import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";
import { countPendingDeals } from "@/lib/ingestion/pendingDeals";

export interface SecIngestStatusPayload {
  ok: true;
  latest: Awaited<ReturnType<typeof getLatestIngestRun>>;
  pendingReviewCount: number;
  cronPath: string;
  cli: string;
  reviewQueuePath: string;
  pendingApiPath: string;
}

/** Postgres-backed SEC ingest snapshot for status APIs and pipeline UI. */
export async function buildSecIngestStatusPayload(): Promise<
  SecIngestStatusPayload
> {
  const [latest, pendingReviewCount] = await Promise.all([
    getLatestIngestRun(),
    countPendingDeals(),
  ]);

  return {
    ok: true,
    latest,
    pendingReviewCount,
    cronPath: "/api/cron/sec-ingest",
    cli: "npm run sec:ingest",
    reviewQueuePath: "/deals#data-pipelines",
    pendingApiPath: "/api/deals/pending",
  };
}
