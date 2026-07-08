import { query } from "@/lib/data/dbClient";
import { REVIEWABLE_QUEUE_STATUSES } from "@/lib/ingestion/pendingDeals";

export interface PendingQueueMetrics {
  ok: true;
  pending: number;
  approved: number;
  rejected: number;
  merged: number;
  /** Tier 2 rows not yet in verified JSON (pending + approved). */
  stagingCandidateCount: number;
  medianAgeHours: number | null;
  oldestPendingIngestedAt: string | null;
}

interface AggregateRow {
  pending: string;
  approved: string;
  rejected: string;
  merged: string;
  median_age_hours: string | null;
  oldest_pending_ingested_at: Date | string | null;
}

function toIsoDateTime(value: Date | string | null): string | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function parseMedianHours(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 10) / 10;
}

/**
 * Single-pass aggregate over lacuna_deals for hub footnotes and review console.
 * Median age is computed on the reviewable queue only (pending + pending_review).
 */
export async function buildPendingQueueMetrics(): Promise<PendingQueueMetrics> {
  const reviewable = [...REVIEWABLE_QUEUE_STATUSES];
  const rows = await query<AggregateRow>(
    `SELECT
       COUNT(*) FILTER (
         WHERE status = ANY($1::text[])
       )::text AS pending,
       COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
       COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected,
       COUNT(*) FILTER (WHERE status = 'merged')::text AS merged,
       (
         SELECT percentile_cont(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (NOW() - ingested_at)) / 3600.0
         )::text
         FROM lacuna_deals
         WHERE status = ANY($1::text[])
       ) AS median_age_hours,
       MIN(ingested_at) FILTER (
         WHERE status = ANY($1::text[])
       ) AS oldest_pending_ingested_at
     FROM lacuna_deals`,
    [reviewable],
  );

  const row = rows[0];
  const pending = Number(row?.pending ?? 0);
  const approved = Number(row?.approved ?? 0);
  const rejected = Number(row?.rejected ?? 0);
  const merged = Number(row?.merged ?? 0);

  return {
    ok: true,
    pending,
    approved,
    rejected,
    merged,
    stagingCandidateCount: pending + approved,
    medianAgeHours: parseMedianHours(row?.median_age_hours ?? null),
    oldestPendingIngestedAt: toIsoDateTime(
      row?.oldest_pending_ingested_at ?? null,
    ),
  };
}
