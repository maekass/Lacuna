import process from "node:process";
import { NextResponse } from "next/server";
import {
  isDealReviewAuthConfigured,
  isDealReviewAuthorized,
} from "@/lib/infra/reviewAuth";

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

  if (!isDealReviewAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
