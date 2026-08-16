import process from "node:process";
import { NextResponse } from "next/server";
import { isGitHubReviewOAuthConfigured } from "@/lib/infra/reviewGitHubOAuth";
import { secureEquals } from "@/lib/infra/secureCompare";
import {
  actorFromSession,
  LEGACY_REVIEW_TOKEN_COOKIE,
  parseSessionFromCookie,
  REVIEW_SESSION_COOKIE,
  type ReviewActor,
  signReviewSession,
  verifyReviewSession,
} from "@/lib/infra/reviewSession";

/** @deprecated Use REVIEW_SESSION_COOKIE — kept for one release of migration. */
export const REVIEW_SESSION_COOKIE_LEGACY = LEGACY_REVIEW_TOKEN_COOKIE;

/** Demo-only actor id used when the review console runs without sign-in. */
export const PUBLIC_REVIEW_ACTOR_ID = "public:review";

export function isPublicReviewUiEnabled(): boolean {
  return process.env.LACUNA_REVIEW_UI_PUBLIC === "true";
}

function reviewSecrets(): string[] {
  const reviewKey = process.env.LACUNA_REVIEW_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  return [reviewKey, cronSecret].filter((s): s is string => Boolean(s));
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
}

/** Whether a bearer token matches configured review API secrets (CLI / automation). */
export function isReviewTokenAuthorized(
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  return reviewSecrets().some((secret) => secureEquals(secret, token));
}

/** Parse legacy review session cookie (raw API key). */
export function parseReviewTokenFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${LEGACY_REVIEW_TOKEN_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** True when the actor may approve, reject, import, or promote. */
export function isWriteCapableReviewActor(
  actor: ReviewActor | null | undefined,
): boolean {
  return Boolean(actor) && actor?.id !== PUBLIC_REVIEW_ACTOR_ID;
}

function publicReviewActor(): ReviewActor {
  return {
    id: PUBLIC_REVIEW_ACTOR_ID,
    method: "dev",
    label: "Public review UI",
  };
}

/** Resolve reviewer identity from request (signed session, legacy cookie, or bearer). */
export function getReviewActor(request: Request): ReviewActor | null {
  if (!isProductionEnv()) {
    return { id: "dev:local", method: "dev", label: "Local dev" };
  }

  const session = parseSessionFromCookie(request.headers.get("cookie"));
  if (session) {
    return actorFromSession(session);
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : null;

  if (isReviewTokenAuthorized(bearer)) {
    return {
      id: "api_key:review",
      method: "api_key",
      label: "API key (Bearer)",
    };
  }

  const legacyCookie = parseReviewTokenFromCookie(
    request.headers.get("cookie"),
  );
  if (isReviewTokenAuthorized(legacyCookie)) {
    return {
      id: "api_key:review",
      method: "api_key",
      label: "API key (session)",
    };
  }

  // Demo browsing only — never override a signed-in reviewer.
  if (isPublicReviewUiEnabled()) {
    return publicReviewActor();
  }

  return null;
}

/**
 * Authorize access to deal review APIs (`/api/deals/pending`, PATCH, import).
 * Accepts signed session cookie, legacy API-key cookie, or Bearer token.
 */
export function isDealReviewAuthorized(request: Request): boolean {
  return getReviewActor(request) !== null;
}

/** Whether review API env is configured for production. */
export function isDealReviewAuthConfigured(): boolean {
  return Boolean(
    isPublicReviewUiEnabled() ||
      process.env.LACUNA_REVIEW_API_KEY?.trim() ||
      process.env.CRON_SECRET?.trim() ||
      isGitHubReviewOAuthConfigured(),
  );
}

/** Whether GitHub OAuth is the preferred production sign-in path. */
export function isGitHubReviewSignInAvailable(): boolean {
  return isGitHubReviewOAuthConfigured();
}

export function setReviewSessionCookie(
  response: NextResponse,
  input: { sub: string; method: "github" | "api_key" },
): void {
  const token = signReviewSession(input);
  if (!token) {
    throw new Error("Review session secret is not configured");
  }

  const secure = isProductionEnv();
  response.cookies.set(REVIEW_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  response.cookies.set(LEGACY_REVIEW_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export function clearReviewSessionCookies(response: NextResponse): void {
  const secure = isProductionEnv();
  for (const name of [REVIEW_SESSION_COOKIE, LEGACY_REVIEW_TOKEN_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }
}

/** Validate bearer or legacy token and return signed session subject. */
export function apiKeySessionSubject(
  token: string | null | undefined,
): string | null {
  if (!isReviewTokenAuthorized(token)) return null;
  return "api_key:review";
}

export { verifyReviewSession };
