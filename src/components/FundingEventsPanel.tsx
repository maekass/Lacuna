"use client";

import { useCallback, useEffect, useState } from "react";
import type { FundingEventRecord } from "@/lib/ingestion/fundingEvents";

interface FundingResponse {
  ok: boolean;
  items?: FundingEventRecord[];
  meta?: { reviewableTotal: number };
  error?: string;
}

function formatUsd(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/** SEC Form D funding candidates — separate from M&A review queue. */
export default function FundingEventsPanel() {
  const [items, setItems] = useState<FundingEventRecord[]>([]);
  const [reviewableTotal, setReviewableTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/funding/pending?limit=15");
        const body = await response.json() as FundingResponse;
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setItems([]);
          setReviewableTotal(0);
          setError(
            body.error ??
              "Funding queue unavailable (run sec:ingest-form-d with DATABASE_URL).",
          );
          return;
        }
        setItems(body.items ?? []);
        setReviewableTotal(body.meta?.reviewableTotal ?? 0);
      } catch {
        if (!cancelled) {
          setError("Failed to load funding events.");
          setItems([]);
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

  const handleRefresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Form D funding candidates
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-lacuna-blue">
            SEC Form D private placements in{" "}
            <code className="text-xs">lacuna_funding_events</code> — funding
            rounds, not acquisitions. Enrichment context only until reviewed.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="shrink-0 rounded-md border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <p className="mt-3 text-xs text-lacuna-blue/80">
        {loading
          ? "Loading…"
          : `${reviewableTotal} pending funding event(s) · CLI: npm run sec:ingest-form-d`}
      </p>

      {error
        ? (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {error}
          </p>
        )
        : null}

      {!loading && items.length > 0
        ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead>
                <tr className="border-b border-lacuna-lavender/30 text-lacuna-blue/70">
                  <th className="py-2 pr-3 font-medium">Issuer</th>
                  <th className="py-2 pr-3 font-medium">Filed</th>
                  <th className="py-2 pr-3 font-medium">Offering</th>
                  <th className="py-2 pr-3 font-medium">Sold</th>
                  <th className="py-2 font-medium">Filing</th>
                </tr>
              </thead>
              <tbody>
                {items.map((event) => (
                  <tr
                    key={event.eventId}
                    className="border-b border-lacuna-lavender/15"
                  >
                    <td className="py-2 pr-3 font-medium text-lacuna-plum">
                      {event.issuerName}
                    </td>
                    <td className="py-2 pr-3 text-lacuna-blue">
                      {event.filingDate ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-lacuna-blue">
                      {formatUsd(event.totalOfferingAmount)}
                    </td>
                    <td className="py-2 pr-3 text-lacuna-blue">
                      {formatUsd(event.totalAmountSold)}
                    </td>
                    <td className="py-2">
                      <a
                        href={event.filingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
                      >
                        SEC
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        : !loading && !error
        ? (
          <p className="mt-4 text-sm text-lacuna-blue/70">
            No Form D candidates yet. Run{" "}
            <code className="text-xs">npm run sec:ingest-form-d</code> with
            DATABASE_URL configured.
          </p>
        )
        : null}
    </div>
  );
}
