import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/compliance/auditEventSink", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/compliance/auditEventSink")
  >();
  return {
    ...actual,
    writeAuditEvent: vi.fn().mockResolvedValue(true),
    isAuditSinkConfigured: vi.fn().mockReturnValue(false),
  };
});

import {
  getClientIp,
  getTrustedProxyHops,
  resolveClientIp,
} from "@/lib/api/requestIdentity";
import {
  getClientIp as rateLimitGetClientIp,
  resetInMemoryRateLimitBuckets,
} from "@/lib/api/rateLimit";
import { enforceRateLimit } from "@/lib/api/rateLimitGuard";
import {
  hashAuditActor,
  writeAuditEvent,
} from "@/lib/compliance/auditEventSink";
import { requirePatientDataAccess } from "@/lib/compliance/patientDataGovernance";

const FORGED_IP = "8.8.8.8";
const REAL_IP = "203.0.113.10";
const OTHER_REAL_IP = "198.51.100.4";

function requestWith(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/identity", { headers });
}

async function capturedAuditActor(request: Request): Promise<string> {
  vi.mocked(writeAuditEvent).mockClear();
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  requirePatientDataAccess(request, "read_summary", "genomics/variants");
  await vi.waitFor(() => expect(writeAuditEvent).toHaveBeenCalled());
  info.mockRestore();
  const payload = vi.mocked(writeAuditEvent).mock.calls[0]?.[0] as {
    actor: string;
  };
  return payload.actor;
}

describe("requestIdentity", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    vi.stubEnv("LACUNA_AUDIT_SALT", "test-salt");
    resetInMemoryRateLimitBuckets();
    vi.mocked(writeAuditEvent).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetInMemoryRateLimitBuckets();
  });

  describe("forged multi-entry X-Forwarded-For", () => {
    beforeEach(() => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    });

    it("ignores the leftmost client-supplied hop (success)", () => {
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}`,
      });
      const resolved = resolveClientIp(request);
      expect(resolved).toBe(REAL_IP);
      expect(resolved).not.toBe(FORGED_IP);
      expect(rateLimitGetClientIp(request)).toBe(resolved);
      expect(getClientIp(request)).toBe(resolved);
    });

    it("derives the rate-limit key and audit actor_hash from the resolved IP (success)", async () => {
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}`,
      });
      const resolved = resolveClientIp(request);
      expect(resolved).toBe(REAL_IP);

      const rateLimitKey = `identity:${rateLimitGetClientIp(request)}`;
      expect(rateLimitKey).toBe(`identity:${REAL_IP}`);
      expect(rateLimitKey).not.toBe(`identity:${FORGED_IP}`);

      const actorHash = hashAuditActor(resolved);
      expect(actorHash).toBe(hashAuditActor(REAL_IP));
      expect(actorHash).not.toBe(hashAuditActor(FORGED_IP));
      expect(actorHash).toHaveLength(64);

      const first = await enforceRateLimit(request, {
        key: "identity",
        limit: 1,
        windowMs: 60_000,
      });
      expect(first).toBeNull();

      const sameClientDifferentForge = await enforceRateLimit(
        requestWith({
          "x-forwarded-for": `1.1.1.1, ${REAL_IP}`,
        }),
        { key: "identity", limit: 1, windowMs: 60_000 },
      );
      expect(sameClientDifferentForge?.status).toBe(429);

      const otherClient = await enforceRateLimit(
        requestWith({
          "x-forwarded-for": `${FORGED_IP}, ${OTHER_REAL_IP}`,
        }),
        { key: "identity", limit: 1, windowMs: 60_000 },
      );
      expect(otherClient).toBeNull();

      const actor = await capturedAuditActor(request);
      expect(actor).toBe(REAL_IP);
      expect(hashAuditActor(actor)).toBe(actorHash);
    });
  });

  describe("missing headers", () => {
    it("returns unknown when no forwarding headers are present (edge)", async () => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
      const request = requestWith();
      expect(resolveClientIp(request)).toBe("unknown");
      expect(resolveClientIp(undefined)).toBe("unknown");
      expect(rateLimitGetClientIp(request)).toBe("unknown");

      const rateLimitKey = `identity:${rateLimitGetClientIp(request)}`;
      expect(rateLimitKey).toBe("identity:unknown");
      expect(hashAuditActor(resolveClientIp(request))).toBe(
        hashAuditActor("unknown"),
      );

      const actor = await capturedAuditActor(request);
      expect(actor).toBe("unknown");
      expect(hashAuditActor(actor)).toBe(hashAuditActor("unknown"));
    });

    it("does not trust a client-supplied x-real-ip (error)", () => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
      const request = requestWith({ "x-real-ip": FORGED_IP });
      expect(resolveClientIp(request)).toBe("unknown");
    });

    it("does not trust XFF when TRUSTED_PROXY_HOPS is 0 (error)", () => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}`,
      });
      expect(getTrustedProxyHops()).toBe(0);
      expect(resolveClientIp(request)).toBe("unknown");
    });
  });

  describe("trusted-proxy happy path", () => {
    it("uses a single XFF hop when TRUSTED_PROXY_HOPS=1 (success)", async () => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
      const request = requestWith({ "x-forwarded-for": REAL_IP });
      expect(resolveClientIp(request)).toBe(REAL_IP);
      expect(rateLimitGetClientIp(request)).toBe(REAL_IP);

      const rateLimitKey = `identity:${rateLimitGetClientIp(request)}`;
      expect(rateLimitKey).toBe(`identity:${REAL_IP}`);

      const allowed = await enforceRateLimit(request, {
        key: "identity",
        limit: 1,
        windowMs: 60_000,
      });
      expect(allowed).toBeNull();

      const actor = await capturedAuditActor(request);
      expect(actor).toBe(REAL_IP);
      expect(hashAuditActor(actor)).toBe(hashAuditActor(REAL_IP));
    });

    it("selects the rightmost untrusted hop when TRUSTED_PROXY_HOPS=2 (success)", () => {
      vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}, 10.0.0.1`,
      });
      expect(resolveClientIp(request)).toBe(REAL_IP);
      expect(rateLimitGetClientIp(request)).toBe(REAL_IP);
      expect(hashAuditActor(resolveClientIp(request))).toBe(
        hashAuditActor(REAL_IP),
      );
    });

    it("prefers the Vercel platform header over a forged XFF list (success)", async () => {
      vi.stubEnv("VERCEL", "1");
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}`,
        "x-vercel-forwarded-for": REAL_IP,
        "x-real-ip": FORGED_IP,
      });
      expect(resolveClientIp(request)).toBe(REAL_IP);

      const rateLimitKey = `identity:${rateLimitGetClientIp(request)}`;
      expect(rateLimitKey).toBe(`identity:${REAL_IP}`);
      expect(rateLimitKey).not.toBe(`identity:${FORGED_IP}`);

      const actor = await capturedAuditActor(request);
      expect(actor).toBe(REAL_IP);
      expect(hashAuditActor(actor)).toBe(hashAuditActor(REAL_IP));
      expect(hashAuditActor(actor)).not.toBe(hashAuditActor(FORGED_IP));
    });

    it("defaults to one trusted hop on Vercel when XFF is the only header (success)", () => {
      vi.stubEnv("VERCEL", "1");
      expect(getTrustedProxyHops()).toBe(1);
      const request = requestWith({
        "x-forwarded-for": `${FORGED_IP}, ${REAL_IP}`,
      });
      expect(resolveClientIp(request)).toBe(REAL_IP);
    });
  });
});
