import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import { getReviewActor } from "@/lib/infra/reviewAuth";
import {
  claimErrorStatus,
  createOncologyClaim,
  searchClaims,
} from "@/lib/oncology/claimIntegrity/service";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";
import { ClaimValidationError } from "@/lib/oncology/claimIntegrity/validation";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyClaims",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const actor = getReviewActor(request);
  if (!actor) return unauthorized();
  const url = new URL(request.url);
  const claims = searchClaims({
    q: url.searchParams.get("q") ?? undefined,
    reviewStatus: url.searchParams.get("reviewStatus") ?? undefined,
    classification: url.searchParams.get("classification") ?? undefined,
    sourceType: url.searchParams.get("sourceType") ?? undefined,
    claimDateFrom: url.searchParams.get("claimDateFrom") ?? undefined,
    claimDateTo: url.searchParams.get("claimDateTo") ?? undefined,
    evidenceCutoffFrom: url.searchParams.get("evidenceCutoffFrom") ?? undefined,
    evidenceCutoffTo: url.searchParams.get("evidenceCutoffTo") ?? undefined,
  });
  return NextResponse.json({
    disclosure: CLAIM_INTEGRITY_DISCLOSURE,
    claims,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    key: "oncologyClaimsWrite",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;
  const actor = getReviewActor(request);
  if (!actor) return unauthorized();
  try {
    const body = await request.json();
    const record = createOncologyClaim(actor, body);
    return NextResponse.json({
      disclosure: CLAIM_INTEGRITY_DISCLOSURE,
      record,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid claim";
    const status = error instanceof ClaimValidationError
      ? 400
      : claimErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
