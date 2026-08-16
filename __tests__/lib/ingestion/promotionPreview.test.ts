import { describe, expect, it } from "vitest";
import { getCachedStaticVerifiedDataset } from "@/lib/data/cachedDataset";
import { parseReviewerPromotionBody } from "@/lib/ingestion/parseReviewerPromotionBody";
import { buildPromotionPreview } from "@/lib/ingestion/promotionPreview";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";
import { buildStagingEvidenceLadder } from "@/lib/ingestion/stagingEvidenceLadder";

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
    classificationKeywords: ["fertility"],
    womensHealthRelevant: true,
    status: "pending_review",
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

describe("parseReviewerPromotionBody", () => {
  it("parses nested reviewerFields", () => {
    const parsed = parseReviewerPromotionBody({
      reviewerFields: {
        companySector: "Fertility",
        companyHq: "Boston, MA",
        companyFounded: 2018,
        strategicRationale:
          "Added a fertility platform to Example Health's women's health offering.",
      },
    });
    expect(parsed?.reviewerFields.companySector).toBe("Fertility");
    expect(parsed?.reviewerFields.companyFounded).toBe(2018);
    expect(parsed?.reviewerFields.strategicRationale).toContain(
      "fertility platform",
    );
  });
});

describe("buildStagingEvidenceLadder", () => {
  it("marks staging rows as not verified", () => {
    const ladder = buildStagingEvidenceLadder(makeDeal());
    expect(ladder.runs[0]?.tier).toBe("primary");
    expect(ladder.limitations.some((l) => l.includes("Staging candidate")))
      .toBe(
        true,
      );
  });
});

describe("buildPromotionPreview", () => {
  it("returns missing fields until reviewer attests profile", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const preview = await buildPromotionPreview({
      dataset,
      deal: makeDeal({ reviewNotes: null }),
      reviewerFields: {},
    });
    expect(preview.ready).toBe(false);
    expect(preview.missingFields).toContain("company.sector");
    expect(preview.missingFields).toContain("acquisition.strategicRationale");
    expect(preview.diff).toBeNull();
  });

  it("builds diff when reviewer fields are complete", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const preview = await buildPromotionPreview({
      dataset,
      deal: makeDeal(),
      reviewerFields: {
        companySector: "Fertility",
        companyHq: "Boston, MA",
        companyFounded: 2018,
        acquirerSector: "Healthcare",
        acquirerHq: "San Francisco, CA",
        secondarySourceUrl: "https://www.businesswire.com/news/home/example",
        strategicRationale:
          "Added a fertility platform to Example Health's women's health offering.",
      },
    });
    expect(preview.ready).toBe(true);
    expect(preview.diff?.acquisitions.action).toBe("add");
    expect(preview.diff?.companies?.action).toBe("add");
    expect(preview.draft?.acquisition.strategicRationale).toContain(
      "fertility platform",
    );
    expect(preview.draft?.acquisition.strategicRationale).not.toBe(
      "women's health fertility platform acquisition",
    );
  });
});
