import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAtMs: number;
}

export interface RateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}

/** Minimal Redis surface used by rate limiting (mockable in tests). */
export interface RateLimitRedisClient {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
}

let redisOverride: RateLimitRedisClient | null | undefined;

/**
 * Override the Redis client used for rate limiting (tests) or disable Redis (null).
 */
export function setRateLimitRedisClient(
  client: RateLimitRedisClient | null | undefined,
): void {
  redisOverride = client;
}

function resolveRedis(): RateLimitRedisClient | null {
  if (redisOverride !== undefined) {
    return redisOverride;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }

  return Redis.fromEnv() as unknown as RateLimitRedisClient;
}

function rateLimitInMemory(input: RateLimitInput): RateLimitResult {
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

async function rateLimitRedis(
  redis: RateLimitRedisClient,
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const nowMs = input.nowMs ?? Date.now();
  const windowKey = `lacuna:rl:${input.key}`;

  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.pexpire(windowKey, input.windowMs);
  }

  const ttlMs = await redis.pttl(windowKey);
  const resetAtMs = nowMs + (ttlMs > 0 ? ttlMs : input.windowMs);

  if (count > input.limit) {
    return { ok: false, remaining: 0, resetAtMs };
  }

  return {
    ok: true,
    remaining: Math.max(0, input.limit - count),
    resetAtMs,
  };
}

/**
 * Fixed-window rate limit backed by Upstash Redis when configured;
 * falls back to in-memory buckets for local dev without Redis.
 */
export async function rateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const redis = resolveRedis();
  if (!redis) {
    return rateLimitInMemory(input);
  }

  try {
    return await rateLimitRedis(redis, input);
  } catch (error) {
    console.error("rateLimit redis error — falling back to in-memory:", error);
    return rateLimitInMemory(input);
  }
}

/** @internal Reset in-memory buckets between tests. */
export function resetInMemoryRateLimitBuckets(): void {
  buckets.clear();
}

export function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
