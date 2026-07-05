import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPoolQuery = vi.fn();

vi.mock("pg", () => ({
  Pool: class MockPool {
    query = mockPoolQuery;
  },
}));

describe("pendingDeals", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/lacuna");
    vi.stubEnv("PGSSLMODE", "disable");
  });

  it("listPendingDeals returns mapped rows and meta", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          deal_id: "sec-123-0001",
          sec_accession: "0001193125-24-000001",
          acquirer_name: "Acquirer Inc",
          acquirer_ticker: "ACQ",
          acquirer_cik: "123",
          target_name: "FemHealth Co",
          announced_date: "2024-03-16",
          closed_date: null,
          deal_value_millions: "225",
          deal_value_note: null,
          deal_structure: "Cash",
          earnout_terms: null,
          filing_url: "https://www.sec.gov/example",
          filing_date: "2024-03-16",
          item_201_excerpt: "women's health",
          classification_confidence: "high",
          classification_keywords: ["fertility"],
          womens_health_relevant: true,
          status: "pending",
          sic_code: "2834",
          parse_quality: "full",
          ingested_at: "2024-03-17T12:00:00.000Z",
          updated_at: "2024-03-17T12:00:00.000Z",
          review_notes: null,
          total_count: "3",
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const { listPendingDeals } = await import("@/lib/ingestion/pendingDeals");
    const page = await listPendingDeals({ limit: 10, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.dealId).toBe("sec-123-0001");
    expect(page.items[0]?.dealValueMillions).toBe(225);
    expect(page.meta.total).toBe(3);
    expect(page.meta.reviewableTotal).toBe(3);
    expect(mockPoolQuery.mock.calls[0]?.[0]).toContain("FROM lacuna_deals");
  });

  it("countPendingDeals returns queue size", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ count: "7" }] });

    const { countPendingDeals } = await import("@/lib/ingestion/pendingDeals");
    await expect(countPendingDeals()).resolves.toBe(7);
  });

  it("updatePendingDeal updates status and notes", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        deal_id: "sec-123-0001",
        sec_accession: "0001193125-24-000001",
        acquirer_name: "Acquirer Inc",
        acquirer_ticker: "ACQ",
        acquirer_cik: "123",
        target_name: "FemHealth Co",
        announced_date: "2024-03-16",
        closed_date: null,
        deal_value_millions: "225",
        deal_value_note: null,
        deal_structure: "Cash",
        earnout_terms: null,
        filing_url: "https://www.sec.gov/example",
        filing_date: "2024-03-16",
        item_201_excerpt: "women's health",
        classification_confidence: "high",
        classification_keywords: ["fertility"],
        womens_health_relevant: true,
        status: "approved",
        sic_code: "2834",
        parse_quality: "full",
        ingested_at: "2024-03-17T12:00:00.000Z",
        updated_at: "2024-03-18T12:00:00.000Z",
        review_notes: "Dual sources verified",
      }],
    });

    const { updatePendingDeal } = await import("@/lib/ingestion/pendingDeals");
    const updated = await updatePendingDeal("sec-123-0001", {
      status: "approved",
      reviewNotes: "Dual sources verified",
    });

    expect(updated?.status).toBe("approved");
    expect(updated?.reviewNotes).toBe("Dual sources verified");
    expect(mockPoolQuery.mock.calls[0]?.[0]).toContain("UPDATE lacuna_deals");
  });
});
