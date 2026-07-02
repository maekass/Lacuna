import { describe, expect, it } from "vitest";
import {
  computeRhCapitalPortfolioSummary,
  RH_CAPITAL_PORTFOLIO,
  RH_CAPITAL_PORTFOLIO_NAMES,
} from "@/data/rhCapitalPortfolio";

describe("rhCapitalPortfolio", () => {
  it("lists 24 RH Capital portfolio companies", () => {
    expect(RH_CAPITAL_PORTFOLIO).toHaveLength(24);
    expect(RH_CAPITAL_PORTFOLIO_NAMES).toHaveLength(24);
  });

  it("maps every portfolio name to a dataset company id", () => {
    for (const company of RH_CAPITAL_PORTFOLIO) {
      expect(company.datasetCompanyId).toMatch(/^c\d+$/);
    }
  });

  it("documents Ovia and Nurx exits without invented deal values", () => {
    const ovia = RH_CAPITAL_PORTFOLIO.find((c) => c.name === "Ovia Health");
    const nurx = RH_CAPITAL_PORTFOLIO.find((c) => c.name === "Nurx");
    expect(ovia?.exit?.acquirer).toBe("LabCorp");
    expect(ovia?.exit?.dealValueM).toBeNull();
    expect(nurx?.exit?.acquirer).toContain("Thirty Madison");
    expect(nurx?.exit?.dealValueM).toBeNull();
    expect(nurx?.lastKnownValuationM).toBe(322.5);
  });

  it("aggregates cited funding only from non-null totals", () => {
    const summary = computeRhCapitalPortfolioSummary();
    expect(summary.companyCount).toBe(24);
    expect(summary.withCitedFunding).toBeGreaterThan(10);
    expect(summary.citedFundingTotalM).toBeGreaterThan(300);
    expect(summary.exitCount).toBe(2);
    expect(summary.exitsWithDisclosedValue).toBe(0);
  });
});
