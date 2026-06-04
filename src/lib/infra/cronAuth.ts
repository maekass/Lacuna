/**
 * Authorize Vercel Cron / manual cron hits to `/api/cron/*`.
 * When `CRON_SECRET` is set, requires `Authorization: Bearer <secret>`.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}
