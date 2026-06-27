import { describe, expect, it } from "vitest";
import {
  ENDOMETRIOSIS_COVERAGE,
  getEndometriosisCoverageStats,
} from "@/lib/data/endometriosisCoverage";

describe("endometriosis coverage manifest", () => {
  it("loads computed manifest with expected screening stats", () => {
    const stats = getEndometriosisCoverageStats();
    expect(ENDOMETRIOSIS_COVERAGE.therapeuticAreaId).toBe("endometriosis");
    expect(stats.crunchbaseSearchTotal).toBe(409);
    expect(stats.includedCount).toBeGreaterThan(0);
    expect(stats.includedCount).toBeGreaterThanOrEqual(38);
  });

  it("includes only companies with funding or fundraising status", () => {
    for (const company of ENDOMETRIOSIS_COVERAGE.companies) {
      const hasFunding = Boolean(
        company.fundingStatus?.trim() ||
          company.fundraisingStatus?.trim() ||
          company.lastFundingType?.trim() ||
          (company.totalFundingM != null && company.totalFundingM > 0),
      );
      expect(hasFunding).toBe(true);
    }
  });

  it("excludes nonprofit names from included list", () => {
    const names = ENDOMETRIOSIS_COVERAGE.companies.map((c) =>
      c.name.toLowerCase()
    );
    expect(names.some((n) => n.includes("association"))).toBe(false);
    expect(names.some((n) => n.includes("foundation"))).toBe(false);
    expect(names.some((n) => n.includes("network canada"))).toBe(false);
  });

  it("flags verified dataset overlap for Gesynta Pharma", () => {
    const gesynta = ENDOMETRIOSIS_COVERAGE.companies.find((c) =>
      c.name === "Gesynta Pharma"
    );
    expect(gesynta?.inVerifiedDataset).toBe(true);
    expect(gesynta?.verifiedDatasetId).toBe("c86");
  });
});
