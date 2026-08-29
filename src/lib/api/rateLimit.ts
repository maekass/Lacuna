import process from "node:process";
import { Redis } from "@upstash/redis";
import { reportError, reportWarning } from "@/lib/observability/reportError";

type Bucket = { count: number; resetAtMs: number };

/** Caps in-memory buckets so client-controlled keys cannot grow without bound. */
export const MAX_IN_MEMORY_RATE_LIMIT_BUCKETS = 10_000;

const inMemoryBuckets = new Map<string, Bucket>();
let maxInMemoryBuckets = MAX_IN_MEMORY_RATE_LIMIT_BUCKETS;
let warnedUnconfiguredFallback = false;

export type RateLimitFailMode = "open" | "closed";

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

/**
 * Injects a Redis client for tests. Pass `undefined` to restore lazy init.
 */
export function setRateLimitRedisClient(
  client: RateLimitRedisClient | undefined,
): void {
  injectedRedisClient = client;
}

/**
 * Drops all in-memory rate-limit buckets. Used by tests.
 */
export function resetInMemoryRateLimitBuckets(): void {
  inMemoryBuckets.clear();
}

/**
 * Returns the current in-memory bucket count (tests / diagnostics).
 */
export function getInMemoryRateLimitBucketCount(): number {
  return inMemoryBuckets.size;
}

/**
 * Overrides the in-memory bucket cap. Used by tests to exercise eviction.
 */
export function setInMemoryRateLimitBucketCap(max: number): void {
  maxInMemoryBuckets = Math.max(1, Math.floor(max));
}

/**
 * Resolves Redis-error behavior: explicit override, then
 * `RATE_LIMIT_FAIL_MODE=open|closed`, then `closed`.
 */
export function getRateLimitFailMode(
  override?: RateLimitFailMode,
): RateLimitFailMode {
  if (override === "open" || override === "closed") return override;
  const env = process.env.RATE_LIMIT_FAIL_MODE?.trim().toLowerCase();
  if (env === "open" || env === "closed") return env;
  return "closed";
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
    // Credentials are set but unusable: never silently.
    reportError("rateLimit.redisInit", error, {
      detail: "Upstash Redis client init failed",
    });
    redisConfigured = false;
    return null;
  }
}

function warnUnconfiguredFallback(): void {
  if (warnedUnconfiguredFallback) return;
  warnedUnconfiguredFallback = true;
  reportWarning(
    "rateLimit.fallback",
    "Upstash Redis is not configured",
    {
      detail:
        "Using in-memory rate limiting; limits are per-instance and capped",
    },
  );
}

function denyClosed(input: {
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  return { ok: false, remaining: 0, resetAtMs: nowMs + input.windowMs };
}

function handleRedisFailure(
  error: unknown,
  input: {
    key: string;
    limit: number;
    windowMs: number;
    nowMs?: number;
    failMode?: RateLimitFailMode;
  },
): RateLimitResult {
  const failMode = getRateLimitFailMode(input.failMode);
  const detail = failMode === "closed"
    ? "Redis rate limit failed, failing closed"
    : "Redis rate limit failed, using in-memory fallback";
  reportWarning("rateLimit.redis", error, { detail, failMode });
  if (failMode === "closed") {
    return denyClosed(input);
  }
  return rateLimitInMemory(input);
}

/**
 * Redis-backed rate limiting with a capped in-memory fallback.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set. Redis errors honor RATE_LIMIT_FAIL_MODE (`closed` by default).
 */
export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
  failMode?: RateLimitFailMode;
}): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    return rateLimitRedis(redis, input);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const credentialsPresent = Boolean(url && token);

  if (credentialsPresent) {
    // Init failed after credentials were set: treat as a Redis error.
    return Promise.resolve(
      handleRedisFailure("Upstash Redis client is unavailable", input),
    );
  }

  warnUnconfiguredFallback();
  return Promise.resolve(rateLimitInMemory(input));
}

async function rateLimitRedis(
  redis: Redis,
  input: {
    key: string;
    limit: number;
    windowMs: number;
    nowMs?: number;
    failMode?: RateLimitFailMode;
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
    return handleRedisFailure(error, input);
  }
}

function pruneExpiredInMemoryBuckets(nowMs: number): void {
  for (const [key, bucket] of inMemoryBuckets) {
    if (bucket.resetAtMs <= nowMs) {
      inMemoryBuckets.delete(key);
    }
  }
}

function evictOldestInMemoryBucket(): void {
  const oldest = inMemoryBuckets.keys().next().value;
  if (oldest !== undefined) {
    inMemoryBuckets.delete(oldest);
  }
}

function rateLimitInMemory(input: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = input.nowMs ?? Date.now();
  pruneExpiredInMemoryBuckets(nowMs);

  const existing = inMemoryBuckets.get(input.key);
  while (!existing && inMemoryBuckets.size >= maxInMemoryBuckets) {
    evictOldestInMemoryBucket();
  }

  const fresh = existing ?? { count: 0, resetAtMs: nowMs + input.windowMs };

  // Map insertion order is LRU: delete + set moves the key to the end.
  if (existing) {
    inMemoryBuckets.delete(input.key);
  }

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

export { getClientIp, resolveClientIp } from "@/lib/api/requestIdentity";

// Export for testing
export function __testing__() {
  return {
    resetRedisClient: () => {
      redisClient = null;
      redisConfigured = null;
    },
    clearInMemoryBuckets: () => inMemoryBuckets.clear(),
    resetUnconfiguredWarning: () => {
      warnedUnconfiguredFallback = false;
    },
    rateLimitInMemory,
  };
}
