import process from "node:process";
/**
 * Authorize Vercel Cron / manual cron hits to `/api/cron/*`.
 * Production requires `CRON_SECRET` and `Authorization: Bearer <secret>`.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (!secret) {
    return !isProduction;
  }

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
