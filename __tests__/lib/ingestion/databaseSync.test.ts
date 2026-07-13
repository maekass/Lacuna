import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassifiedDeal } from "@/lib/ingestion/databaseSync";
import { buildSecDealNaturalKey } from "@/lib/ingestion/secDealNaturalKey";

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

const ACCESSION = "0001193125-24-000001";
const CIK = "123";

function sampleDeal(overrides: Partial<ClassifiedDeal> = {}): ClassifiedDeal {
  return {
    dealId: "sec-123-000119312524000001",
    secAccession: ACCESSION,
    naturalKey: buildSecDealNaturalKey(ACCESSION, CIK, "8-K"),
    formType: "8-K",
    acquirerName: "Acquirer Inc",
    acquirerTicker: "ACQ",
    acquirerCik: CIK,
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
      if (sql.includes("INSERT INTO lacuna_deals")) {
        return Promise.resolve({
          rowCount: 1,
          rows: [{ deal_id: "sec-123" }],
        });
      }
      if (sql.includes("lacuna_ingest_state")) {
        return Promise.resolve({ rowCount: 1, rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
    mockPoolQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ deal_id: "sec-123" }],
    });

    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
  });

  it("upsertLacunaDeal returns inserted on new row (success)", async () => {
    const { upsertLacunaDeal } = await import("@/lib/ingestion/databaseSync");
    const result = await upsertLacunaDeal(sampleDeal());
    expect(result).toBe("inserted");
    expect(mockConnect).toHaveBeenCalled();
    const insertCall = mockClientQuery.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO lacuna_deals")
    );
    expect(insertCall?.[0]).toContain("ON CONFLICT (natural_key) DO NOTHING");
    expect(insertCall?.[1]?.[1]).toBe(ACCESSION);
  });

  it("syncDealsToDatabase skips non-womens-health deals (edge)", async () => {
    const { syncDealsToDatabase } = await import(
      "@/lib/ingestion/databaseSync"
    );
    const result = await syncDealsToDatabase([
      sampleDeal({ womensHealthRelevant: false }),
      sampleDeal({
        dealId: "sec-456-0002",
        secAccession: "0002",
        naturalKey: buildSecDealNaturalKey("0002", "456", "8-K"),
      }),
    ]);
    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.deduped).toBe(0);
  });

  it("upsert dedupes on natural_key conflict (replay)", async () => {
    mockClientQuery.mockImplementation((sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("INSERT INTO lacuna_deals")) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      if (sql.includes("lacuna_ingest_state")) {
        return Promise.resolve({ rowCount: 1, rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { upsertLacunaDeal } = await import("@/lib/ingestion/databaseSync");
    const result = await upsertLacunaDeal(sampleDeal());
    expect(result).toBe("deduped");
  });
});
