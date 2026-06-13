import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassifiedDeal } from "@/lib/ingestion/databaseSync";

const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

vi.mock("pg", () => ({
  Pool: class MockPool {
    query = mockPoolQuery;
    connect = mockConnect;
  },
}));

vi.mock("@/lib/ingestion/monitoringAlerts", () => ({
  alertNewDeal: vi.fn(),
}));

function sampleDeal(overrides: Partial<ClassifiedDeal> = {}): ClassifiedDeal {
  return {
    dealId: "sec-123-0001",
    secAccession: "0001193125-24-000001",
    acquirerName: "Acquirer Inc",
    acquirerTicker: "ACQ",
    acquirerCik: "123",
    targetName: "FemHealth Co",
    announcedDate: "2024-03-16",
    filingUrl: "https://www.sec.gov/example",
    filingDate: "2024-03-16",
    parseQuality: "full",
    filingTextSample: "women's health fertility",
    classificationConfidence: "high",
    classificationKeywords: ["fertility", "women's health"],
    womensHealthRelevant: true,
    status: "pending",
    ...overrides,
  };
}

describe("databaseSync", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockClientQuery.mockReset();
    mockConnect.mockReset();
    mockRelease.mockReset();

    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    mockClientQuery.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [{ inserted: true }] });
    });
    mockPoolQuery.mockResolvedValue({ rows: [{ inserted: true }] });

    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
  });

  it("upsertLacunaDeal returns inserted on new row (success)", async () => {
    const { upsertLacunaDeal } = await import("@/lib/ingestion/databaseSync");
    const result = await upsertLacunaDeal(sampleDeal());
    expect(result).toBe("inserted");
    expect(mockPoolQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockPoolQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO lacuna_deals");
    expect(params[1]).toBe("0001193125-24-000001");
  });

  it("syncDealsToDatabase skips non-womens-health deals (edge)", async () => {
    const { syncDealsToDatabase } = await import(
      "@/lib/ingestion/databaseSync"
    );
    const result = await syncDealsToDatabase([
      sampleDeal({ womensHealthRelevant: false }),
      sampleDeal({ dealId: "sec-456-0002", secAccession: "0002" }),
    ]);
    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);
  });

  it("upsert uses ON CONFLICT on sec_accession (success)", async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ inserted: false }] });
    const { upsertLacunaDeal } = await import("@/lib/ingestion/databaseSync");
    const result = await upsertLacunaDeal(sampleDeal());
    expect(result).toBe("updated");
  });
});
