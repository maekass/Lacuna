import { describe, expect, it } from "vitest";
import { getCachedStaticVerifiedDataset } from "@/lib/data/cachedDataset";
import {
  buildPromotionDraft,
  listPromotionMissingFields,
  type ReviewerPromotionFields,
} from "@/lib/ingestion/buildPromotionDraft";
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

function reviewerFields(
  overrides: Partial<ReviewerPromotionFields> = {},
): ReviewerPromotionFields {
  return {
    companySector: "Fertility",
    companyHq: "Boston, MA",
    companyFounded: 2018,
    acquirerSector: "Healthcare",
    acquirerHq: "San Francisco, CA",
    strategicRationale:
      "Added a fertility platform to Example Health's women's health offering.",
    ...overrides,
  };
}

describe("buildPromotionDraft", () => {
  it("builds merge-ready rows when reviewer fields are attested", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const { draft, missingFields } = buildPromotionDraft({
      dataset,
      deal: makeDeal(),
      reviewerFields: reviewerFields(),
    });

    expect(missingFields).toEqual([]);
    expect(draft).not.toBeNull();
    expect(draft?.acquisition.id).toBe("deal60");
    expect(draft?.company?.name).toBe("Example FemTech Co");
    expect(draft?.company?.sector).toBe("Fertility");
    expect(draft?.company?.hq).toBe("Boston, MA");
    expect(draft?.acquirer?.name).toBe("Example Health Corp");
    expect(draft?.acquirer?.hq).toBe("San Francisco, CA");
    expect(draft?.company?.sources).toHaveLength(2);
    expect(draft?.acquisition.strategicRationale).toBe(
      "Added a fertility platform to Example Health's women's health offering.",
    );
  });

  it("does not invent sector or HQ without reviewer attestation", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const missing = listPromotionMissingFields({
      dataset,
      deal: makeDeal({ reviewNotes: null }),
    });

    expect(missing).toContain("company.sector");
    expect(missing).toContain("company.hq");
    expect(missing).toContain("company.founded");
    expect(missing).toContain("company.sources.secondary");
    expect(missing).toContain("acquirer.sector");
    expect(missing).toContain("acquirer.hq");
    expect(missing).toContain("acquisition.strategicRationale");

    const { draft } = buildPromotionDraft({
      dataset,
      deal: makeDeal({ reviewNotes: null }),
    });
    expect(draft).toBeNull();
  });

  it("blocks keyword_only rows without reviewer profile fields", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const { draft, missingFields } = buildPromotionDraft({
      dataset,
      deal: makeDeal({
        parseQuality: "keyword_only",
        item201Excerpt: null,
        reviewNotes: null,
      }),
    });

    expect(draft).toBeNull();
    expect(missingFields).toContain("company.description");
    expect(missingFields).toContain("company.sector");
  });

  it("skips duplicate filing sources", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const existingSource = dataset.acquisitions[0]?.source;
    const { draft, missingFields } = buildPromotionDraft({
      dataset,
      deal: makeDeal({ filingUrl: existingSource ?? "https://example.com" }),
      reviewerFields: reviewerFields(),
    });
    expect(draft).toBeNull();
    expect(missingFields).toContain("duplicateSource");
  });

  it("produces a dataset that passes validation", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const { draft } = buildPromotionDraft({
      dataset,
      deal: makeDeal(),
      reviewerFields: reviewerFields(),
    });
    expect(draft).not.toBeNull();
    if (!draft) return;

    const next = applyPromotionDraft(dataset, draft);
    const report = validateVerifiedDataset(next);
    expect(report.ok).toBe(true);
    expect(next.acquisitions.some((row) => row.id === "deal60")).toBe(true);
  });

  it("uses reviewer-curated rationale, not the 8-K Item 2.01 excerpt", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const excerpt = "women's health fertility platform acquisition";
    const curated =
      "Added a fertility platform to Example Health's women's health offering.";
    const { draft, missingFields } = buildPromotionDraft({
      dataset,
      deal: makeDeal({ item201Excerpt: excerpt }),
      reviewerFields: reviewerFields({ strategicRationale: curated }),
    });

    expect(missingFields).toEqual([]);
    expect(draft?.acquisition.strategicRationale).toBe(curated);
    expect(draft?.acquisition.strategicRationale).not.toBe(excerpt);
  });

  it("does not promote an 8-K excerpt as strategicRationale", async () => {
    const dataset = await getCachedStaticVerifiedDataset();
    const excerpt = "women's health fertility platform acquisition";
    const { draft, missingFields } = buildPromotionDraft({
      dataset,
      deal: makeDeal({ item201Excerpt: excerpt }),
      reviewerFields: reviewerFields({ strategicRationale: null }),
    });

    expect(draft).toBeNull();
    expect(missingFields).toContain("acquisition.strategicRationale");
  });
});
