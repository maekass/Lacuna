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

/** SEC requests-per-second guidance: ~10/sec max; default 120ms between calls. */
export const SEC_RATE_LIMIT_MS = 120;

export async function secRateLimitPause(
  ms: number = SEC_RATE_LIMIT_MS,
): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export function secFetchHeaders(accept = "application/json"): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": getSecUserAgent(),
  };
}
