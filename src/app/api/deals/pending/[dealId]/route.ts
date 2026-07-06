import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import {
  updatePendingDeal,
  type PendingDealStatus,
} from "@/lib/ingestion/pendingDeals";

const VALID_STATUSES = new Set<PendingDealStatus>([
  "pending",
  "pending_review",
  "approved",
  "rejected",
]);

interface PatchBody {
  status?: PendingDealStatus;
  reviewNotes?: string | null;
}

function parsePatchBody(body: unknown): PatchBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const patch: PatchBody = {};

  if (record.status !== undefined) {
    if (typeof record.status !== "string" ||
      !VALID_STATUSES.has(record.status as PendingDealStatus)) {
      return null;
    }
    patch.status = record.status as PendingDealStatus;
  }

  if (record.reviewNotes !== undefined) {
    if (record.reviewNotes !== null && typeof record.reviewNotes !== "string") {
      return null;
    }
    patch.reviewNotes = record.reviewNotes as string | null;
  }

  if (!patch.status && patch.reviewNotes === undefined) return null;
  return patch;
}

/** Update review status / notes for one SEC candidate (`deal_id`). */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ dealId: string }> },
) {
  const denied = guardDealReviewRequest(request);
  if (denied) return denied;

  const { dealId } = await context.params;
  if (!dealId?.trim()) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = parsePatchBody(body);
  if (!patch) {
    return NextResponse.json(
      { error: "Body must include valid status and/or reviewNotes" },
      { status: 400 },
    );
  }

  try {
    const updated = await updatePendingDeal(dealId, patch);
    if (!updated) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      probe: "pending-deal-update",
      item: updated,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to update pending deal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
