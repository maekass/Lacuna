import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  claimErrorStatus,
  readClaim,
  updateOncologyClaim,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";
import { ClaimValidationError } from "@/lib/oncology/claimIntegrity/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyClaim",
    limit: 60,
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
      record: readClaim(id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json({ error: message }, {
      status: claimErrorStatus(error),
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyClaimWrite",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const actor = getReviewActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json();
    const record = updateOncologyClaim(actor, id, body);
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      record,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid claim";
    const status = error instanceof ClaimValidationError
      ? 400
      : claimErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
