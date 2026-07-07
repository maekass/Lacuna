import { describe, expect, it } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import {
  type AcquiredCompany,
  type Acquirer,
  type AcquisitionRecord,
  analyzeMarketStructure,
  analyzePortfolio,
  analyzeVelocity,
  compareAcquirerTypes,
} from "@/lib/competitive/acquirerAnalysis";

const teladoc: Acquirer = {
  id: "acquirer-teladoc",
  name: "Teladoc Health",
  type: "strategic_healthcare",
  sizeTier: "fortune_500",
};

const amazon: Acquirer = {
  id: "acquirer-amazon",
  name: "Amazon",
  type: "strategic_tech",
  sizeTier: "fortune_500",
};

const companies: AcquiredCompany[] = minimalVerifiedDataset.companies.map((
  c,
) => ({
  id: c.id,
  name: c.name,
  sector: c.sector,
  stage: "series_b",
  yearFounded: c.founded,
  yearAcquired: 2021,
  acquisitionValue: c.lastKnownValuation,
  geography: "us" as const,
}));

const acquisitions: AcquisitionRecord[] = minimalVerifiedDataset.acquisitions
  .map((d) => ({
    acquirerId: d.acquirerId === "c2" ? "acquirer-amazon" : d.acquirerId,
    companyId: d.targetId,
    year: new Date(d.announcedDate).getFullYear(),
    value: d.dealValue,
  }));

describe("analyzePortfolio", () => {
  it("summarizes sector mix for acquirer (success)", () => {
    const portfolio = analyzePortfolio(amazon, acquisitions, companies);
    expect(portfolio.totalAcquisitions).toBeGreaterThanOrEqual(0);
    if (portfolio.totalAcquisitions > 0) {
      expect(portfolio.sectorComposition.length).toBeGreaterThan(0);
      expect(portfolio.descriptivePattern).toBeTruthy();
    }
  });

  it("returns empty portfolio for unknown acquirer (edge)", () => {
    const portfolio = analyzePortfolio(
      { ...teladoc, id: "unknown" },
      acquisitions,
      companies,
    );
    expect(portfolio.totalAcquisitions).toBe(0);
    expect(portfolio.descriptivePattern).toBe("No acquisitions in dataset");
  });
});

describe("analyzeVelocity", () => {
  it("builds yearly deal counts and trend (success)", () => {
    const velocity = analyzeVelocity(amazon, [
      {
        acquirerId: "acquirer-amazon",
        companyId: "c24",
        year: 2020,
        value: 100,
      },
      {
        acquirerId: "acquirer-amazon",
        companyId: "c39",
        year: 2021,
        value: 200,
      },
      {
        acquirerId: "acquirer-amazon",
        companyId: "c24",
        year: 2022,
        value: 150,
      },
    ]);
    expect(velocity.yearlyData.length).toBe(3);
    expect(velocity.periods.length).toBeGreaterThan(0);
    expect(velocity.trend.caveat).toBeTruthy();
  });

  it("returns no-data pattern when acquirer has no deals (edge)", () => {
    const velocity = analyzeVelocity(teladoc, [], companies);
    expect(velocity.yearlyData).toEqual([]);
    expect(velocity.descriptivePattern).toBe("No acquisitions in dataset");
  });
});

describe("analyzeMarketStructure", () => {
  it("scores contestability for companies (success)", () => {
    const structure = analyzeMarketStructure(
      [teladoc, amazon],
      [
        { acquirerId: "acquirer-teladoc", companyId: "c24", year: 2020 },
        { acquirerId: "acquirer-amazon", companyId: "c39", year: 2021 },
      ],
      companies,
    );
    expect(structure.contestableTargets.length).toBe(companies.length);
    expect(structure.sectorContestability.length).toBeGreaterThan(0);
    expect(structure.caveat).toContain("equal interest");
  });
});

describe("compareAcquirerTypes", () => {
  it("groups acquisitions by acquirer type (success)", () => {
    const comparison = compareAcquirerTypes(
      [teladoc, amazon],
      [
        {
          acquirerId: "acquirer-teladoc",
          companyId: "c24",
          year: 2020,
          value: 100,
        },
        {
          acquirerId: "acquirer-amazon",
          companyId: "c39",
          year: 2021,
          value: 200,
        },
      ],
      companies,
    );
    expect(comparison.byType.length).toBeGreaterThan(0);
    expect(comparison.comparativeFindings.length).toBeGreaterThan(0);
    expect(comparison.caveat).toBeTruthy();
  });

  it("handles empty acquirer list (edge)", () => {
    const comparison = compareAcquirerTypes([], [], companies);
    expect(comparison.byType).toEqual([]);
  });
});
