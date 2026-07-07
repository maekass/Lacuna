"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { SecIngestStatusPayload } from "@/lib/ingestion/buildSecIngestStatus";

interface HealthPayload {
  buildSha: string | null;
  dataMode: string;
}

function shortSha(sha: string | null): string {
  if (!sha) return "local";
  return sha.slice(0, 7);
}

/** Live pipeline freshness — dataset date, deploy SHA, SEC ingest, pending queue. */
export default function PipelineStatusStrip() {
  const { dataProvenance } = useVerifiedDataset();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [sec, setSec] = useState<SecIngestStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = sec?.pendingReviewCount;
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
              href="/deals#data-pipelines"
              className="font-medium text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
            >
              {pendingCount} pending review
            </Link>
          )
          : null}
      </div>
    </div>
  );
}
