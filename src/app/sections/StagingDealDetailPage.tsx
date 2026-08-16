"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EvidenceLadder from "@/components/EvidenceLadder";
import EnrichmentDiffPanel from "@/components/EnrichmentDiffPanel";
import PromotionChecklist from "@/components/PromotionChecklist";
import PromotionForm from "@/components/PromotionForm";
import PromotionPreviewDiffPanel from "@/components/PromotionPreviewDiff";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import MotionSection from "@/components/ui/MotionSection";
import type { ReviewerPromotionFields } from "@/lib/ingestion/buildPromotionDraft";
import {
  labelPromotionMissingField,
  PROMOTION_MISSING_FIELD_LABELS,
} from "@/lib/ingestion/promotionFieldLabels";
import type { PromotionPreviewResult } from "@/lib/ingestion/promotionPreview";
import type { EnrichPendingDealResult } from "@/lib/ingestion/enrichPendingDeal";
import { buildStagingEvidenceLadder } from "@/lib/ingestion/stagingEvidenceLadder";
import { resolvePromoteLandingUrls } from "@/lib/ingestion/resolvePromoteLandingUrls";
import type {
  PendingDealRecord,
  PendingDealStatus,
} from "@/lib/ingestion/pendingDeals";

interface StagingDealDetailPageProps {
  dealId: string;
}

function extractSecondaryUrl(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] ?? "";
}

function initialReviewerFields(
  deal: PendingDealRecord,
): ReviewerPromotionFields {
  return {
    secondarySourceUrl: extractSecondaryUrl(deal.reviewNotes),
    companySector: null,
    companyHq: null,
    companyFounded: null,
    companyDescription: null,
    companyStage: null,
    acquirerSector: null,
    acquirerHq: null,
    strategicRationale: null,
  };
}

function formatDealValue(millions: number | null): string {
  if (millions === null) return "Undisclosed";
  return `$${millions.toLocaleString()}M`;
}

