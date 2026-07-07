import process from "node:process";

export const REVIEW_SESSION_COOKIE = "lacuna_review_token";

function reviewSecrets(): string[] {
  const reviewKey = process.env.LACUNA_REVIEW_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  return [reviewKey, cronSecret].filter((s): s is string => Boolean(s));
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
}

/** Whether a bearer or session token matches configured review secrets. */
export function isReviewTokenAuthorized(
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  return reviewSecrets().some((secret) => secret === token);
}

/** Parse review session cookie from a Cookie header value. */
export function parseReviewTokenFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${REVIEW_SESSION_COOKIE}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authorize access to deal review APIs (`/api/deals/pending`, PATCH, import).
 * Accepts Bearer token or `lacuna_review_token` session cookie (set via
 * `POST /api/deals/review/session`).
 */
export function isDealReviewAuthorized(request: Request): boolean {
  if (!isProductionEnv()) {
    return true;
  }

  if (process.env.LACUNA_REVIEW_UI_PUBLIC === "true") {
    return true;
  }

  if (reviewSecrets().length === 0) {
    return false;
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : null;
  const cookieToken = parseReviewTokenFromCookie(request.headers.get("cookie"));

  return isReviewTokenAuthorized(bearer) ||
    isReviewTokenAuthorized(cookieToken);
}

/** Whether review API env is configured for production. */
export function isDealReviewAuthConfigured(): boolean {
  return Boolean(
    process.env.LACUNA_REVIEW_UI_PUBLIC === "true" ||
      process.env.LACUNA_REVIEW_API_KEY?.trim() ||
      process.env.CRON_SECRET?.trim(),
  );
}
