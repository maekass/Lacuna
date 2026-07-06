import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  FEATURED_DEAL_ID,
  getDealById,
  getFeaturedDeal,
  listComparableDeals,
} from "@/lib/deals";

describe("deal spine", () => {
  const dataset = getStaticVerifiedDataset();

  it("resolves featured Modern Fertility deal by id", () => {
    const deal = getDealById(dataset, FEATURED_DEAL_ID);
    expect(deal).not.toBeNull();
    expect(deal?.acquisition.targetName).toBe("Modern Fertility");
    expect(deal?.acquisition.acquirerName).toBe("Ro");
    expect(deal?.target.sector).toBe("Fertility");
    expect(deal?.acquirer.id).toBe("acquirer-ro");
    expect(deal?.acquisition.dealValue).toBe(225);
    expect(deal?.acquisition.source).toContain("Fierce Healthcare");
  });

  it("getFeaturedDeal returns pinned demo deal", () => {
    const featured = getFeaturedDeal(dataset);
    expect(featured?.acquisition.id).toBe(FEATURED_DEAL_ID);
  });

  it("returns null for unknown deal id", () => {
    expect(getDealById(dataset, "deal-nonexistent")).toBeNull();
  });

  it("lists fertility-sector comparables within year window", () => {
    const comparables = listComparableDeals(dataset, FEATURED_DEAL_ID);
    expect(comparables.length).toBeGreaterThan(0);
    expect(comparables.every((c) => c.sector === "Fertility")).toBe(true);
    expect(comparables.every((c) => c.id !== FEATURED_DEAL_ID)).toBe(true);
  });

  it("returns empty comparables for missing deal", () => {
    expect(listComparableDeals(dataset, "missing")).toEqual([]);
  });
});
