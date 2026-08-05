import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { getPendingDealByDealId } from "@/lib/ingestion/pendingDeals";
import { parseReviewerPromotionBody } from "@/lib/ingestion/parseReviewerPromotionBody";
import { buildPromotionPreview } from "@/lib/ingestion/promotionPreview";

/** Preview verified JSON diff before promoting a staging candidate. */
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

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseReviewerPromotionBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Body must include reviewerFields object" },
      { status: 400 },
    );
  }

  try {
    const deal = await getPendingDealByDealId(dealId);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const preview = await buildPromotionPreview({
      deal,
      reviewerFields: parsed.reviewerFields,
    });

    return NextResponse.json({
      ok: true,
      probe: "pending-deal-promote-preview",
      preview,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("deals/pending/[dealId]/promote/preview:", error);
    const message = "Failed to build promotion preview";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
