"use client";

import { useCallback, useEffect, useState } from "react";
import PromotionChecklist from "@/components/PromotionChecklist";
import type {
  PendingDealRecord,
  PendingDealStatus,
} from "@/lib/ingestion/pendingDeals";

interface PendingDealsResponse {
  ok: boolean;
  probe?: string;
  items?: PendingDealRecord[];
  meta?: {
    limit: number;
    offset: number;
    total: number;
    reviewableTotal: number;
  };
  error?: string;
}

function confidenceClass(confidence: string): string {
  if (confidence === "high") {
    return "bg-emerald-100 text-emerald-900 border-emerald-200";
  }
  if (confidence === "medium") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  return "bg-lacuna-lavender/30 text-lacuna-plum/80 border-lacuna-lavender/40";
}

function formatDealValue(millions: number | null): string {
  if (millions === null) return "Undisclosed";
  return `$${millions.toLocaleString()}M`;
}

function PendingDealCard({
  deal,
  busy,
  onReview,
  onPromote,
}: {
  deal: PendingDealRecord;
  busy: boolean;
  onReview: (dealId: string, status: PendingDealStatus) => void;
  onPromote: (dealId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [promoteReady, setPromoteReady] = useState(false);

  return (
    <article className="rounded-lg border border-lacuna-lavender/30 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-lacuna-plum">
              {deal.targetName ?? "Unknown target"}
            </h4>
            <span className="text-xs text-lacuna-blue/70">←</span>
            <span className="text-sm text-lacuna-blue">
              {deal.acquirerName ?? "Unknown acquirer"}
            </span>
          </div>
          <p className="mt-1 text-xs text-lacuna-blue/80">
            Announced {deal.announcedDate ?? "—"} ·{" "}
            {formatDealValue(deal.dealValueMillions)}
            {deal.dealValueNote ? ` (${deal.dealValueNote})` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceClass(deal.classificationConfidence)}`}
            >
              {deal.classificationConfidence} confidence
            </span>
            <span className="rounded-full border border-lacuna-lavender/40 bg-lacuna-lavender/15 px-2 py-0.5 text-[10px] font-medium text-lacuna-plum/80">
              {deal.status.replace("_", " ")}
            </span>
            {deal.womensHealthRelevant
              ? (
                <span className="rounded-full border border-lacuna-pink/50 bg-lacuna-pink/20 px-2 py-0.5 text-[10px] font-medium text-lacuna-plum">
                  WH relevant
                </span>
              )
              : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={deal.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-lacuna-lavender/50 px-2.5 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20"
          >
            SEC filing
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(deal.dealId, "approved")}
            className="rounded-md bg-lacuna-plum px-2.5 py-1.5 text-xs font-medium text-white hover:bg-lacuna-blue disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy || !promoteReady}
            onClick={() => onPromote(deal.dealId)}
            title={promoteReady ? undefined : "Complete promotion checklist first"}
            className="rounded-md border border-lacuna-plum/30 bg-lacuna-plum/10 px-2.5 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-plum/20 disabled:opacity-50"
          >
            Approve &amp; add to verified
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReview(deal.dealId, "rejected")}
            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      {deal.classificationKeywords.length > 0
        ? (
          <p className="mt-2 text-[11px] text-lacuna-blue/70">
            Keywords: {deal.classificationKeywords.join(", ")}
          </p>
        )
        : null}

      {deal.item201Excerpt
        ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-lacuna-plum underline underline-offset-2 hover:text-lacuna-blue"
            >
              {expanded ? "Hide" : "Show"} Item 2.01 excerpt
            </button>
            {expanded
              ? (
                <p className="mt-2 rounded-md bg-lacuna-lavender/15 p-3 text-xs leading-relaxed text-lacuna-blue">
                  {deal.item201Excerpt}
                </p>
              )
              : null}
          </div>
        )
        : null}

      <div className="mt-4">
        <PromotionChecklist
          key={deal.dealId}
          deal={deal}
          onReadyChange={setPromoteReady}
        />
      </div>
    </article>
  );
}

/** SEC candidate queue (`lacuna_deals`) — staging only, not verified JSON. */
export default function DealReviewQueue() {
  const [items, setItems] = useState<PendingDealRecord[]>([]);
  const [reviewableTotal, setReviewableTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDealId, setActionDealId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/deals/pending?limit=20");
        const body = await response.json() as PendingDealsResponse;
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setItems([]);
          setReviewableTotal(0);
          setError(
            body.error ??
              (response.status === 401
                ? "Review API requires Bearer auth in production — use local dev or curl."
                : "Pending queue unavailable (DATABASE_URL or ingest not configured)."),
          );
          return;
        }
        setItems(body.items ?? []);
        setReviewableTotal(body.meta?.reviewableTotal ?? 0);
      } catch {
        if (!cancelled) {
          setError("Failed to load pending deal queue.");
          setItems([]);
          setReviewableTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const handlePromote = useCallback(async (dealId: string) => {
    setActionDealId(dealId);
    try {
      const approveResponse = await fetch(
        `/api/deals/pending/${encodeURIComponent(dealId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );
      if (!approveResponse.ok) {
        const body = await approveResponse.json() as { error?: string };
        setError(body.error ?? "Approve failed.");
        return;
      }

      const promoteResponse = await fetch(
        `/api/deals/pending/${encodeURIComponent(dealId)}/promote`,
        { method: "POST" },
      );
      const body = await promoteResponse.json() as {
        ok?: boolean;
        error?: string;
        result?: { acquisitionId?: string };
      };
      if (!promoteResponse.ok || !body.ok) {
        setError(body.error ?? "Promotion failed.");
        return;
      }

      setItems((prev) => prev.filter((d) => d.dealId !== dealId));
      setReviewableTotal((n) => Math.max(0, n - 1));
      setError(null);
    } catch {
      setError("Promotion failed.");
    } finally {
      setActionDealId(null);
    }
  }, []);

  const handleReview = useCallback(async (
    dealId: string,
    status: PendingDealStatus,
  ) => {
    setActionDealId(dealId);
    try {
      const response = await fetch(`/api/deals/pending/${encodeURIComponent(dealId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Review action failed.");
        return;
      }
      setItems((prev) => prev.filter((d) => d.dealId !== dealId));
      setReviewableTotal((n) => Math.max(0, n - 1));
    } catch {
      setError("Review action failed.");
    } finally {
      setActionDealId(null);
    }
  }, []);

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            SEC candidate review queue
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-lacuna-blue">
            Staging rows from <code className="text-xs">lacuna_deals</code>{" "}
            — approve candidates, then promote into verified dataset (JSON locally
            or Postgres on Vercel db mode). Not live until promoted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshToken((n) => n + 1)}
          disabled={loading}
          className="shrink-0 rounded-md border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <p className="mt-3 text-xs text-lacuna-blue/80">
        {loading
          ? "Loading queue…"
          : `${reviewableTotal} candidate${reviewableTotal === 1 ? "" : "s"} awaiting review`}
      </p>

      {error
        ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {error}
          </p>
        )
        : null}

      {!loading && items.length === 0 && !error
        ? (
          <p className="mt-4 rounded-lg border border-dashed border-lacuna-lavender/40 bg-lacuna-lavender/10 px-4 py-6 text-center text-sm text-lacuna-blue/80">
            No pending candidates. Run{" "}
            <code className="text-xs">npm run sec:ingest</code> with Postgres,
            or wait for the weekly cron (Mondays 06:00 UTC).
          </p>
        )
        : null}

      {items.length > 0
        ? (
          <div className="mt-4 space-y-3">
            {items.map((deal) => (
              <PendingDealCard
                key={deal.dealId}
                deal={deal}
                busy={actionDealId === deal.dealId}
                onReview={handleReview}
                onPromote={handlePromote}
              />
            ))}
          </div>
        )
        : null}
    </div>
  );
}
