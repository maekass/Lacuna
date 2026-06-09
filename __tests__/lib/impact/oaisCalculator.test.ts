import { describe, expect, it } from "vitest";
import {
  calculateOAIS,
  EPIDEMIOLOGY_DATABASE,
  exampleOAISCalculations,
  generateTransparencyReport,
  type OAISInputs,
} from "@/lib/impact/oaisCalculator";

const baseInputs: OAISInputs = {
  condition: "PCOS",
  addressablePopulation: 1.5,
  currentPenetration: 0.15,
  clinicalStage: "clinical_validation",
  founderPriorExits: 1,
  founderFDAExperience: false,
  acquirerScalingMultiplier: 2.1,
  competitorCount: 8,
};

describe("calculateOAIS", () => {
  it("returns bounded score with component breakdown (success)", () => {
    const result = calculateOAIS(baseInputs);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.components.penetrationGapScore).toBeCloseTo(0.85);
    expect(result.confidenceBreakdown.addressablePop).toBe("measured");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("penalizes high market saturation (edge)", () => {
    const saturated = calculateOAIS({ ...baseInputs, competitorCount: 40 });
    const baseline = calculateOAIS(baseInputs);
    expect(saturated.score).toBeLessThan(baseline.score);
    expect(saturated.components.marketSaturationPenalty).toBe(0.5);
  });

  it("clamps penetration gap to [0, 1] (edge)", () => {
    const overPenetrated = calculateOAIS({
      ...baseInputs,
      currentPenetration: 1.5,
    });
    expect(overPenetrated.components.penetrationGapScore).toBe(0);
  });
});

describe("exampleOAISCalculations", () => {
  it("returns three example results (success)", () => {
    const examples = exampleOAISCalculations();
    expect(examples).toHaveLength(3);
    expect(examples.every((r) => r.score >= 0 && r.score <= 10)).toBe(true);
  });
});

describe("generateTransparencyReport", () => {
  it("documents tiers and limitations (success)", () => {
    const report = generateTransparencyReport();
    expect(report).toContain("OAIS");
    expect(report).toContain("TIER 1");
    expect(EPIDEMIOLOGY_DATABASE[0].condition).toBeTruthy();
    expect(report).toContain("DOES NOT MEASURE");
  });
});
