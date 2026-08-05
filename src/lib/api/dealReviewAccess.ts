import process from "node:process";
import { NextResponse } from "next/server";
import {
  getReviewActor,
  isDealReviewAuthConfigured,
  isPublicReviewUiEnabled,
  PUBLIC_REVIEW_ACTOR_ID,
} from "@/lib/infra/reviewAuth";

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Shared guards for `/api/deals/pending` review routes. */
export function guardDealReviewRequest(
  request: Request,
): NextResponse | null {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL is not configured",
        docs: "/docs/SEC_INGESTION.md",
      },
      { status: 503 },
    );
  }

  const isProduction = process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (isProduction && !isDealReviewAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Configure GitHub OAuth or LACUNA_REVIEW_API_KEY for review APIs",
      },
      { status: 503 },
    );
  }

  const actor = getReviewActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Demo mode signs nobody in — keep it read-only so anonymous callers cannot
  // approve, import, or promote staging candidates.
  if (
    isPublicReviewUiEnabled() && actor.id === PUBLIC_REVIEW_ACTOR_ID &&
    !READ_ONLY_METHODS.has(request.method.toUpperCase())
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Review console is in public demo mode — sign in to modify the queue",
      },
      { status: 403 },
    );
  }

  return null;
}
