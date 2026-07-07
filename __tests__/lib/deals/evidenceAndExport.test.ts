import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { buildEvidenceLadder, FEATURED_DEAL_ID, getDealById } from "@/lib/deals";
import { formatDealBrief } from "@/lib/gamma/formatDealBrief";

describe("evidence ladder", () => {
  const dataset = getStaticVerifiedDataset();
  const deal = getDealById(dataset, FEATURED_DEAL_ID);

  it("classifies Biotheranostics sources", () => {
    expect(deal).not.toBeNull();
    const ladder = buildEvidenceLadder(deal!);
    expect(ladder.runs.length).toBeGreaterThan(0);
    expect(ladder.runs.some((r) => r.citation.includes("Hologic"))).toBe(
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
    expect(brief).toContain("Biotheranostics");
    expect(brief).toContain("Hologic");
    expect(brief).toContain("Evidence ladder");
    expect(brief).toContain("not investment advice");
  });
});
