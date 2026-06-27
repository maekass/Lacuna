import { describe, expect, it } from "vitest";
import {
  getCompanyGrowthRate,
  getSectorGrowthRate,
  resolveGrowthRate,
} from "@/lib/data/growthRateProvider";

describe("growthRateProvider", () => {
  it("returns company-specific CAGR when companyId is known (success)", () => {
    const rate = getCompanyGrowthRate("c1");
    expect(rate).toBe(9.8);
  });

  it("returns sector median for fertility slug (success)", () => {
    const rate = getSectorGrowthRate("fertility");
    expect(rate).toBe(9.8);
  });

  it("maps digital_therapeutics to Digital Health sector median (success)", () => {
    const resolved = resolveGrowthRate({ sector: "digital_therapeutics" });
    expect(resolved.source).toBe("sector");
    expect(resolved.growthRate).toBe(52.5);
  });

  it("prefers company CAGR over sector when both available (success)", () => {
    const resolved = resolveGrowthRate({ companyId: "c1", sector: "Fertility" });
    expect(resolved.source).toBe("company");
    expect(resolved.growthRate).toBe(9.8);
    expect(resolved.confidence).toBe("high");
  });

  it("falls back to sector when company has no CAGR (edge)", () => {
    const resolved = resolveGrowthRate({
      companyId: "missing-id",
      sector: "Mental Health",
    });
    expect(resolved.source).toBe("sector");
    expect(resolved.growthRate).toBe(15.1);
  });
});
