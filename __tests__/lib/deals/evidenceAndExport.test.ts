import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { buildEvidenceLadder, FEATURED_DEAL_ID, getDealById } from "@/lib/deals";
import { formatDealBrief } from "@/lib/gamma/formatDealBrief";

describe("evidence ladder", () => {
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, FEATURED_DEAL_ID);

  it("classifies Modern Fertility sources", () => {
    expect(deal).not.toBeNull();
    const ladder = buildEvidenceLadder(deal!);
    expect(ladder.runs.length).toBeGreaterThan(0);
    expect(ladder.runs.some((r) => r.citation.includes("Fierce Healthcare"))).toBe(
      true,
    );
    expect(ladder.priceDisclosed).toBe(true);
  });
});

describe("formatDealBrief", () => {
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, FEATURED_DEAL_ID);

  it("includes source citation in markdown output", () => {
    expect(deal).not.toBeNull();
    const brief = formatDealBrief(deal!);
    expect(brief).toContain("Modern Fertility");
    expect(brief).toContain("Fierce Healthcare");
    expect(brief).toContain("Evidence ladder");
    expect(brief).toContain("not investment advice");
  });
});
