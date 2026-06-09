import { afterEach, describe, expect, it } from "vitest";
import {
  rateLimit,
  type RateLimitRedisClient,
  resetInMemoryRateLimitBuckets,
  setRateLimitRedisClient,
} from "@/lib/api/rateLimit";

function createMockRedis(): RateLimitRedisClient & {
  store: Map<string, { count: number; expiresAt: number }>;
} {
  const store = new Map<string, { count: number; expiresAt: number }>();
  return {
    store,
    async incr(key: string) {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || entry.expiresAt <= now) {
        store.set(key, { count: 1, expiresAt: now + 60_000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
    async pexpire(key: string, milliseconds: number) {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + milliseconds;
      }
      return 1;
    },
    async pttl(key: string) {
      const entry = store.get(key);
      if (!entry) return -1;
      return Math.max(0, entry.expiresAt - Date.now());
    },
  };
}

describe("rateLimit", () => {
  afterEach(() => {
    resetInMemoryRateLimitBuckets();
    setRateLimitRedisClient(undefined);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
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
});
