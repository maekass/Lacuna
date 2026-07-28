import { describe, expect, it } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import {
  computeHeadlineStats,
  computeHeadlineStatsFromDataset,
  countUniqueSourceCitations,
  formatDisclosedValueBillions,
  headlineStatsToTiles,
} from "@/lib/data/computeHeadlineStats";

describe("countUniqueSourceCitations", () => {
  it("counts distinct company and deal sources (success)", () => {
    const count = countUniqueSourceCitations(
      [
        { sources: ["SEC 8-K", "Press release"] },
        { sources: ["SEC 8-K", "Crunchbase"] },
      ],
      [{ source: "Press release" }, { source: "Reuters" }],
    );
    expect(count).toBe(4);
  });

  it("ignores blank sources (edge)", () => {
    expect(
      countUniqueSourceCitations(
        [{ sources: ["", "  "] }],
        [{ source: " " }],
      ),
    ).toBe(0);
  });
});

describe("computeHeadlineStats", () => {
  it("derives hub metrics from verified dataset slice (success)", () => {
    const stats = computeHeadlineStatsFromDataset(minimalVerifiedDataset);
    expect(stats.companiesInNetwork).toBe(2);
    expect(stats.verifiedDeals).toBe(1);
    expect(stats.disclosedValueBillionsLabel).toBe(
      formatDisclosedValueBillions(stats.disclosedValueMillions),
    );
    expect(stats.uniqueSourceCitations).toBeGreaterThan(0);
    expect(stats.lastUpdated).toBe(
      minimalVerifiedDataset.provenance.lastUpdated,
    );
  });

  it("maps stats to hub tiles (success)", () => {
    const stats = computeHeadlineStatsFromDataset(minimalVerifiedDataset);
    const tiles = headlineStatsToTiles(stats);
    expect(tiles).toHaveLength(4);
    expect(tiles[0]?.label).toBe("Companies in our network");
    expect(tiles[1]?.value).toBe(stats.verifiedDeals.toString());
    expect(tiles[2]?.label).toBe("WH disclosed value (completed)");
    expect(tiles[3]?.label).toBe("Public sources cited");
    expect(tiles[3]?.value).toBe(stats.uniqueSourceCitations.toString());
    expect(tiles[0]?.model.module).toContain("computeHeadlineStats");
    expect(stats.estimand).toBe("disclosed_only_observed_sum");
  });
});
