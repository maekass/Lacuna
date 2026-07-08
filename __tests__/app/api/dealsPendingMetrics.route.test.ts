import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPoolQuery = vi.fn();

vi.mock("pg", () => ({
  Pool: class MockPool {
    query = mockPoolQuery;
  },
}));

describe("buildPendingQueueMetrics", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
  });

  it("aggregates status counts in a single SQL round-trip", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        pending: "3",
        approved: "3",
        rejected: "1",
        merged: "5",
        median_age_hours: "36.5",
        oldest_pending_ingested_at: "2026-07-01T12:00:00.000Z",
      }],
    });

    const { buildPendingQueueMetrics } = await import(
      "@/lib/ingestion/pendingQueueMetrics"
    );
    const metrics = await buildPendingQueueMetrics();

    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    expect(metrics.pending).toBe(3);
    expect(metrics.approved).toBe(3);
    expect(metrics.stagingCandidateCount).toBe(6);
    expect(metrics.medianAgeHours).toBe(36.5);
    expect(metrics.oldestPendingIngestedAt).toBe("2026-07-01T12:00:00.000Z");
  });
});

describe("GET /api/deals/pending/metrics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
  });

  it("returns aggregate queue metrics", async () => {
    vi.doMock("@/lib/ingestion/pendingQueueMetrics", () => ({
      buildPendingQueueMetrics: vi.fn().mockResolvedValue({
        ok: true,
        pending: 2,
        approved: 1,
        rejected: 0,
        merged: 4,
        stagingCandidateCount: 3,
        medianAgeHours: 12,
        oldestPendingIngestedAt: "2026-07-01T00:00:00.000Z",
      }),
    }));

    const { GET } = await import("@/app/api/deals/pending/metrics/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.stagingCandidateCount).toBe(3);
    expect(body.pending).toBe(2);
  });

  it("returns 503 when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { GET } = await import("@/app/api/deals/pending/metrics/route");
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
