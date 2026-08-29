import process from "node:process";

const UNKNOWN_CLIENT_IP = "unknown";

function isVercelPlatform(): boolean {
  return process.env.VERCEL === "1";
}

function parseForwardedHops(header: string | null): string[] {
  if (!header) return [];
  return header.split(",").map((hop) => hop.trim()).filter((hop) =>
    hop.length > 0
  );
}

/**
 * Number of reverse proxies in front of the app that append X-Forwarded-For.
 * Each trusted hop occupies one right-hand XFF entry; the client is
 * `entries[entries.length - hops]`. `0` means do not trust XFF at all.
 *
 * Override with `TRUSTED_PROXY_HOPS`. Default is `1` on Vercel (the platform
 * appends the connecting client) and `0` elsewhere.
 */
export function getTrustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= 0 && String(parsed) === raw) {
      return parsed;
    }
  }
  return isVercelPlatform() ? 1 : 0;
}

/**
 * Client IP for rate-limit keys and audit actor hashing.
 *
 * Leftmost X-Forwarded-For / X-Real-IP values are client-controlled. This
 * helper only trusts:
 * - `x-vercel-forwarded-for` when running on Vercel (platform-injected)
 * - the rightmost untrusted hop of `x-forwarded-for` given TRUSTED_PROXY_HOPS
 *
 * Returns `"unknown"` when identity cannot be resolved from a trusted hop.
 */
export function resolveClientIp(request?: Request): string {
  if (!request) return UNKNOWN_CLIENT_IP;

  if (isVercelPlatform()) {
    const platformHops = parseForwardedHops(
      request.headers.get("x-vercel-forwarded-for"),
    );
    const platformIp = platformHops.at(-1);
    if (platformIp) return platformIp;
  }

  const trustedHops = getTrustedProxyHops();
  if (trustedHops < 1) return UNKNOWN_CLIENT_IP;

  const forwarded = parseForwardedHops(
    request.headers.get("x-forwarded-for"),
  );
  if (forwarded.length >= trustedHops) {
    return forwarded[forwarded.length - trustedHops] ?? UNKNOWN_CLIENT_IP;
  }

  return UNKNOWN_CLIENT_IP;
}

/** Alias used by rate-limit call sites. */
export function getClientIp(request?: Request): string {
  return resolveClientIp(request);
}
