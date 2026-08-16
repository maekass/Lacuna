import { afterEach, describe, expect, it, vi } from "vitest";
import { guardDealReviewRequest } from "@/lib/api/dealReviewAccess";
import { signReviewSession } from "@/lib/infra/reviewSession";

function productionPublicDemo() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/lacuna");
  vi.stubEnv("LACUNA_REVIEW_UI_PUBLIC", "true");
  vi.stubEnv("LACUNA_REVIEW_API_KEY", "");
  vi.stubEnv("CRON_SECRET", "");
}

describe("guardDealReviewRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows reads in public demo mode (success)", () => {
    productionPublicDemo();
    const request = new Request("http://localhost/api/deals/pending");
    expect(guardDealReviewRequest(request)).toBeNull();
  });

  it("blocks writes in public demo mode (error)", async () => {
    productionPublicDemo();
    const request = new Request("http://localhost/api/deals/pending/d-1", {
      method: "PATCH",
    });
    const denied = guardDealReviewRequest(request);
    expect(denied?.status).toBe(403);
    expect((await denied?.json()).error).toContain("public demo mode");
  });

  it("allows writes for a signed GitHub session in public demo (success)", () => {
    productionPublicDemo();
    vi.stubEnv("LACUNA_REVIEW_SESSION_SECRET", "test-secret");
    const token = signReviewSession({ sub: "maekass", method: "github" });
    const request = new Request("http://localhost/api/deals/pending/d-1", {
      method: "PATCH",
      headers: { cookie: `lacuna_review_session=${token}` },
    });
    expect(guardDealReviewRequest(request)).toBeNull();
  });

  it("allows writes for an authorized API key (edge)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/lacuna");
    vi.stubEnv("LACUNA_REVIEW_UI_PUBLIC", "false");
    vi.stubEnv("LACUNA_REVIEW_API_KEY", "review-key");
    const request = new Request("http://localhost/api/deals/pending/d-1", {
      method: "PATCH",
      headers: { authorization: "Bearer review-key" },
    });
    expect(guardDealReviewRequest(request)).toBeNull();
  });
});
