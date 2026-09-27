import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  claimErrorStatus,
  detachClaimEvidence,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";

interface RouteContext {
  params: Promise<{ id: string; evidenceId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyEvidenceDelete",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const actor = getReviewActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id, evidenceId } = await context.params;
    const record = detachClaimEvidence(actor, id, evidenceId);
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      record,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    return NextResponse.json(
      { error: message },
      { status: claimErrorStatus(error) },
    );
  }
}
