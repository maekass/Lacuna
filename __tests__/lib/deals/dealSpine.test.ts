import { describe, expect, it } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import {
  FEATURED_DEAL_ID,
  getDealById,
  getFeaturedDeal,
  listComparableDeals,
  listComparableDealSets,
} from "@/lib/deals";

describe("deal spine", () => {
  const dataset = getStaticVerifiedDataset();

  it("resolves featured Biotheranostics deal by id", () => {
    const deal = getDealById(dataset, FEATURED_DEAL_ID);
    expect(deal).not.toBeNull();
    expect(deal?.acquisition.targetName).toBe("Biotheranostics");
    expect(deal?.acquisition.acquirerName).toBe("Hologic");
    expect(deal?.target.sector).toBe("Breast Health");
    expect(deal?.acquirer.id).toBe("acquirer-hologic");
    expect(deal?.acquisition.dealValue).toBe(230);
    expect(deal?.acquisition.source).toContain("Hologic");
  });

  it("getFeaturedDeal returns pinned demo deal", () => {
    const featured = getFeaturedDeal(dataset);
    expect(featured?.acquisition.id).toBe(FEATURED_DEAL_ID);
  });

  it("returns null for unknown deal id", () => {
    expect(getDealById(dataset, "deal-nonexistent")).toBeNull();
  });

  it("lists valuation peers in-band and excludes mega-cap adjacency", () => {
    const { peers, adjacencyNotPeers } = listComparableDealSets(
      dataset,
      FEATURED_DEAL_ID,
    );
    expect(peers.length).toBeGreaterThan(0);
    expect(peers.every((c) => c.sector === "Breast Health")).toBe(true);
    expect(peers.every((c) => c.id !== FEATURED_DEAL_ID)).toBe(true);
    expect(peers.some((c) => c.targetName === "Immunomedics")).toBe(false);
    expect(peers.some((c) => c.targetName === "Endomagnetics")).toBe(true);
    expect(
      adjacencyNotPeers.some((c) => c.targetName === "Immunomedics"),
    ).toBe(true);
    const immuno = adjacencyNotPeers.find((c) =>
      c.targetName === "Immunomedics"
    );
    expect(immuno?.valueRatio).toBeGreaterThan(4);
  });

  it("returns empty comparables for missing deal", () => {
    expect(listComparableDeals(dataset, "missing")).toEqual([]);
  });
});
