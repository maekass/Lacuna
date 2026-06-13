import { describe, expect, it } from "vitest";
import {
  analyzeFounderCharacteristics,
  calculateDemographicParity,
  type CompanyWithFounders,
  GENDER_INFERENCE_QUALITY,
} from "@/lib/fairness/demographicParity";

function company(overrides: Partial<CompanyWithFounders>): CompanyWithFounders {
  return {
    companyId: "c1",
    companyName: "Modern Fertility",
    founders: [
      {
        founder: "A. Example",
        inferredGender: "female",
        confidence: 0.9,
        source: "common_name",
      },
    ],
    sector: "Fertility",
    stage: "Acquired",
    wasAcquired: true,
    acquisitionValue: 225,
    yearFounded: 2017,
    yearAcquired: 2021,
    ...overrides,
  };
}

const sampleCompanies: CompanyWithFounders[] = [
  company({ companyId: "c1", wasAcquired: true }),
  company({
    companyId: "c2",
    companyName: "Ro",
    founders: [{
      founder: "B. Example",
      inferredGender: "male",
      confidence: 0.92,
      source: "common_name",
    }],
    wasAcquired: false,
  }),
  company({
    companyId: "c3",
    companyName: "Maven Clinic",
    sector: "Fertility",
    wasAcquired: true,
    acquisitionValue: 500,
  }),
];

describe("calculateDemographicParity", () => {
  it("computes parity difference and CI (success)", () => {
    const result = calculateDemographicParity(sampleCompanies);
    expect(result.womenFoundedRate).toBeGreaterThan(0);
    expect(result.confidenceInterval[0]).toBeLessThanOrEqual(
      result.parityDifference,
    );
    expect(result.confidenceInterval[1]).toBeGreaterThanOrEqual(
      result.parityDifference,
    );
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("excludes companies with empty founder list from rates (edge)", () => {
    const result = calculateDemographicParity([
      company({ founders: [], wasAcquired: false }),
    ]);
    expect(result.womenFoundedRate).toBeNaN();
    expect(result.acquiredWomenFoundedRate).toBe(0);
  });

  it("exposes gender inference quality constants (success)", () => {
    expect(GENDER_INFERENCE_QUALITY.overallAccuracy).toBeCloseTo(0.94);
    expect(GENDER_INFERENCE_QUALITY.highConfidenceThreshold).toBe(0.85);
  });
});

describe("analyzeFounderCharacteristics", () => {
  it("splits sector distribution by inferred gender (success)", () => {
    const result = analyzeFounderCharacteristics(sampleCompanies);
    expect(result.womenFounders.count).toBe(2);
    expect(result.menFounders.count).toBe(1);
    expect(result.womenFounders.sectorDistribution.Fertility).toBe(2);
  });

  it("returns zero acquisition average when not acquired (edge)", () => {
    const result = analyzeFounderCharacteristics([
      company({ wasAcquired: false, acquisitionValue: undefined }),
      company({
        companyId: "c4",
        companyName: "Peer Co",
        founders: [{
          founder: "C. Example",
          inferredGender: "male",
          confidence: 0.9,
          source: "common_name",
        }],
        wasAcquired: false,
      }),
    ]);
    expect(result.womenFounders.avgAcquisitionValue).toBe(0);
    expect(result.menFounders.avgAcquisitionValue).toBe(0);
  });
});
