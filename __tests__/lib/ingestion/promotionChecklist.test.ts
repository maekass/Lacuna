import { describe, expect, it } from "vitest";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";
import {
  allChecksPassed,
  getPromotionCheckItems,
  initialCheckState,
} from "@/lib/ingestion/promotionChecklist";

function mockDeal(overrides: Partial<PendingDealRecord> = {}): PendingDealRecord {
  return {
    id: 1,
    dealId: "test-deal",
    secAccession: "0001",
    acquirerName: "Acquirer Inc",
    acquirerTicker: "ACQ",
    acquirerCik: "123",
    targetName: "Target Co",
    announcedDate: "2024-01-01",
    closedDate: null,
    dealValueMillions: null,
    dealValueNote: null,
    dealStructure: null,
    earnoutTerms: null,
    filingUrl: "https://www.sec.gov/Archives/edgar/data/123/8-k.htm",
    filingDate: "2024-01-01",
    item201Excerpt: "Item 2.01 completion of acquisition",
    classificationConfidence: "high",
    classificationKeywords: ["fertility"],
    womensHealthRelevant: true,
    status: "pending_review",
    sicCode: null,
    parseQuality: "good",
    ingestedAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    reviewNotes: null,
    mergedAcquisitionId: null,
    promotedAt: null,
    ...overrides,
  };
}

describe("promotion checklist", () => {
  it("auto-passes primary and WH gates for SEC WH candidate", () => {
    const items = getPromotionCheckItems(mockDeal());
    const state = initialCheckState(items);
    expect(state.primary).toBe(true);
    expect(state["wh-scope"]).toBe(true);
    expect(state.secondary).toBe(false);
  });

  it("requires manual secondary corroboration", () => {
    const items = getPromotionCheckItems(mockDeal());
    const state = initialCheckState(items);
    expect(allChecksPassed(state, items)).toBe(false);
    state.secondary = true;
    expect(allChecksPassed(state, items)).toBe(true);
  });
});
