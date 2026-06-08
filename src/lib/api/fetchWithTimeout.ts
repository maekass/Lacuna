const DEFAULT_TIMEOUT_MS = 12_000;

/** Upstream fetch with AbortSignal timeout — use for all external API routes. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const rest: RequestInit = { ...(init ?? {}) };
  delete (rest as RequestInit & { timeoutMs?: number }).timeoutMs;
  return fetch(input, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
