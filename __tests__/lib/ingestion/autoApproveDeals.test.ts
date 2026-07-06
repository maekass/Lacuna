import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPoolQuery = vi.fn();

vi.mock("pg", () => ({
  Pool: class MockPool {
    query = mockPoolQuery;
  },
}));

describe("autoApproveDeals", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
    vi.stubEnv("LACUNA_HANDS_OFF_INGEST", "true");
    vi.stubEnv("LACUNA_AUTO_APPROVE_CONFIDENCE", "high");
  });

  it("isHandsOffIngestEnabled respects env flag", async () => {
    const { isHandsOffIngestEnabled } = await import(
      "@/lib/ingestion/autoApproveDeals"
    );
    expect(isHandsOffIngestEnabled()).toBe(true);
    vi.stubEnv("LACUNA_HANDS_OFF_INGEST", "false");
    expect(isHandsOffIngestEnabled()).toBe(false);
  });

  it("autoApproveHighConfidenceDeals updates only high-confidence WH rows", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ deal_id: "sec-1" }, { deal_id: "sec-2" }],
    });

    const { autoApproveHighConfidenceDeals } = await import(
      "@/lib/ingestion/autoApproveDeals"
    );
    const count = await autoApproveHighConfidenceDeals();

    expect(count).toBe(2);
    expect(mockPoolQuery.mock.calls[0]?.[0]).toContain("classification_confidence");
    expect(mockPoolQuery.mock.calls[0]?.[1]).toEqual([["high"]]);
  });
});
