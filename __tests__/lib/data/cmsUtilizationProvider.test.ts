import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNUAL_USES_PER_CODE,
  estimateAnnualReimbursementFromCodes,
  getPortfolioMedianAnnualUsesPerCode,
  getSectorAvgServicesPerCode,
  resolveAnnualUsesPerCode,
} from "@/lib/data/cmsUtilizationProvider";

describe("cmsUtilizationProvider", () => {
  it("returns zero portfolio median when CMS utilization is withheld (success)", () => {
    expect(getPortfolioMedianAnnualUsesPerCode()).toBe(0);
    expect(DEFAULT_ANNUAL_USES_PER_CODE).toBe(0);
  });

  it("withholds known CPT codes until a verified aggregate exists (edge)", () => {
    const resolved = resolveAnnualUsesPerCode("58321");
    expect(resolved.source).toBe("withheld");
    expect(resolved.annualUses).toBe(0);
  });

  it("returns null sector averages when utilization is withheld (edge)", () => {
    expect(getSectorAvgServicesPerCode("fertility")).toBeNull();
  });

  it("does not feed withheld CMS utilization into decision reimbursement", () => {
    const total = estimateAnnualReimbursementFromCodes([
      { code: "58321", medicareRate: 185 },
    ]);
    expect(total).toBe(0);
  });
});
