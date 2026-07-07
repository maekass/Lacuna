import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";

const mockQuery = vi.fn();
const mockGetVerifiedDataset = vi.fn();

vi.mock("@/lib/data/dbClient", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock("@/lib/data/datasetProvider", () => ({
  getVerifiedDataset: () => mockGetVerifiedDataset(),
}));

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
    targetName: "FemHealth Co",
    announcedDate: "2024-03-16",
    closedDate: null,
    dealValueMillions: null,
    dealValueNote: null,
    dealStructure: null,
    earnoutTerms: null,
    filingUrl: "https://www.sec.gov/example-filing",
    filingDate: "2024-03-16",
    item201Excerpt: null,
    classificationConfidence: "medium",
    classificationKeywords: ["fertility"],
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

describe("detectPendingDealDuplicates", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetVerifiedDataset.mockReset();
    mockGetVerifiedDataset.mockResolvedValue({
      companies: [],
      acquirers: [],
      acquisitions: [],
    });
    mockQuery.mockResolvedValue([]);
  });

  it("flags verified source URL match", async () => {
    mockGetVerifiedDataset.mockResolvedValue({
      companies: [],
      acquirers: [],
      acquisitions: [{
        id: "deal42",
        targetId: "c1",
        acquirerId: "a1",
        targetName: "Other",
        acquirerName: "BigCo",
        announcedDate: "2020-01-01",
        dealType: "Acquisition",
        source: "https://www.sec.gov/example-filing",
        strategicRationale: "test",
      }],
    });

    const { detectPendingDealDuplicates } = await import(
      "@/lib/ingestion/detectPendingDealDuplicates"
    );
    const matches = await detectPendingDealDuplicates(mockDeal());

    expect(matches.some((m) => m.kind === "verified_source_url")).toBe(true);
    expect(matches[0]?.href).toBe("/deals/deal42");
  });

  it("flags pending accession collision", async () => {
    mockQuery.mockResolvedValue([{
      deal_id: "sec-999-other",
      sec_accession: "0001193125-24-000001",
      target_name: "Other Target",
      acquirer_name: "Other Acquirer",
      announced_date: "2024-01-01",
    }]);

    const { detectPendingDealDuplicates } = await import(
      "@/lib/ingestion/detectPendingDealDuplicates"
    );
    const matches = await detectPendingDealDuplicates(mockDeal());

    expect(matches.some((m) => m.kind === "pending_accession")).toBe(true);
    expect(matches.find((m) => m.kind === "pending_accession")?.dealId).toBe(
      "sec-999-other",
    );
  });
});
