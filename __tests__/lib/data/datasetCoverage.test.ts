import { describe, expect, it } from "vitest";
import {
  formatTierCoverageDefinition,
  formatTierCoverageLabel,
  formatVerifiedGrowthLabel,
  pluralize,
} from "@/lib/data/datasetCoverage";

describe("datasetCoverage", () => {
  it("pluralize handles singular and plural", () => {
    expect(pluralize(1, "deal")).toBe("deal");
    expect(pluralize(2, "deal")).toBe("deals");
  });

  it("formatTierCoverageLabel separates Tier 1 and Tier 2", () => {
    expect(
      formatTierCoverageLabel({
        verifiedDealCount: 58,
        stagingCandidateCount: 4,
      }),
    ).toBe("58 verified deals · 4 staging candidates");
  });

  it("formatVerifiedGrowthLabel reports snapshot delta", () => {
    expect(
      formatVerifiedGrowthLabel({
        added: 2,
        priorSnapshotDate: "2026-07-02",
        currentLastUpdated: "2026-07-08",
        currentDealCount: 61,
      }),
    ).toBe("+2 verified deals since 2026-07-02");
  });

  it("formatTierCoverageDefinition names tiers explicitly", () => {
    expect(
      formatTierCoverageDefinition({
        verifiedDealCount: 58,
        stagingCandidateCount: 0,
      }),
    ).toContain("Tier 1");
    expect(
      formatTierCoverageDefinition({
        verifiedDealCount: 58,
        stagingCandidateCount: null,
      }, { metricsUnavailable: true }),
    ).toContain("unavailable without Postgres");
  });
});
