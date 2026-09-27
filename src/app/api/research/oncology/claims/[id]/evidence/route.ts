import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  attachClaimEvidence,
  claimErrorStatus,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";
import { ClaimValidationError } from "@/lib/oncology/claimIntegrity/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyEvidence",
    limit: 40,
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
    const record = attachClaimEvidence(actor, id, body);
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      record,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid evidence";
    const status = error instanceof ClaimValidationError
      ? 400
      : claimErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
