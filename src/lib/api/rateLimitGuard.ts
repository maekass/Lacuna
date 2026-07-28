import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";

interface RateLimitGuardInput {
  /** Bucket prefix; the caller IP is appended automatically. */
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Applies the standard per-IP rate limit for an API route.
 * Returns a 429 response when the bucket is exhausted, or `null` to continue.
 */
export async function enforceRateLimit(
  request: Request,
  { key, limit, windowMs }: RateLimitGuardInput,
): Promise<NextResponse | null> {
  const bucket = await rateLimit({
    key: `${key}:${getClientIp(request)}`,
    limit,
    windowMs,
  });
  if (bucket.ok) return null;

  return NextResponse.json(
    { error: "Rate limited", retryAt: bucket.resetAtMs },
    { status: 429 },
  );
}
