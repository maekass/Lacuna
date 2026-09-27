import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  claimErrorStatus,
  compareClaim,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyAnalyze",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;
  if (!getReviewActor(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      analysis: compareClaim(id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json(
      { error: message },
      { status: claimErrorStatus(error) },
    );
  }
}
