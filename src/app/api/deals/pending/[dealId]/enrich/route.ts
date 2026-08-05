import { NextResponse } from "next/server";
import { auditReviewRequest } from "@/lib/api/reviewAudit";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { enrichPendingDeal } from "@/lib/ingestion/enrichPendingDeal";
import { getPendingDealByDealId } from "@/lib/ingestion/pendingDeals";

const ENRICH_LIMIT = 5;
const ENRICH_WINDOW_MS = 60_000;

/** Bounded 8-K fetch + parse for one staging candidate (never auto-approves). */
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

  const ip = getClientIp(request);
  const bucket = await rateLimit({
    key: `pending-deal-enrich:${ip}`,
    limit: ENRICH_LIMIT,
    windowMs: ENRICH_WINDOW_MS,
  });

  if (!bucket.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Enrichment rate limit exceeded. Try again in a minute.",
        resetAtMs: bucket.resetAtMs,
      },
      { status: 429 },
    );
  }

  try {
    const deal = await getPendingDealByDealId(dealId);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const result = await enrichPendingDeal(deal);

    if (result.ok && !result.skipped && result.changes.length > 0) {
      await auditReviewRequest(request, {
        dealId,
        action: "enrich",
        metadata: {
          changeCount: result.changes.length,
          parseQuality: result.after.parseQuality,
        },
      });
    }

    return NextResponse.json({
      ok: result.ok,
      probe: "pending-deal-enrich",
      result,
      rateLimit: {
        remaining: bucket.remaining,
        resetAtMs: bucket.resetAtMs,
      },
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("deals/pending/[dealId]/enrich:", error);
    const message = "Failed to enrich pending deal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
