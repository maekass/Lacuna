import { describe, expect, it } from "vitest";
import {
  ENDOMETRIAL_CANCER_COVERAGE,
  getEndometrialCancerCoverageStats,
} from "@/lib/data/endometrialCancerCoverage";

describe("endometrial cancer coverage manifest", () => {
  it("loads computed manifest with expected therapeutic area id", () => {
    const stats = getEndometrialCancerCoverageStats();
    expect(ENDOMETRIAL_CANCER_COVERAGE.therapeuticAreaId).toBe(
      "endometrial-cancer",
    );
    expect(stats.includedCount).toBeGreaterThan(0);
  });

  it("includes only companies with funding or fundraising status", () => {
    for (const company of ENDOMETRIAL_CANCER_COVERAGE.companies) {
      const hasFunding = Boolean(
        company.fundingStatus?.trim() ||
          company.fundraisingStatus?.trim() ||
          company.lastFundingType?.trim() ||
          (company.totalFundingM != null && company.totalFundingM > 0),
      );
      expect(hasFunding).toBe(true);
    }
  });

  it("includes core diagnostics and devices from batch 2", () => {
    const names = ENDOMETRIAL_CANCER_COVERAGE.companies.map((c) => c.name);
    expect(names).toContain("MiMARK");
    expect(names).toContain("Sola Diagnostics");
    expect(names).toContain("MIRFLOW LTD");
    expect(names).toContain("Swift Biotechnology");
    expect(names).toContain("Utepreva");
    expect(names).toContain("Normedi");
  });

  it("excludes gynecologic oncology clinics from included list", () => {
    const names = ENDOMETRIAL_CANCER_COVERAGE.companies.map((c) =>
      c.name.toLowerCase()
    );
    expect(names.some((n) => n.includes("southwest gyn oncology"))).toBe(
      false,
    );
    expect(
      names.some((n) => n.includes("mid atlantic gynecologic oncology")),
    ).toBe(false);
  });

  it("flags verified dataset overlap for Foundation Medicine and Igenomix", () => {
    const fmi = ENDOMETRIAL_CANCER_COVERAGE.companies.find(
      (c) => c.name === "Foundation Medicine",
    );
    expect(fmi?.inVerifiedDataset).toBe(true);
    const igenomix = ENDOMETRIAL_CANCER_COVERAGE.companies.find(
      (c) => c.name === "Igenomix",
    );
    expect(igenomix?.inVerifiedDataset).toBe(true);
  });
});
