import { NextResponse } from "next/server";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { parsePageParams } from "@/lib/api/pageParams";
import {
  listPendingDeals,
  type PendingDealStatus,
} from "@/lib/ingestion/pendingDeals";

const VALID_STATUSES = new Set<PendingDealStatus>([
  "pending",
  "pending_review",
  "approved",
  "rejected",
  "merged",
]);

/**
 * Paginated SEC candidate queue (`lacuna_deals`). Staging only — not verified JSON.
 * Production requires `Authorization: Bearer <CRON_SECRET|LACUNA_REVIEW_API_KEY>`.
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
  const status =
    statusParam && VALID_STATUSES.has(statusParam as PendingDealStatus)
      ? (statusParam as PendingDealStatus)
      : undefined;
  const womensHealthOnly = url.searchParams.get("womensHealth") === "true";

  try {
    const page = await listPendingDeals({
      limit,
      offset,
      status,
      womensHealthOnly,
    });

    return NextResponse.json({
      ok: true,
      probe: "pending-deals",
      items: page.items,
      meta: page.meta,
    }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to list pending deals";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
