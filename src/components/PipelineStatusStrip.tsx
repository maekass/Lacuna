"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QueueMetricsBreakdown from "@/components/QueueMetricsBreakdown";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { SecIngestStatusPayload } from "@/lib/ingestion/buildSecIngestStatus";
import { formatQueueSlaLabel } from "@/lib/ingestion/queueAge";

interface HealthPayload {
  buildSha: string | null;
  dataMode: string;
}

function shortSha(sha: string | null): string {
  if (!sha) return "local";
  return sha.slice(0, 7);
}

/** Live pipeline freshness — dataset date, deploy SHA, SEC ingest, pending queue. */
export default function PipelineStatusStrip({
  queueDetail = false,
  refreshToken = 0,
}: {
  queueDetail?: boolean;
  refreshToken?: number;
}) {
  const { dataProvenance } = useVerifiedDataset();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [sec, setSec] = useState<SecIngestStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [healthRes, secRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/ingest/sec/status"),
        ]);
        if (cancelled) return;
        if (healthRes.ok) {
          setHealth(await healthRes.json() as HealthPayload);
        }
        if (secRes.ok) {
          setSec(await secRes.json() as SecIngestStatusPayload);
        } else {
          setSec(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = sec?.pendingReviewCount;
  const oldestLabel = formatQueueSlaLabel(
    sec?.oldestPendingIngestedAt ?? null,
    nowMs,
  );
  const secRunAt = sec?.latest?.ended_at ?? sec?.latest?.started_at;

  return (
    <div className="rounded-lg border border-lacuna-lavender/35 bg-lacuna-lavender/10 px-4 py-3 text-xs text-lacuna-blue">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          <span className="font-medium text-lacuna-plum">Dataset</span>{" "}
          {dataProvenance.lastUpdated}
          {dataProvenance.datasetVersion
            ? ` · ${dataProvenance.datasetVersion}`
            : ""}
        </span>
        <span>
          <span className="font-medium text-lacuna-plum">Build</span>{" "}
          {loading ? "…" : shortSha(health?.buildSha ?? null)}
          {health?.dataMode ? ` · ${health.dataMode}` : ""}
        </span>
        {secRunAt
          ? (
            <span>
              <span className="font-medium text-lacuna-plum">SEC ingest</span>
              {" "}
              {sec?.latest?.status ?? "—"} · {secRunAt}
            </span>
          )
          : (
            <span className="text-lacuna-blue/70">
              SEC ingest — configure Postgres to enable
            </span>
          )}
        {pendingCount !== undefined
          ? (
            <Link
              href="/deals#review"
              className="font-medium text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
            >
              {pendingCount}{" "}
              pending review{oldestLabel ? ` · oldest ${oldestLabel}` : ""}
            </Link>
          )
          : null}
      </div>
      {queueDetail
        ? (
          <QueueMetricsBreakdown
            metrics={sec?.queue ?? null}
            unavailable={!sec?.queue}
            className="mt-2 border-t border-lacuna-lavender/25 pt-2"
          />
        )
        : null}
    </div>
  );
}
