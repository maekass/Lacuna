import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export const REVIEW_SESSION_COOKIE = "lacuna_review_session";
/** @deprecated Legacy cookie stored raw API keys — still parsed for one release. */
export const LEGACY_REVIEW_TOKEN_COOKIE = "lacuna_review_token";

export const REVIEW_SESSION_TTL_SEC = 60 * 60 * 12;

export type ReviewAuthMethod = "github" | "api_key" | "dev";

export interface ReviewSessionPayload {
  sub: string;
  method: Exclude<ReviewAuthMethod, "dev">;
  exp: number;
}

export interface ReviewActor {
  id: string;
  method: ReviewAuthMethod;
  label: string;
}

function sessionSecret(): string | null {
  return process.env.LACUNA_REVIEW_SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.LACUNA_REVIEW_API_KEY?.trim() ||
    null;
}

/** Sign a reviewer session payload (HMAC-SHA256, no extra dependencies). */
export function signReviewSession(
  input: { sub: string; method: ReviewSessionPayload["method"] },
  ttlSec: number = REVIEW_SESSION_TTL_SEC,
): string | null {
  const secret = sessionSecret();
  if (!secret) return null;

  const payload: ReviewSessionPayload = {
    sub: input.sub,
    method: input.method,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify signed session cookie value. */
export function verifyReviewSession(
  token: string | null | undefined,
): ReviewSessionPayload | null {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", secret).update(body).digest(
    "base64url",
  );
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  let payload: ReviewSessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ReviewSessionPayload;
  } catch {
    return null;
  }

  if (!payload.sub || !payload.method || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function actorFromSession(
  payload: ReviewSessionPayload,
): ReviewActor {
  if (payload.method === "github") {
    return {
      id: `github:${payload.sub}`,
      method: "github",
      label: payload.sub,
    };
  }
  return {
    id: "api_key:review",
    method: "api_key",
    label: "API key reviewer",
  };
}

export function parseSessionFromCookie(
  cookieHeader: string | null,
): ReviewSessionPayload | null {
  if (!cookieHeader) return null;

  const sessionMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${REVIEW_SESSION_COOKIE}=([^;]+)`),
  );
  if (sessionMatch) {
    return verifyReviewSession(decodeURIComponent(sessionMatch[1]));
  }

  return null;
}
