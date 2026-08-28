import { NextResponse } from "next/server";
import {
  getClientIp,
  getRateLimitFailMode,
  rateLimit,
} from "@/lib/api/rateLimit";

interface RateLimitGuardInput {
  /** Bucket prefix; the caller IP is appended automatically. */
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Applies the standard per-IP rate limit for an API route.
 * Returns a 429 response when the bucket is exhausted, or `null` to continue.
 *
 * Patient-data and AI routes use this guard. Redis errors fail closed unless
 * `RATE_LIMIT_FAIL_MODE=open` (see `getRateLimitFailMode`).
 */
export async function enforceRateLimit(
  request: Request,
  { key, limit, windowMs }: RateLimitGuardInput,
): Promise<NextResponse | null> {
  const bucket = await rateLimit({
    key: `${key}:${getClientIp(request)}`,
    limit,
    windowMs,
    failMode: getRateLimitFailMode(),
  });
  if (bucket.ok) return null;

  return NextResponse.json(
    { error: "Rate limited", retryAt: bucket.resetAtMs },
    { status: 429 },
  );
}
