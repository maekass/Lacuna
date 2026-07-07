import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { parsePageParams } from "@/lib/api/pageParams";
import {
  type FundingEventStatus,
  listFundingEvents,
} from "@/lib/ingestion/fundingEvents";

const VALID_STATUSES = new Set<FundingEventStatus>([
  "pending",
  "pending_review",
  "approved",
  "rejected",
]);

/**
 * Paginated SEC Form D funding candidates (`lacuna_funding_events`).
 * Funding rounds — not M&A. Separate from deal review queue.
 */
export async function GET(request: Request) {
  const denied = guardDealReviewRequest(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const { limit, offset } = parsePageParams(url.searchParams, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const statusParam = url.searchParams.get("status");
  const status = statusParam &&
      VALID_STATUSES.has(statusParam as FundingEventStatus)
    ? (statusParam as FundingEventStatus)
    : undefined;
  const womensHealthOnly = url.searchParams.get("womensHealth") === "true";

  try {
    const page = await listFundingEvents({
      limit,
      offset,
      status,
      womensHealthOnly,
    });

    return NextResponse.json({
      ok: true,
      probe: "funding-pending",
      items: page.items,
      meta: page.meta,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to list funding events";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
