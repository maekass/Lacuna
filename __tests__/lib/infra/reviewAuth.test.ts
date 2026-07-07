import { describe, expect, it, vi } from "vitest";
import {
  isDealReviewAuthorized,
  isReviewTokenAuthorized,
  parseReviewTokenFromCookie,
} from "@/lib/infra/reviewAuth";

describe("reviewAuth", () => {
  it("allows any request in non-production (success)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "preview");
    const request = new Request("http://localhost/api/deals/pending");
    expect(isDealReviewAuthorized(request)).toBe(true);
  });

  it("accepts Bearer review key in production (success)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("LACUNA_REVIEW_API_KEY", "review-key");
    const request = new Request("http://localhost/api/deals/pending", {
      headers: { authorization: "Bearer review-key" },
    });
    expect(isDealReviewAuthorized(request)).toBe(true);
  });

  it("accepts review session cookie in production (success)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    const request = new Request("http://localhost/api/deals/pending", {
      headers: { cookie: "lacuna_review_token=cron-secret" },
    });
    expect(isDealReviewAuthorized(request)).toBe(true);
  });

  it("allows public review UI flag in production (success)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("LACUNA_REVIEW_UI_PUBLIC", "true");
    vi.stubEnv("LACUNA_REVIEW_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");
    const request = new Request("http://localhost/api/deals/pending");
    expect(isDealReviewAuthorized(request)).toBe(true);
  });

  it("parses review cookie token", () => {
    expect(
      parseReviewTokenFromCookie("foo=1; lacuna_review_token=abc%20123; bar=2"),
    ).toBe("abc 123");
    expect(isReviewTokenAuthorized("abc")).toBe(false);
  });
});
