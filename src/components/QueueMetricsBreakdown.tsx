"use client";

import type { PendingQueueMetrics } from "@/lib/ingestion/pendingQueueMetrics";
import { formatQueueMedianAgeLabel } from "@/lib/ingestion/queueAge";

interface QueueMetricsBreakdownProps {
  metrics: PendingQueueMetrics | null;
  unavailable: boolean;
  className?: string;
}

/** Presentational queue breakdown — no fetch; parent supplies metrics. */
export default function QueueMetricsBreakdown({
  metrics,
  unavailable,
  className = "",
}: QueueMetricsBreakdownProps) {
  if (unavailable) {
    return (
      <p className={`text-xs text-lacuna-blue/70 ${className}`}>
        Queue metrics unavailable — configure Postgres to see approve/reject
        counts.
      </p>
    );
  }

  if (!metrics) return null;

  const medianLabel = formatQueueMedianAgeLabel(metrics.medianAgeHours);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-lacuna-blue ${className}`}
    >
      <span>
        <span className="font-medium text-lacuna-plum">Pending</span>{" "}
        {metrics.pending}
      </span>
      <span>
        <span className="font-medium text-lacuna-plum">Approved</span>{" "}
        {metrics.approved}
      </span>
      <span>
        <span className="font-medium text-lacuna-plum">Rejected</span>{" "}
        {metrics.rejected}
      </span>
      <span>
        <span className="font-medium text-lacuna-plum">Promoted</span>{" "}
        {metrics.merged}
      </span>
      {medianLabel
        ? <span className="text-lacuna-blue/80">{medianLabel}</span>
        : null}
    </div>
  );
}
