import { describe, expect, it } from "vitest";
import {
  calculateOsterDelta,
  calculateRotnitzkyBounds,
  exampleFemTechAnalysis,
  generateSensitivityReport,
  generateVisualizationData,
  scenarioBounds,
  type SensitivityConfig,
} from "@/lib/causal/sensitivityAnalysis";

const baseConfig: SensitivityConfig = {
  treatmentVariable: "femtech_investment",
  outcomeVariable: "acquisition_premium",
  measuredConfounders: ["sector", "stage", "funding"],
  treatmentEffectWithConfounders: 0.12,
  treatmentEffectNaive: 0.22,
  rSquaredFull: 0.55,
  rSquaredPartial: 0.35,
  outcomeVariance: 1.0,
  sampleSize: 22,
};

describe("calculateOsterDelta", () => {
  it("returns robust delta for meaningful coefficient movement (success)", () => {
    const result = calculateOsterDelta(baseConfig);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.explanation).toContain("unobserved confounder");
    expect(typeof result.isRobust).toBe("boolean");
  });

  it("flags misspecification when R² does not increase (error)", () => {
    const badConfig: SensitivityConfig = {
      ...baseConfig,
      rSquaredFull: 0.3,
      rSquaredPartial: 0.35,
    };
    const result = calculateOsterDelta(badConfig);
    expect(result.delta).toBe(Infinity);
    expect(result.isRobust).toBe(false);
    expect(result.interpretation).toContain("misspecified");
  });
});

describe("calculateRotnitzkyBounds", () => {
  it("returns bounds around positive ATE (success)", () => {
    const bounds = calculateRotnitzkyBounds(0.15, 0.05, 0.6, 0.3);
    expect(bounds.pointEstimate).toBe(0.15);
    expect(bounds.lowerBound).toBeLessThan(bounds.upperBound);
    expect(bounds.interpretation).toBeTruthy();
  });

  it("allows sign flip under strong confounding (edge)", () => {
    const bounds = calculateRotnitzkyBounds(0.02, 0.5, 0.1, 0.8);
    expect(bounds.lowerBound).toBeLessThan(0);
    expect(bounds.upperBound).toBeGreaterThan(0);
  });
});

describe("generateSensitivityReport", () => {
  it("combines Oster and Rotnitzky results (success)", () => {
    const report = generateSensitivityReport(baseConfig, 0.04);
    expect(report.oster).toBeDefined();
    expect(report.rotnitzky).toBeDefined();
    expect(report.summary).toContain("Sensitivity Analysis");
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

describe("scenarioBounds", () => {
  it("returns four confounding scenarios (success)", () => {
    const scenarios = scenarioBounds(0.1, 0.03, 0.5);
    expect(scenarios).toHaveLength(4);
    expect(scenarios[0].scenario).toBe("Weak confounding");
    expect(scenarios[3].maxConfounding).toBe(0.8);
  });
});

describe("generateVisualizationData", () => {
  it("maps delta to visualization zones (success)", () => {
    const viz = generateVisualizationData(baseConfig, 0.04);
    expect(["robust", "moderate", "fragile"]).toContain(viz.osterPlot.zone);
    expect(viz.boundsPlot.rotnitzkyBounds[0]).toBeLessThan(
      viz.boundsPlot.rotnitzkyBounds[1],
    );
  });
});

describe("exampleFemTechAnalysis", () => {
  it("runs end-to-end example without throwing (success)", () => {
    const report = exampleFemTechAnalysis();
    expect(report.oster.delta).toBeDefined();
    expect(report.transparencyStatement).toContain(
      "INPUT-CONDITIONAL INTERPRETATION",
    );
  });
});
