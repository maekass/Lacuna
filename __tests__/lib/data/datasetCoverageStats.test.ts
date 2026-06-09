import { describe, expect, it } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import {
  computeDisclosureStats,
  computeEffectiveNBadges,
  computeSectorDealCounts,
  computeYearDealCounts,
  type CoverageDatasetInput,
} from "@/lib/data/datasetCoverageStats";

const emptyDataset: CoverageDatasetInput = {
  companies: [],
  acquisitions: [],
  acquirers: [],
};

describe("computeDisclosureStats", () => {
  it("computes rates for verified slice (success)", () => {
    const stats = computeDisclosureStats(minimalVerifiedDataset);
    expect(stats.dealsTotal).toBe(1);
    expect(stats.dealsDisclosed).toBe(1);
    expect(stats.dealsUndisclosed).toBe(0);
    expect(stats.disclosureRate).toBe(1);
    expect(stats.companiesTotal).toBe(2);
    expect(stats.companiesWithValuation).toBeGreaterThan(0);
  });

  it("returns zero rates for empty dataset (edge)", () => {
    const stats = computeDisclosureStats(emptyDataset);
    expect(stats.dealsTotal).toBe(0);
    expect(stats.disclosureRate).toBe(0);
    expect(stats.valuationRate).toBe(0);
  });

  it("counts dealValueNote with whitespace only as absent (edge)", () => {
    const dataset: CoverageDatasetInput = {
      ...minimalVerifiedDataset,
      acquisitions: [
        {
          targetId: "c1",
          acquirerId: "c2",
          announcedDate: "2021-05-19",
          dealValueNote: "   ",
        },
      ],
    };
    const stats = computeDisclosureStats(dataset);
    expect(stats.dealsWithValueNote).toBe(0);
    expect(stats.dealsDisclosed).toBe(0);
  });
});

describe("computeSectorDealCounts", () => {
  it("groups deals by target company sector (success)", () => {
    const sectors = computeSectorDealCounts(minimalVerifiedDataset);
    expect(sectors.some((s) => s.sector === "Fertility" && s.deals === 1)).toBe(
      true,
    );
    expect(sectors.every((s) => s.companies >= 0)).toBe(true);
  });

  it("returns empty array when no companies (edge)", () => {
    expect(computeSectorDealCounts(emptyDataset)).toEqual([]);
  });
});

describe("computeYearDealCounts", () => {
  it("aggregates deals by announced year (success)", () => {
    const years = computeYearDealCounts(minimalVerifiedDataset);
    expect(years).toEqual([{ year: 2021, count: 1, disclosedPrices: 1 }]);
  });

  it("returns empty array with no acquisitions (edge)", () => {
    expect(computeYearDealCounts(emptyDataset)).toEqual([]);
  });
});

describe("computeEffectiveNBadges", () => {
  it("assigns insufficient tiers for small verified slice (success)", () => {
    const badges = computeEffectiveNBadges(minimalVerifiedDataset);
    expect(badges.network.tier).toBe("insufficient");
    expect(badges.competitive.tier).toBe("insufficient");
    expect(badges.priceAnalytics.tier).toBe("insufficient");
    expect(badges.dealVelocity.tier).toBe("insufficient");
    expect(badges.dealVelocity.n).toBe(1);
  });

  it("promotes network tier at deal-count boundary (edge)", () => {
    const acquisitions = Array.from({ length: 10 }, (_, i) => ({
      targetId: "c1",
      acquirerId: "a1",
      announcedDate: `2020-01-${String(i + 1).padStart(2, "0")}`,
      dealValue: 100,
    }));
    const badges = computeEffectiveNBadges({
      companies: [{ id: "c1", sector: "Fertility" }],
      acquisitions,
      acquirers: [{ id: "a1" }],
    });
    expect(badges.network.tier).toBe("medium");
    expect(badges.network.n).toBe(10);
  });
});
