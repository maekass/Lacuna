import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";

const mockDetectDuplicates = vi.fn();
const mockResolveUrl = vi.fn();
const mockFetchFilingText = vi.fn();
const mockApplyEnrichment = vi.fn();
const mockSecRateLimitPause = vi.fn();
const mockGetPendingDealByDealId = vi.fn();

vi.mock("@/lib/ingestion/detectPendingDealDuplicates", () => ({
  detectPendingDealDuplicates: (...args: unknown[]) =>
    mockDetectDuplicates(...args),
}));

vi.mock("@/lib/ingestion/secEdgarConnector", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/ingestion/secEdgarConnector")
  >();
  return {
    ...actual,
    resolvePrimaryFilingDocumentUrl: (...args: unknown[]) =>
      mockResolveUrl(...args),
    fetchFilingText: (...args: unknown[]) => mockFetchFilingText(...args),
    secRateLimitPause: (...args: unknown[]) => mockSecRateLimitPause(...args),
  };
});

vi.mock("@/lib/ingestion/pendingDeals", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/ingestion/pendingDeals")
  >();
  return {
    ...actual,
    applyPendingDealEnrichment: (...args: unknown[]) =>
      mockApplyEnrichment(...args),
    getPendingDealByDealId: (...args: unknown[]) =>
      mockGetPendingDealByDealId(...args),
  };
});

function mockDeal(
  overrides: Partial<PendingDealRecord> = {},
): PendingDealRecord {
  return {
    id: 1,
    dealId: "sec-123-0001",
    secAccession: "0001193125-24-000001",
    acquirerName: "Acquirer Inc",
    acquirerTicker: "ACQ",
    acquirerCik: "1234567",
    targetName: null,
    announcedDate: "2024-03-16",
    closedDate: null,
    dealValueMillions: null,
    dealValueNote: null,
    dealStructure: null,
    earnoutTerms: null,
    filingUrl: "https://www.sec.gov/index.htm",
    filingDate: "2024-03-16",
    item201Excerpt: "EFTS keyword hit",
    classificationConfidence: "medium",
    classificationKeywords: ["efts_wh_query"],
    womensHealthRelevant: true,
    status: "pending",
    sicCode: "2834",
    parseQuality: "keyword_only",
    ingestedAt: "2024-03-17T12:00:00.000Z",
    updatedAt: "2024-03-17T12:00:00.000Z",
    reviewNotes: null,
    mergedAcquisitionId: null,
    promotedAt: null,
    ...overrides,
  };
}

const ITEM_201_TEXT = `
  Item 2.01 Completion of Acquisition or Disposition of Assets.
  On March 15, 2024 the Company consummated the merger pursuant to the Merger Agreement
  and acquired all outstanding shares of FemHealth Labs, a women's fertility platform,
  for aggregate consideration of $125 million in cash.
  Item 2.02 Results of Operations.
`;

describe("enrichPendingDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetectDuplicates.mockResolvedValue([]);
    mockResolveUrl.mockResolvedValue("https://www.sec.gov/example/d8k.htm");
    mockFetchFilingText.mockResolvedValue(ITEM_201_TEXT);
    mockSecRateLimitPause.mockResolvedValue(undefined);
    mockGetPendingDealByDealId.mockResolvedValue(mockDeal());
  });

  it("skips full-parse rows without SEC fetch", async () => {
    const { enrichPendingDeal } = await import(
      "@/lib/ingestion/enrichPendingDeal"
    );
    const result = await enrichPendingDeal(
      mockDeal({ parseQuality: "full", targetName: "FemHealth Labs" }),
    );

    expect(result.skipped).toBe(true);
    expect(mockResolveUrl).not.toHaveBeenCalled();
    expect(mockApplyEnrichment).not.toHaveBeenCalled();
  });

  it("enriches keyword-only row and never changes status via apply", async () => {
    const enriched = mockDeal({
      targetName: "FemHealth Labs",
      parseQuality: "full",
      dealValueMillions: 125,
    });
    mockApplyEnrichment.mockResolvedValue(enriched);

    const { enrichPendingDeal } = await import(
      "@/lib/ingestion/enrichPendingDeal"
    );
    const result = await enrichPendingDeal(mockDeal());

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
    expect(mockFetchFilingText).toHaveBeenCalled();
    expect(mockApplyEnrichment).toHaveBeenCalledWith(
      "sec-123-0001",
      expect.objectContaining({
        targetName: expect.any(String),
        parseQuality: "full",
      }),
    );
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.after.status).toBe("pending");
  });

  it("batch reports the reason each deal failed (error)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockResolveUrl.mockRejectedValue(new Error("SEC 429 throttled"));

    const { enrichKeywordOnlyDeals } = await import(
      "@/lib/ingestion/enrichPendingDeal"
    );
    const batch = await enrichKeywordOnlyDeals(["sec-123-0001"]);

    expect(batch.failed).toBe(1);
    expect(batch.failures).toEqual([
      { dealId: "sec-123-0001", error: "SEC 429 throttled" },
    ]);
  });

  it("never auto-approves — apply input has no status field", async () => {
    mockApplyEnrichment.mockImplementation(async (_id, input) => {
      expect(input).not.toHaveProperty("status");
      return mockDeal({
        targetName: "FemHealth Labs",
        parseQuality: "partial",
      });
    });

    const { enrichPendingDeal } = await import(
      "@/lib/ingestion/enrichPendingDeal"
    );
    await enrichPendingDeal(mockDeal());
  });
});