export default function StagingDealDetailPage(
  { dealId }: StagingDealDetailPageProps,
) {
  const [deal, setDeal] = useState<PendingDealRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewerFields, setReviewerFields] = useState<ReviewerPromotionFields>(
    {},
  );
  const [preview, setPreview] = useState<PromotionPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checklistReady, setChecklistReady] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<
    ReturnType<typeof resolvePromoteLandingUrls>
  >(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<
    EnrichPendingDealResult | null
  >(
    null,
  );
  const [authRetry, setAuthRetry] = useState(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPreview = useCallback(
    async (fields: ReviewerPromotionFields) => {
      setPreviewLoading(true);
      try {
        const response = await fetch(
          `/api/deals/pending/${encodeURIComponent(dealId)}/promote/preview`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reviewerFields: fields }),
          },
        );
        const body = await response.json() as {
          ok?: boolean;
          preview?: PromotionPreviewResult;
          error?: string;
        };
        if (response.ok && body.preview) {
          setPreview(body.preview);
        } else {
          setPreview(null);
        }
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [dealId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDeal() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/deals/pending/${encodeURIComponent(dealId)}`,
        );
        const body = await response.json() as {
          ok?: boolean;
          item?: PendingDealRecord;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.item) {
          setDeal(null);
          setNeedsAuth(response.status === 401);
          setError(response.status === 401 ? null : body.error ?? "Not found");
          return;
        }
        setNeedsAuth(false);
        setDeal(body.item);
        const fields = initialReviewerFields(body.item);
        setReviewerFields(fields);
        void refreshPreview(fields);
      } catch {
        if (!cancelled) setError("Failed to load staging dossier.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDeal();
    return () => {
      cancelled = true;
    };
  }, [dealId, authRetry, refreshPreview]);

  const handleReviewerFieldsChange = useCallback(
    (fields: ReviewerPromotionFields) => {
      setReviewerFields(fields);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        void refreshPreview(fields);
      }, 400);
    },
    [refreshPreview],
  );

  const ladder = useMemo(
    () => (deal ? buildStagingEvidenceLadder(deal) : null),
    [deal],
  );

  const handleReview = async (status: PendingDealStatus) => {
    if (!deal) return;
    setError(null);
    try {
      const response = await fetch(
        `/api/deals/pending/${encodeURIComponent(dealId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const body = await response.json() as {
        ok?: boolean;
        item?: PendingDealRecord;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Review action failed.");
        return;
      }
      if (body.item) setDeal(body.item);
    } catch {
      setError("Review action failed.");
    }
  };

  const handleEnrich = async () => {
    if (!deal) return;
    setEnriching(true);
    setError(null);
    setEnrichResult(null);
    try {
      const response = await fetch(
        `/api/deals/pending/${encodeURIComponent(dealId)}/enrich`,
        { method: "POST" },
      );
      const body = await response.json() as {
        ok?: boolean;
        result?: EnrichPendingDealResult;
        error?: string;
      };
      if (!response.ok || !body.result) {
        setError(body.error ?? "Enrichment failed.");
        return;
      }
      setEnrichResult(body.result);
      setDeal(body.result.after);
      void refreshPreview(reviewerFields);
    } catch {
      setError("Enrichment failed.");
    } finally {
      setEnriching(false);
    }
  };

  const handlePromote = async () => {
    if (!deal || !preview?.ready) return;
    setPromoting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/deals/pending/${encodeURIComponent(dealId)}/promote`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewerFields, approveFirst: true }),
        },
      );
      const body = await response.json() as
        & Parameters<
          typeof resolvePromoteLandingUrls
        >[0]
        & { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Promotion failed.");
        return;
      }
      const landing = resolvePromoteLandingUrls(body);
      if (!landing) {
        setError("Promotion succeeded but verified deal URL is missing.");
        return;
      }
      setPromoteSuccess(landing);
    } catch {
      setError("Promotion failed.");
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-lacuna-blue/80">Loading staging dossier…</p>
    );
  }

  if (needsAuth) {
    return <ReviewAccessGate onUnlocked={() => setAuthRetry((n) => n + 1)} />;
  }

  if (!deal) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {error ?? "Staging candidate not found."}
        <Link
          href="/deals#review"
          className="mt-3 block font-medium underline"
        >
          Back to review queue
        </Link>
      </div>
    );
  }

  if (promoteSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-emerald-900">
          Promoted to verified dataset
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          This candidate is now in the verified universe.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link
            href={promoteSuccess.verifiedDealUrl}
            className="rounded-md bg-lacuna-plum px-4 py-2 text-center text-sm font-medium text-white"
          >
            View verified deal
          </Link>
          {promoteSuccess.networkUrl
            ? (
              <Link
                href={promoteSuccess.networkUrl}
                className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-center text-sm font-medium text-emerald-900"
              >
                View in network graph
              </Link>
            )
            : null}
          <Link
            href="/deals#review"
            className="rounded-md border border-lacuna-lavender/50 px-4 py-2 text-center text-sm font-medium text-lacuna-plum"
          >
            Back to queue
          </Link>
        </div>
      </div>
    );
  }

  const canPromote = checklistReady && preview?.ready === true &&
    !previewLoading;
  const canEnrich = deal.parseQuality === "keyword_only" ||
    deal.parseQuality === "partial";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
          Candidate · not verified
        </p>
        <p className="mt-1 text-sm text-amber-900/90">
          Staging row from{" "}
          <code className="text-xs">lacuna_deals</code>. Not in hub counts or
          analytics until promoted with attested fields.
        </p>
        <p className="mt-2 text-xs text-amber-900/80">
          <a
            href="https://github.com/maekass/Lacuna/blob/main/docs/REVIEWER_PROMOTION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Reviewer promotion steps (E2)
          </a>
        </p>
      </div>

      <MotionSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-lacuna-plum">
              {deal.targetName ?? "Unknown target"}
              <span className="mx-2 text-lacuna-blue/60">←</span>
              {deal.acquirerName ?? "Unknown acquirer"}
            </h1>
            <p className="mt-2 text-sm text-lacuna-blue">
              Announced {deal.announcedDate ?? "—"} ·{" "}
              {formatDealValue(deal.dealValueMillions)} ·{" "}
              {deal.parseQuality.replace("_", " ")} parse
            </p>
          </div>
          <Link
            href="/deals#review"
            className="text-sm font-medium text-lacuna-plum underline underline-offset-2"
          >
            ← Review queue
          </Link>
        </div>
      </MotionSection>

      {error
        ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )
        : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-lacuna-plum">Evidence</h2>
          {ladder ? <EvidenceLadder ladder={ladder} /> : null}
          {preview?.missingFields.length
            ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase text-amber-900">
                  Promotion blockers
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
                  {preview.missingFields.map((field) => (
                    <li key={field}>{labelPromotionMissingField(field)}</li>
                  ))}
                </ul>
              </div>
            )
            : null}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-lacuna-plum">Review</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleReview("approved")}
              className="rounded-md bg-lacuna-plum px-3 py-1.5 text-xs font-medium text-white"
            >
              Approve candidate
            </button>
            <button
              type="button"
              onClick={() => void handleReview("rejected")}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800"
            >
              Reject
            </button>
            <span className="rounded-full border border-lacuna-lavender/40 px-2 py-1 text-[10px] font-medium text-lacuna-plum/80">
              {deal.status.replace("_", " ")}
            </span>
          </div>
          <PromotionChecklist deal={deal} onReadyChange={setChecklistReady} />
        </div>
      </section>

      {canEnrich
        ? (
          <section id="enrich" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-lacuna-plum">
                  Pre-review enrichment
                </h2>
                <p className="mt-1 text-sm text-lacuna-blue/80">
                  Fetch the 8-K from SEC EDGAR and propose structured fields.
                  Human attestation still required to promote.
                </p>
              </div>
              <button
                type="button"
                disabled={enriching}
                onClick={() => void handleEnrich()}
                className="rounded-md border border-lacuna-plum bg-white px-4 py-2 text-sm font-medium text-lacuna-plum disabled:opacity-50"
              >
                {enriching ? "Enriching…" : "Enrich from 8-K"}
              </button>
            </div>
            <EnrichmentDiffPanel
              changes={enrichResult?.changes ?? []}
              duplicates={enrichResult?.duplicates ?? []}
              skipped={enrichResult?.skipped}
              skipReason={enrichResult?.skipReason}
              loading={enriching}
            />
          </section>
        )
        : null}

      <section id="promote" className="space-y-4 scroll-mt-24">
        <h2 className="text-lg font-semibold text-lacuna-plum">
          Promote to verified
        </h2>
        <PromotionForm
          needsNewCompany={preview?.needsNewCompany ?? true}
          needsNewAcquirer={preview?.needsNewAcquirer ?? true}
          hasFilingExcerpt={Boolean(deal.item201Excerpt?.trim())}
          value={reviewerFields}
          onChange={handleReviewerFieldsChange}
        />
        <PromotionPreviewDiffPanel
          diff={preview?.diff ?? null}
          missingFields={preview?.missingFields ?? []}
          validationErrors={preview?.validationErrors ?? []}
          ready={preview?.ready === true}
          fieldLabels={PROMOTION_MISSING_FIELD_LABELS}
        />
        <button
          type="button"
          disabled={!canPromote || promoting}
          onClick={() => void handlePromote()}
          className="rounded-md bg-lacuna-plum px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {promoting ? "Promoting…" : "Approve & add to verified"}
        </button>
      </section>
    </div>
  );
}
