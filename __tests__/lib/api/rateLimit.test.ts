import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __testing__,
  getInMemoryRateLimitBucketCount,
  getRateLimitFailMode,
  MAX_IN_MEMORY_RATE_LIMIT_BUCKETS,
  rateLimit,
  type RateLimitRedisClient,
  resetInMemoryRateLimitBuckets,
  setInMemoryRateLimitBucketCap,
  setRateLimitRedisClient,
} from "@/lib/api/rateLimit";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";

function createMockRedis(): RateLimitRedisClient & {
  store: Map<string, { count: number; expiresAt: number }>;
} {
  const store = new Map<string, { count: number; expiresAt: number }>();
  return {
    store,
    incr(key: string) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || entry.expiresAt <= now) {
        store.set(key, { count: 1, expiresAt: now + 60_000 });
        return Promise.resolve(1);
      }
      entry.count += 1;
      return Promise.resolve(entry.count);
    },
    pexpire(key: string, milliseconds: number) {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + milliseconds;
      }
      return Promise.resolve(1);
    },
    pttl(key: string) {
      const entry = store.get(key);
      if (!entry) return Promise.resolve(-1);
      return Promise.resolve(Math.max(0, entry.expiresAt - Date.now()));
    },
  };
}

function createFailingRedis(message = "redis down"): RateLimitRedisClient {
  const fail = () => Promise.reject(new Error(message));
  return { incr: fail, pexpire: fail, pttl: fail };
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    resetInMemoryRateLimitBuckets();
    setInMemoryRateLimitBucketCap(MAX_IN_MEMORY_RATE_LIMIT_BUCKETS);
    setRateLimitRedisClient(undefined);
    __testing__().resetRedisClient();
    __testing__().resetUnconfiguredWarning();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_FAIL_MODE;
    vi.restoreAllMocks();
  });

  it("allows requests under the in-memory limit (success)", async () => {
    const first = await rateLimit({
      key: "test-ip",
      limit: 2,
      windowMs: 60_000,
      nowMs: 1_000,
    });
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await rateLimit({
      key: "test-ip",
      limit: 2,
      windowMs: 60_000,
      nowMs: 1_100,
    });
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests over the in-memory limit (error)", async () => {
    await rateLimit({ key: "burst", limit: 1, windowMs: 60_000, nowMs: 5_000 });
    const denied = await rateLimit({
      key: "burst",
      limit: 1,
      windowMs: 60_000,
      nowMs: 5_100,
    });
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("uses mocked Redis when client is injected (success)", async () => {
    const mock = createMockRedis();
    setRateLimitRedisClient(mock);

    const allowed = await rateLimit({
      key: "redis-user",
      limit: 3,
      windowMs: 60_000,
    });
    expect(allowed.ok).toBe(true);
    expect(mock.store.size).toBe(1);
  });

  it("enforces limit through mocked Redis (error)", async () => {
    const mock = createMockRedis();
    setRateLimitRedisClient(mock);

    await rateLimit({ key: "redis-burst", limit: 1, windowMs: 60_000 });
    const denied = await rateLimit({
      key: "redis-burst",
      limit: 1,
      windowMs: 60_000,
    });
    expect(denied.ok).toBe(false);
  });

  it("prunes expired buckets on access (success)", async () => {
    setInMemoryRateLimitBucketCap(3);
    await rateLimit({
      key: "old",
      limit: 2,
      windowMs: 100,
      nowMs: 0,
    });
    await rateLimit({
      key: "keep",
      limit: 2,
      windowMs: 10_000,
      nowMs: 0,
    });
    await rateLimit({
      key: "also",
      limit: 2,
      windowMs: 10_000,
      nowMs: 0,
    });
    expect(getInMemoryRateLimitBucketCount()).toBe(3);

    await rateLimit({
      key: "new",
      limit: 2,
      windowMs: 10_000,
      nowMs: 200,
    });
    expect(getInMemoryRateLimitBucketCount()).toBe(3);

    const keep = await rateLimit({
      key: "keep",
      limit: 2,
      windowMs: 10_000,
      nowMs: 200,
    });
    expect(keep.ok).toBe(true);
    expect(keep.remaining).toBe(0);
  });

  it("evicts least-recently-used buckets at the cap (success)", async () => {
    setInMemoryRateLimitBucketCap(3);
    const windowMs = 60_000;
    const limit = 5;
    const nowMs = 1_000;

    await rateLimit({ key: "a", limit, windowMs, nowMs });
    await rateLimit({ key: "b", limit, windowMs, nowMs });
    await rateLimit({ key: "c", limit, windowMs, nowMs });
    expect(getInMemoryRateLimitBucketCount()).toBe(3);

    await rateLimit({ key: "a", limit, windowMs, nowMs: nowMs + 1 });
    await rateLimit({ key: "d", limit, windowMs, nowMs: nowMs + 2 });
    expect(getInMemoryRateLimitBucketCount()).toBe(3);

    const evicted = await rateLimit({
      key: "b",
      limit,
      windowMs,
      nowMs: nowMs + 3,
    });
    expect(evicted.ok).toBe(true);
    expect(evicted.remaining).toBe(4);

    const touched = await rateLimit({
      key: "a",
      limit,
      windowMs,
      nowMs: nowMs + 4,
    });
    expect(touched.ok).toBe(true);
    expect(touched.remaining).toBe(2);
  });

  it("caps unique keys so the map cannot grow without bound (success)", async () => {
    const cap = 8;
    setInMemoryRateLimitBucketCap(cap);
    for (let i = 0; i < cap + 20; i++) {
      await rateLimit({
        key: `flood-${i}`,
        limit: 3,
        windowMs: 60_000,
        nowMs: 1_000,
      });
      expect(getInMemoryRateLimitBucketCount()).toBeLessThanOrEqual(cap);
    }
    expect(getInMemoryRateLimitBucketCount()).toBe(cap);
  });

  it("fails closed when Redis errors and RATE_LIMIT_FAIL_MODE=closed (error)", async () => {
    process.env.RATE_LIMIT_FAIL_MODE = "closed";
    setRateLimitRedisClient(createFailingRedis());

    const denied = await rateLimit({
      key: "closed-path",
      limit: 5,
      windowMs: 1_000,
      nowMs: 10_000,
    });
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.resetAtMs).toBe(11_000);
    expect(getInMemoryRateLimitBucketCount()).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[rateLimit.redis]"),
      expect.objectContaining({ failMode: "closed" }),
    );
  });

  it("fails closed by default when Redis errors (error)", async () => {
    setRateLimitRedisClient(createFailingRedis());

    const denied = await rateLimit({
      key: "default-closed",
      limit: 5,
      windowMs: 1_000,
    });
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(getInMemoryRateLimitBucketCount()).toBe(0);
  });

  it("fails open to in-memory when Redis errors and RATE_LIMIT_FAIL_MODE=open (success)", async () => {
    process.env.RATE_LIMIT_FAIL_MODE = "open";
    setRateLimitRedisClient(createFailingRedis());

    const first = await rateLimit({
      key: "open-path",
      limit: 2,
      windowMs: 1_000,
      nowMs: 20_000,
    });
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);
    expect(getInMemoryRateLimitBucketCount()).toBe(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[rateLimit.redis]"),
      expect.objectContaining({ failMode: "open" }),
    );

    const second = await rateLimit({
      key: "open-path",
      limit: 2,
      windowMs: 1_000,
      nowMs: 20_100,
    });
    expect(second.ok).toBe(true);

    const third = await rateLimit({
      key: "open-path",
      limit: 2,
      windowMs: 1_000,
      nowMs: 20_200,
    });
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("warns once when falling back because Redis is unconfigured (success)", async () => {
    await rateLimit({ key: "local", limit: 2, windowMs: 1_000, nowMs: 1 });
    await rateLimit({ key: "local", limit: 2, windowMs: 1_000, nowMs: 2 });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[rateLimit.fallback]"),
      expect.objectContaining({
        detail: expect.stringContaining("in-memory"),
      }),
    );
  });

  it("reads RATE_LIMIT_FAIL_MODE for guarded patient-data and AI routes (error)", async () => {
    expect(getRateLimitFailMode()).toBe("closed");
    process.env.RATE_LIMIT_FAIL_MODE = "open";
    expect(getRateLimitFailMode()).toBe("open");
    process.env.RATE_LIMIT_FAIL_MODE = "closed";
    expect(getRateLimitFailMode()).toBe("closed");
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
  });

  afterEach(() => {
    resetInMemoryRateLimitBuckets();
    setRateLimitRedisClient(undefined);
    __testing__().resetRedisClient();
    __testing__().resetUnconfiguredWarning();
    delete process.env.RATE_LIMIT_FAIL_MODE;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function requestWithIp(ip: string): Request {
    return new Request("http://localhost/api/ai/insights", {
      headers: { "x-forwarded-for": ip },
    });
  }

  it("returns 429 when Redis errors fail closed (error)", async () => {
    setRateLimitRedisClient(createFailingRedis());
    const limited = await enforceRateLimit(requestWithIp("203.0.113.9"), {
      key: "aiInsights",
      limit: 10,
      windowMs: 60_000,
    });
    expect(limited?.status).toBe(429);
  });

  it("allows the first request when Redis errors fail open (success)", async () => {
    process.env.RATE_LIMIT_FAIL_MODE = "open";
    setRateLimitRedisClient(createFailingRedis());
    const limited = await enforceRateLimit(requestWithIp("203.0.113.10"), {
      key: "genomics-variants",
      limit: 10,
      windowMs: 60_000,
    });
    expect(limited).toBeNull();
  });
});
