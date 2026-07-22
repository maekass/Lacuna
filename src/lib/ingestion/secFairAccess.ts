import process from "node:process";

/**
 * SEC EDGAR fair-access User-Agent helper.
 * @see https://www.sec.gov/os/webmaster-faq#code-support
 */
export function getSecUserAgent(): string {
  const ua = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (!ua) {
    throw new Error(
      'SEC_EDGAR_USER_AGENT is required (SEC policy). Example: "Lacuna Research mps5cy@virginia.edu"',
    );
  }
  return ua;
}

/** SEC fair-access guidance: max 10 requests per second. */
export const SEC_MAX_REQUESTS_PER_SECOND = 10;

/** Minimum spacing between requests when bucket is empty (~10 req/s). */
export const SEC_RATE_LIMIT_MS = Math.ceil(1000 / SEC_MAX_REQUESTS_PER_SECOND);

export function secFetchHeaders(accept = "application/json"): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": getSecUserAgent(),
  };
}

interface TokenBucketState {
  tokens: number;
  lastRefillMs: number;
}

let bucketState: TokenBucketState | null = null;

function getBucketState(): TokenBucketState {
  if (!bucketState) {
    // Cold start: no burst — refill from zero so first caller waits ~100ms.
    bucketState = {
      tokens: 0,
      lastRefillMs: Date.now(),
    };
  }
  return bucketState;
}

/** @internal Test hook — reset module singleton between cases. */
export function resetSecTokenBucketForTests(): void {
  bucketState = null;
}

function refillBucket(state: TokenBucketState, nowMs: number): void {
  const elapsedMs = Math.max(0, nowMs - state.lastRefillMs);
  if (elapsedMs === 0) return;
  const refill = (elapsedMs / 1000) * SEC_MAX_REQUESTS_PER_SECOND;
  state.tokens = Math.min(SEC_MAX_REQUESTS_PER_SECOND, state.tokens + refill);
  state.lastRefillMs = nowMs;
}

/**
 * Acquire one SEC request permit (token bucket, ~10 req/s max).
 * Survives warm serverless instances; cold starts begin with zero tokens.
 */
export async function acquireSecRequestPermit(): Promise<void> {
  const state = getBucketState();
  const nowMs = Date.now();
  refillBucket(state, nowMs);

  if (state.tokens >= 1) {
    state.tokens -= 1;
    return;
  }

  const deficit = 1 - state.tokens;
  const waitMs = Math.ceil((deficit / SEC_MAX_REQUESTS_PER_SECOND) * 1000);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const afterWait = Date.now();
  refillBucket(state, afterWait);
  state.tokens = Math.max(0, state.tokens - 1);
  state.lastRefillMs = afterWait;
}

/** @deprecated Use acquireSecRequestPermit — kept for gradual migration. */
export async function secRateLimitPause(
  ms: number = SEC_RATE_LIMIT_MS,
): Promise<void> {
  await acquireSecRequestPermit();
  if (ms > SEC_RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, ms - SEC_RATE_LIMIT_MS));
  }
}
