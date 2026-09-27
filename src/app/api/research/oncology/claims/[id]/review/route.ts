import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  approveClaim,
  archiveClaim,
  claimErrorStatus,
  requestClaimChanges,
  submitClaim,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";
import { ClaimValidationError } from "@/lib/oncology/claimIntegrity/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyReview",
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
    const action = String(body.action ?? "");
    const record = action === "submit"
      ? submitClaim(actor, id)
      : action === "request_changes"
      ? requestClaimChanges(actor, id, String(body.rationale ?? ""))
      : action === "approve"
      ? approveClaim(actor, id, {
        classification: String(body.classification ?? ""),
        rationale: String(body.rationale ?? ""),
        confidence: body.confidence ? String(body.confidence) : undefined,
      })
      : action === "archive"
      ? archiveClaim(actor, id, String(body.rationale ?? ""))
      : null;
    if (!record) {
      return NextResponse.json(
        { error: "Unsupported review action." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      record,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    const status = error instanceof ClaimValidationError
      ? 400
      : claimErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
