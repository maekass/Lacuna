import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingestion/ingestRunState", () => ({
  getLatestIngestRun: vi.fn(),
}));

vi.mock("@/lib/ingestion/pendingDeals", () => ({
  countPendingDeals: vi.fn(),
}));

describe("buildSecIngestStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
  });

  it("buildSecIngestStatusPayload includes pending review count", async () => {
    const { getLatestIngestRun } = await import(
      "@/lib/ingestion/ingestRunState"
    );
    const { countPendingDeals } = await import("@/lib/ingestion/pendingDeals");
    vi.mocked(getLatestIngestRun).mockResolvedValue({
      id: 1,
      status: "success",
      started_at: "2026-07-05T06:00:00.000Z",
      finished_at: "2026-07-05T06:04:00.000Z",
      scanned_tickers: 12,
      parsed_filings: 3,
      error_message: null,
    });
    vi.mocked(countPendingDeals).mockResolvedValue(5);

    const { buildSecIngestStatusPayload } = await import(
      "@/lib/ingestion/buildSecIngestStatus"
    );
    const payload = await buildSecIngestStatusPayload();

    expect(payload.ok).toBe(true);
    expect(payload.pendingReviewCount).toBe(5);
    expect(payload.reviewQueuePath).toBe("/deals#data-pipelines");
  });
});

describe("GET /api/ingest/sec/status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
  });

  it("returns pendingReviewCount in JSON", async () => {
    vi.doMock("@/lib/ingestion/buildSecIngestStatus", () => ({
      buildSecIngestStatusPayload: vi.fn().mockResolvedValue({
        ok: true,
        latest: null,
        pendingReviewCount: 2,
        cronPath: "/api/cron/sec-ingest",
        cli: "npm run sec:ingest",
        reviewQueuePath: "/deals#data-pipelines",
        pendingApiPath: "/api/deals/pending",
      }),
    }));

    const { GET } = await import("@/app/api/ingest/sec/status/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pendingReviewCount).toBe(2);
  });
});
