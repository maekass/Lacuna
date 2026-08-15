import process from "node:process";
import { Redis } from "@upstash/redis";
import { reportError, reportWarning } from "@/lib/observability/reportError";

type Bucket = { count: number; resetAtMs: number };

const inMemoryBuckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAtMs: number;
}

// Backward-compatible type for test injection
export type RateLimitRedisClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
};

// Redis client singleton (lazy init)
let redisClient: Redis | null = null;
let redisConfigured: boolean | null = null;
let injectedRedisClient: RateLimitRedisClient | undefined;

export function setRateLimitRedisClient(
  client: RateLimitRedisClient | undefined,
): void {
  injectedRedisClient = client;
}

export function resetInMemoryRateLimitBuckets(): void {
  inMemoryBuckets.clear();
}

function getRedisClient(): Redis | null {
  // Support injected client for testing
  if (injectedRedisClient) {
    return injectedRedisClient as unknown as Redis;
  }

  if (redisConfigured === false) return null;
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisConfigured = false;
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    redisConfigured = true;
    return redisClient;
  } catch (error) {
    // Credentials are set but unusable: fall back, but never silently.
    reportError("rateLimit.redisInit", error, {
      detail: "Upstash Redis client init failed, using in-memory rate limiting",
    });
    redisConfigured = false;
    return null;
  }
}

/**
 * Redis-backed rate limiting with in-memory fallback.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory (non-durable) when Redis is unavailable.
 */
export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    return rateLimitRedis(redis, input);
  }

  return Promise.resolve(rateLimitInMemory(input));
}

async function rateLimitRedis(
  redis: Redis,
  input: {
    key: string;
    limit: number;
    windowMs: number;
    nowMs?: number;
  },
): Promise<RateLimitResult> {
  const nowMs = input.nowMs ?? Date.now();
  const ttlSeconds = Math.ceil(input.windowMs / 1000);
  const redisKey = `ratelimit:${input.key}`;

  try {
    // Detect if using simple client (test mock) or full Upstash Redis
    const simpleClient = redis as unknown as RateLimitRedisClient;
    let count: number;
    let ttlMs: number;

    if (typeof (redis as { pipeline?: unknown }).pipeline === "function") {
      // Full Upstash Redis client with pipeline support
      const pipeline = redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.ttl(redisKey);
      const results = await pipeline.exec<[number, number]>();
      count = results[0];
      const ttl = results[1];

      // Set expiry if this is a new key (ttl = -1)
      if (ttl === -1) {
        await redis.expire(redisKey, ttlSeconds);
      }
      ttlMs = ttl > 0 ? ttl * 1000 : input.windowMs;
    } else {
      // Simple test mock with incr/pexpire/pttl
      count = await simpleClient.incr(redisKey);
      if (count === 1) {
        await simpleClient.pexpire(redisKey, input.windowMs);
      }
      ttlMs = await simpleClient.pttl(redisKey);
      if (ttlMs < 0) ttlMs = input.windowMs;
    }

    const resetAtMs = nowMs + ttlMs;

    if (count > input.limit) {
      return { ok: false, remaining: 0, resetAtMs };
    }

    return {
      ok: true,
      remaining: Math.max(0, input.limit - count),
      resetAtMs,
    };
  } catch (error) {
    // Redis failure: fall back to in-memory
    reportWarning("rateLimit.redis", error, {
      detail: "Redis rate limit failed, using in-memory fallback",
    });
    return rateLimitInMemory(input);
  }
}

function rateLimitInMemory(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  const existing = inMemoryBuckets.get(input.key);
  const fresh = !existing || existing.resetAtMs <= nowMs
    ? { count: 0, resetAtMs: nowMs + input.windowMs }
    : existing;

  if (fresh.count >= input.limit) {
    inMemoryBuckets.set(input.key, fresh);
    return { ok: false, remaining: 0, resetAtMs: fresh.resetAtMs };
  }

  const next = { ...fresh, count: fresh.count + 1 };
  inMemoryBuckets.set(input.key, next);
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

// Export for testing
export function __testing__() {
  return {
    resetRedisClient: () => {
      redisClient = null;
      redisConfigured = null;
    },
    clearInMemoryBuckets: () => inMemoryBuckets.clear(),
    rateLimitInMemory,
  };
}
