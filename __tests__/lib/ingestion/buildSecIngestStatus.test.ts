import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingestion/ingestRunState", () => ({
  getLatestIngestRun: vi.fn(),
}));

vi.mock("@/lib/ingestion/pendingQueueMetrics", () => ({
  buildPendingQueueMetrics: vi.fn(),
}));

describe("buildSecIngestStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
  });

  it("buildSecIngestStatusPayload delegates queue fields to metrics", async () => {
    const { getLatestIngestRun } = await import(
      "@/lib/ingestion/ingestRunState"
    );
    const { buildPendingQueueMetrics } = await import(
      "@/lib/ingestion/pendingQueueMetrics"
    );
    vi.mocked(getLatestIngestRun).mockResolvedValue({
      id: 1,
      status: "success",
      started_at: "2026-07-05T06:00:00.000Z",
      finished_at: "2026-07-05T06:04:00.000Z",
      scanned_tickers: 12,
      parsed_filings: 3,
      error_message: null,
    });
    vi.mocked(buildPendingQueueMetrics).mockResolvedValue({
      ok: true,
      pending: 5,
      approved: 2,
      rejected: 1,
      merged: 4,
      stagingCandidateCount: 7,
      medianAgeHours: 18,
      oldestPendingIngestedAt: null,
    });

    const { buildSecIngestStatusPayload } = await import(
      "@/lib/ingestion/buildSecIngestStatus"
    );
    const payload = await buildSecIngestStatusPayload();

    expect(payload.ok).toBe(true);
    expect(payload.pendingReviewCount).toBe(5);
    expect(payload.queue.stagingCandidateCount).toBe(7);
    expect(payload.reviewQueuePath).toBe("/deals#review");
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
        oldestPendingIngestedAt: null,
        queue: {
          ok: true,
          pending: 2,
          approved: 0,
          rejected: 0,
          merged: 0,
          stagingCandidateCount: 2,
          medianAgeHours: null,
          oldestPendingIngestedAt: null,
        },
        cronPath: "/api/cron/sec-ingest",
        cli: "npm run sec:ingest",
        reviewQueuePath: "/deals#review",
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
