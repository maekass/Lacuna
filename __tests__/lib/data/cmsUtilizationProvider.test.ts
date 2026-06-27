import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNUAL_USES_PER_CODE,
  estimateAnnualReimbursementFromCodes,
  getPortfolioMedianAnnualUsesPerCode,
  getSectorAvgServicesPerCode,
  resolveAnnualUsesPerCode,
} from "@/lib/data/cmsUtilizationProvider";

describe("cmsUtilizationProvider", () => {
  it("returns portfolio median from computed CMS sectors (success)", () => {
    const median = getPortfolioMedianAnnualUsesPerCode();
    expect(median).toBeGreaterThan(100);
    expect(DEFAULT_ANNUAL_USES_PER_CODE).toBe(median);
  });

  it("returns sector average for known CPT code (success)", () => {
    const resolved = resolveAnnualUsesPerCode("58321");
    expect(resolved.source).toBe("cpt");
    expect(resolved.annualUses).toBe(15000);
  });

  it("returns sector-level lookup for fertility (success)", () => {
    const sectorUses = getSectorAvgServicesPerCode("fertility");
    expect(sectorUses).toBe(14375);
  });

  it("falls back to portfolio median for unknown CPT (edge)", () => {
    const resolved = resolveAnnualUsesPerCode("99999");
    expect(resolved.source).toBe("portfolio_median");
    expect(resolved.annualUses).toBe(getPortfolioMedianAnnualUsesPerCode());
  });

  it("estimates annual reimbursement from rate × utilization (success)", () => {
    const total = estimateAnnualReimbursementFromCodes([
      { code: "58321", medicareRate: 185 },
    ]);
    expect(total).toBe(15000 * 185);
  });
});
