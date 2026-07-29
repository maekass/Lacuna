import { NextResponse } from "next/server";
import { auditReviewRequest } from "@/lib/api/reviewAudit";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { getDataMode } from "@/lib/data/datasetProvider";
import {
  getPendingDealByDealId,
  updatePendingDeal,
} from "@/lib/ingestion/pendingDeals";
import { parseReviewerPromotionBody } from "@/lib/ingestion/parseReviewerPromotionBody";
import {
  canPromoteInRuntime,
  promoteApprovedDeal,
  resolvePromoteTarget,
} from "@/lib/ingestion/promoteApprovedDeals";

/** Promote one approved SEC candidate into verified dataset (JSON and/or Postgres). */
export async function POST(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
) {
  const denied = guardDealReviewRequest(request);
  if (denied) return denied;

  const { dealId } = await context.params;
  if (!dealId?.trim()) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const mode = getDataMode();
  if (!canPromoteInRuntime()) {
    return NextResponse.json(
      {
        error:
          "Vercel static mode cannot write dataset.verified.json — set LACUNA_DATA_MODE=db or use the promote-approved-deals GitHub Action.",
      },
      { status: 503 },
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseReviewerPromotionBody(body);
  const reviewerFields = parsed?.reviewerFields;
  const approveFirst = parsed?.approveFirst ?? true;

  const target = resolvePromoteTarget();

  try {
    let deal = await getPendingDealByDealId(dealId);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    if (
      approveFirst && deal.status !== "approved" && deal.status !== "merged"
    ) {
      const updated = await updatePendingDeal(dealId, { status: "approved" });
      if (updated) deal = updated;
    }

    if (deal.status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          error: "Deal must be approved before promotion",
        },
        { status: 409 },
      );
    }

    const result = await promoteApprovedDeal(dealId, {
      target,
      reviewerFields,
      secondarySourceUrl: reviewerFields?.secondarySourceUrl,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Promotion failed", result },
        { status: result.skipped ? 409 : 422 },
      );
    }

    await auditReviewRequest(request, {
      dealId,
      action: "promote",
      metadata: {
        acquisitionId: result.acquisitionId,
        target,
      },
    });

    return NextResponse.json({
      ok: true,
      probe: "pending-deal-promote",
      target,
      mode,
      result,
      verifiedDealUrl: result.acquisitionId
        ? `/deals/${result.acquisitionId}`
        : undefined,
      networkUrl: result.networkHighlightId
        ? `/deals?highlight=${
          encodeURIComponent(result.networkHighlightId)
        }#network`
        : undefined,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("deals/pending/[dealId]/promote:", error);
    const message = "Failed to promote deal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
