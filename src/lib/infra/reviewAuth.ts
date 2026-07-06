import process from "node:process";

/**
 * Authorize access to deal review APIs (`/api/deals/pending`, future PATCH).
 * Accepts `LACUNA_REVIEW_API_KEY` or `CRON_SECRET` as Bearer tokens.
 */
export function isDealReviewAuthorized(request: Request): boolean {
  const reviewKey = process.env.LACUNA_REVIEW_API_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const secrets = [reviewKey, cronSecret].filter((s): s is string => Boolean(s));

  const isProduction = process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (!isProduction) {
    return true;
  }

  if (secrets.length === 0) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return false;
  }

  const token = auth.slice("Bearer ".length);
  return secrets.some((secret) => secret === token);
}

/** Whether review API env is configured for production. */
export function isDealReviewAuthConfigured(): boolean {
  return Boolean(
    process.env.LACUNA_REVIEW_API_KEY?.trim() ||
      process.env.CRON_SECRET?.trim(),
  );
}
