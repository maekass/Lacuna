import { describe, expect, it } from "vitest";
import { getCachedStaticVerifiedDataset } from "@/lib/data/cachedDataset";
import { buildPromotionDraft } from "@/lib/ingestion/buildPromotionDraft";
import { applyPromotionDraft } from "@/lib/ingestion/promoteApprovedDeals";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";

function makeDeal(
  overrides: Partial<PendingDealRecord> = {},
): PendingDealRecord {
  return {
    id: 1,
    dealId: "sec-test-0001",
    secAccession: "0001193125-26-000001",
    acquirerName: "Example Health Corp",
    acquirerTicker: "EXH",
    acquirerCik: "123",
    targetName: "Example FemTech Co",
    announcedDate: "2026-01-15",
    closedDate: null,
    dealValueMillions: null,
    dealValueNote: null,
    dealStructure: "Acquisition",
    earnoutTerms: null,
    filingUrl: "https://www.sec.gov/Archives/edgar/data/example-8k.htm",
    filingDate: "2026-01-15",
    item201Excerpt: "women's health fertility platform acquisition",
    classificationConfidence: "high",
    classificationKeywords: ["fertility", "women's health"],
    womensHealthRelevant: true,
    status: "approved",
    sicCode: "2834",
    parseQuality: "full",
    ingestedAt: "2026-01-16T12:00:00.000Z",
    updatedAt: "2026-01-16T12:00:00.000Z",
    reviewNotes: "https://www.businesswire.com/news/home/example",
    mergedAcquisitionId: null,
    promotedAt: null,
    ...overrides,
  };
}

describe("buildPromotionDraft", () => {
  it("builds merge-ready rows for a new deal", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const draft = buildPromotionDraft({
      dataset,
      deal: makeDeal(),
    });

    expect(draft).not.toBeNull();
    expect(draft?.acquisition.id).toBe("deal60");
    expect(draft?.company?.name).toBe("Example FemTech Co");
    expect(draft?.acquirer?.name).toBe("Example Health Corp");
    expect(draft?.company?.sources).toHaveLength(2);
  });

  it("skips duplicate filing sources", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const existingSource = dataset.acquisitions[0]?.source;
    const draft = buildPromotionDraft({
      dataset,
      deal: makeDeal({ filingUrl: existingSource ?? "https://example.com" }),
    });
    expect(draft).toBeNull();
  });

  it("produces a dataset that passes validation", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const draft = buildPromotionDraft({
      dataset,
      deal: makeDeal(),
    });
    expect(draft).not.toBeNull();
    if (!draft) return;

    const next = applyPromotionDraft(dataset, draft);
    const report = validateVerifiedDataset(next);
    expect(report.ok).toBe(true);
    expect(next.acquisitions.some((row) => row.id === "deal60")).toBe(true);
  });
});
