import { NextResponse } from "next/server";
import { logReviewAction } from "@/lib/ingestion/reviewAuditLog";
import {
  apiKeySessionSubject,
  clearReviewSessionCookies,
  getReviewActor,
  isGitHubReviewSignInAvailable,
  isReviewTokenAuthorized,
  setReviewSessionCookie,
} from "@/lib/infra/reviewAuth";

interface SessionBody {
  token?: string;
}

/**
 * Review session: GET current actor, POST API-key sign-in (signed cookie),
 * DELETE sign-out.
 */
export function GET(request: Request) {
  const actor = getReviewActor(request);
  if (!actor) {
    return NextResponse.json({ ok: false, authenticated: false }, {
      status: 401,
      headers: { "cache-control": "no-store" },
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    actor,
    githubSignInAvailable: isGitHubReviewSignInAvailable(),
  }, {
    headers: { "cache-control": "no-store" },
  });
}

/** Set signed httpOnly session after validating API key (automation fallback). */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  let body: SessionBody;
  try {
    body = await request.json() as SessionBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  if (!token || !isReviewTokenAuthorized(token)) {
    return NextResponse.json(
      { ok: false, error: "Invalid review API key" },
      { status: 401 },
    );
  }

  const subject = apiKeySessionSubject(token);
  if (!subject) {
    return NextResponse.json(
      { ok: false, error: "Invalid review API key" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    probe: "review-session",
    actor: {
      id: subject,
      method: "api_key",
      label: "API key reviewer",
    },
    githubSignInAvailable: isGitHubReviewSignInAvailable(),
  });
  setReviewSessionCookie(response, { sub: "review", method: "api_key" });

  await logReviewAction({
    action: "session_start",
    actorId: subject,
    actorMethod: "api_key",
    metadata: { provider: "api_key" },
  });

  return response;
}

/** Clear review session cookies. */
export async function DELETE(request: Request) {
  const actor = getReviewActor(request);
  const response = NextResponse.json({ ok: true });
  clearReviewSessionCookies(response);

  if (actor) {
    await logReviewAction({
      action: "session_end",
      actorId: actor.id,
      actorMethod: actor.method,
    });
  }

  return response;
}
