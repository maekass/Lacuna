import { NextResponse } from "next/server";
import { tryLogReviewAction } from "@/lib/ingestion/reviewAuditLog";
import {
  apiKeySessionSubject,
  clearReviewSessionCookies,
  getReviewActor,
  isGitHubReviewSignInAvailable,
  isReviewTokenAuthorized,
  isWriteCapableReviewActor,
  setReviewSessionCookie,
} from "@/lib/infra/reviewAuth";

interface SessionBody {
  token?: string;
}

function sessionPayload(request: Request) {
  const actor = getReviewActor(request);
  const authenticated = isWriteCapableReviewActor(actor);
  return {
    ok: true,
    authenticated,
    readOnly: Boolean(actor) && !authenticated,
    actor: actor ?? undefined,
    githubSignInAvailable: isGitHubReviewSignInAvailable(),
  };
}

/**
 * Review session probe. Always 200 so the gate can render GitHub sign-in
 * when the caller is signed out.
 */
export function GET(request: Request) {
  return NextResponse.json(sessionPayload(request), {
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
    authenticated: true,
    readOnly: false,
    actor: {
      id: subject,
      method: "api_key",
      label: "API key reviewer",
    },
    githubSignInAvailable: isGitHubReviewSignInAvailable(),
  });
  setReviewSessionCookie(response, { sub: "review", method: "api_key" });

  await tryLogReviewAction({
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

  if (isWriteCapableReviewActor(actor) && actor) {
    await tryLogReviewAction({
      action: "session_end",
      actorId: actor.id,
      actorMethod: actor.method,
    });
  }

  return response;
}
