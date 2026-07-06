import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { getDataMode } from "@/lib/data/datasetProvider";
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

  const target = resolvePromoteTarget();

  try {
    const result = await promoteApprovedDeal(dealId, { target });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Promotion failed", result },
        { status: result.skipped ? 409 : 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      probe: "pending-deal-promote",
      target,
      result,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to promote deal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
