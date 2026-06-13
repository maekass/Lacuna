import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { getClientIp, rateLimit } from "@/lib/api/rateLimit";

export interface GuardedFetchOptions {
  request: Request;
  rateLimitKey: string;
  limit?: number;
  windowMs?: number;
  timeoutMs?: number;
}

/** Rate-limited upstream fetch for public API routes. */
export async function guardedUpstreamFetch(
  url: string,
  init: RequestInit,
  options: GuardedFetchOptions,
): Promise<Response | NextResponse> {
  const ip = getClientIp(options.request);
  const bucket = await rateLimit({
    key: `${options.rateLimitKey}:${ip}`,
    limit: options.limit ?? 30,
    windowMs: options.windowMs ?? 60_000,
  });
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Rate limited", retryAt: bucket.resetAtMs },
      { status: 429 },
    );
  }

  return fetchWithTimeout(url, { ...init, timeoutMs: options.timeoutMs });
}
