type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAtMs: number;
}

/**
 * Best-effort in-memory rate limiting for serverless handlers.
 * Not durable across instances; intended to reduce obvious abuse.
 */
export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  const existing = buckets.get(input.key);
  const fresh = !existing || existing.resetAtMs <= nowMs
    ? { count: 0, resetAtMs: nowMs + input.windowMs }
    : existing;

  if (fresh.count >= input.limit) {
    buckets.set(input.key, fresh);
    return { ok: false, remaining: 0, resetAtMs: fresh.resetAtMs };
  }

  const next = { ...fresh, count: fresh.count + 1 };
  buckets.set(input.key, next);
  return {
    ok: true,
    remaining: Math.max(0, input.limit - next.count),
    resetAtMs: next.resetAtMs,
  };
}

export function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
