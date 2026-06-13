import { describe, expect, it } from "vitest";
import { minimalVerifiedDataset } from "../../helpers/fixtures";
import {
  createDailyCertification,
  DataCertification,
  generateVerificationBadge,
  useDataCertification,
} from "@/lib/validation/dataCertification";

describe("DataCertification.certify", () => {
  it("certifies verified company slice with quality score (success)", () => {
    const certifier = DataCertification.getInstance();
    const result = certifier.certify(
      minimalVerifiedDataset.companies,
      "companies",
    );

    expect(result.layers).toHaveLength(5);
    expect(result.qualityScore).toBeGreaterThan(0);
    expect(result.hash).toHaveLength(16);
    expect(result.summary).toContain("Certification");
  });

  it("fails schema validation for null data (error)", () => {
    const certifier = DataCertification.getInstance();
    const result = certifier.certify(null, "companies");
    expect(result.isValid).toBe(false);
    expect(result.layers[0].passed).toBe(false);
    expect(result.layers[0].details.join(" ")).toContain("not an object");
  });

  it("fails schema validation for empty array (edge)", () => {
    const certifier = DataCertification.getInstance();
    const result = certifier.certify([], "companies");
    expect(result.isValid).toBe(false);
    expect(result.layers[0].details).toContain("Empty dataset");
  });
});

describe("generateVerificationBadge", () => {
  it("maps high scores to A grade (success)", () => {
    const badge = generateVerificationBadge({
      isValid: true,
      qualityScore: 95,
      hash: "abc",
      timestamp: "",
      layers: [],
      summary: "",
    });
    expect(badge).toContain("A+");
    expect(badge).toContain("green");
  });

  it("maps low scores to C grade (edge)", () => {
    const badge = generateVerificationBadge({
      isValid: false,
      qualityScore: 75,
      hash: "abc",
      timestamp: "",
      layers: [],
      summary: "",
    });
    expect(badge).toContain("C");
    expect(badge).toContain("red");
  });
});

describe("createDailyCertification", () => {
  it("creates dated certification record (success)", () => {
    const daily = createDailyCertification(
      minimalVerifiedDataset.companies,
      "companies",
    );
    expect(daily.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daily.hash).toHaveLength(16);
    expect(daily.details).toContain("Certification");
  });
});

describe("useDataCertification", () => {
  it("returns singleton instance (success)", () => {
    expect(useDataCertification()).toBe(DataCertification.getInstance());
  });
});
