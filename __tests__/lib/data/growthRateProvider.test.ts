import { describe, expect, it } from "vitest";
import {
  getCompanyGrowthRate,
  getSectorGrowthRate,
  resolveGrowthRate,
} from "@/lib/data/growthRateProvider";

describe("growthRateProvider MeshIC withholding", () => {
  it("withholds company growth when no comparable SEC revenue series is committed", () => {
    expect(getCompanyGrowthRate("c31")).toBeNull();
  });

  it("withholds sector growth when no calibrated sector revenue median is committed", () => {
    expect(getSectorGrowthRate("fertility")).toBeNull();
  });

  it("does not invent a portfolio fallback when operating growth is unavailable", () => {
    const resolved = resolveGrowthRate({
      companyId: "missing-id",
      sector: "Mental Health",
    });
    expect(resolved.source).toBe("withheld");
    expect(resolved.confidence).toBe("none");
    expect(Number.isNaN(resolved.growthRate)).toBe(true);
  });
});
