import { getLatestIngestRun } from "@/lib/ingestion/ingestRunState";
import {
  countPendingDeals,
  getOldestPendingDeal,
} from "@/lib/ingestion/pendingDeals";

export interface SecIngestStatusPayload {
  ok: true;
  latest: Awaited<ReturnType<typeof getLatestIngestRun>>;
  pendingReviewCount: number;
  oldestPendingIngestedAt: string | null;
  cronPath: string;
  cli: string;
  reviewQueuePath: string;
  pendingApiPath: string;
}

/** Postgres-backed SEC ingest snapshot for status APIs and pipeline UI. */
export async function buildSecIngestStatusPayload(): Promise<
  SecIngestStatusPayload
> {
  const [latest, pendingReviewCount, oldestPending] = await Promise.all([
    getLatestIngestRun(),
    countPendingDeals(),
    getOldestPendingDeal(),
  ]);

  return {
    ok: true,
    latest,
    pendingReviewCount,
    oldestPendingIngestedAt: oldestPending?.ingestedAt ?? null,
    cronPath: "/api/cron/sec-ingest",
    cli: "npm run sec:ingest",
    reviewQueuePath: "/deals#review",
    pendingApiPath: "/api/deals/pending",
  };
}
