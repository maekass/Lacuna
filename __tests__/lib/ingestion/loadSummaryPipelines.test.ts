import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingestion/ingestRunState", () => ({
  getLatestIngestRun: vi.fn(),
}));

vi.mock("@/lib/observability/reportError", () => ({
  reportWarning: vi.fn((_scope: string, error: unknown) =>
    error instanceof Error ? error.message : "warn"
  ),
}));

describe("loadSummaryPipelines", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns empty pipelines when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { loadSummaryPipelines } = await import(
      "@/lib/ingestion/loadSummaryPipelines"
    );
    await expect(loadSummaryPipelines()).resolves.toEqual({
      secIngestLastRunAt: null,
      secIngestStatus: null,
    });
  });

  it("maps the latest ingest run when the database responds", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    const { getLatestIngestRun } = await import(
      "@/lib/ingestion/ingestRunState"
    );
    vi.mocked(getLatestIngestRun).mockResolvedValue({
      id: 4,
      started_at: "2026-08-10T07:00:00.000Z",
      ended_at: "2026-08-10T07:04:00.000Z",
      status: "success",
      trigger: "schedule",
      scanned_tickers: 12,
      parsed_count: 3,
      womens_health_candidates: 1,
      inserted: 1,
      updated: 0,
      skipped: 0,
      model_id: null,
      build_sha: null,
      error_message: null,
    });

    const { loadSummaryPipelines } = await import(
      "@/lib/ingestion/loadSummaryPipelines"
    );
    await expect(loadSummaryPipelines()).resolves.toEqual({
      secIngestLastRunAt: "2026-08-10T07:04:00.000Z",
      secIngestStatus: "success",
    });
  });

  it("fail-softs to empty pipelines when the database is unreachable", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x@ep-stale.neon.tech/db");
    const { getLatestIngestRun } = await import(
      "@/lib/ingestion/ingestRunState"
    );
    const { reportWarning } = await import("@/lib/observability/reportError");
    vi.mocked(getLatestIngestRun).mockRejectedValue(
      new Error("getaddrinfo ENOTFOUND ep-stale.neon.tech"),
    );

    const { loadSummaryPipelines } = await import(
      "@/lib/ingestion/loadSummaryPipelines"
    );
    await expect(loadSummaryPipelines()).resolves.toEqual({
      secIngestLastRunAt: null,
      secIngestStatus: null,
    });
    expect(reportWarning).toHaveBeenCalled();
  });
});
