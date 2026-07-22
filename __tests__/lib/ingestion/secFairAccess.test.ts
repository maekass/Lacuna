import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireSecRequestPermit,
  resetSecTokenBucketForTests,
  SEC_MAX_REQUESTS_PER_SECOND,
} from "@/lib/ingestion/secFairAccess";

describe("secFairAccess token bucket", () => {
  beforeEach(() => {
    resetSecTokenBucketForTests();
    vi.stubEnv("SEC_EDGAR_USER_AGENT", "Lacuna Test test@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetSecTokenBucketForTests();
  });

  it("cold start spaces consecutive permits by at least one slot", async () => {
    const start = Date.now();
    await acquireSecRequestPermit();
    await acquireSecRequestPermit();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(
      Math.floor(1000 / SEC_MAX_REQUESTS_PER_SECOND) - 5,
    );
  });

  it("reset allows a fresh bucket instance", () => {
    resetSecTokenBucketForTests();
    expect(() => resetSecTokenBucketForTests()).not.toThrow();
  });
});
