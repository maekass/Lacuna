import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingestion/reviewAuditLog", () => ({
  tryLogReviewAction: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/deals/review/session", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns GitHub availability when signed out in production (success)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("GITHUB_OAUTH_CLIENT_ID", "client");
    vi.stubEnv("GITHUB_OAUTH_CLIENT_SECRET", "secret");
    vi.stubEnv("LACUNA_REVIEW_GITHUB_ALLOWLIST", "maekass");
    vi.stubEnv("LACUNA_REVIEW_UI_PUBLIC", "false");
    vi.stubEnv("LACUNA_REVIEW_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");

    const { GET } = await import("@/app/api/deals/review/session/route");
    const response = await GET(
      new Request("http://localhost/api/deals/review/session"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(body.githubSignInAvailable).toBe(true);
    expect(body.readOnly).toBe(false);
  });

  it("marks public demo sessions as read-only (success)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("LACUNA_REVIEW_UI_PUBLIC", "true");
    vi.stubEnv("LACUNA_REVIEW_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");

    const { GET } = await import("@/app/api/deals/review/session/route");
    const response = await GET(
      new Request("http://localhost/api/deals/review/session"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(false);
    expect(body.readOnly).toBe(true);
  });
});
