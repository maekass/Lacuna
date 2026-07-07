import { afterEach, describe, expect, it, vi } from "vitest";
import {
  actorFromSession,
  signReviewSession,
  verifyReviewSession,
} from "@/lib/infra/reviewSession";

describe("reviewSession", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs and verifies a github reviewer session", () => {
    vi.stubEnv("LACUNA_REVIEW_SESSION_SECRET", "test-secret");
    const token = signReviewSession({ sub: "maekass", method: "github" });
    expect(token).toBeTruthy();
    const payload = verifyReviewSession(token);
    expect(payload?.sub).toBe("maekass");
    expect(payload?.method).toBe("github");
    expect(actorFromSession(payload!).label).toBe("maekass");
  });

  it("rejects tampered session tokens", () => {
    vi.stubEnv("LACUNA_REVIEW_SESSION_SECRET", "test-secret");
    const token = signReviewSession({ sub: "maekass", method: "github" });
    const tampered = `${token}x`;
    expect(verifyReviewSession(tampered)).toBeNull();
  });
});
