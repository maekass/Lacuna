import { describe, expect, it } from "vitest";
import { computeEValue } from "@/lib/stats/evalue";

describe("computeEValue — risk ratio scale", () => {
  it("computes the closed-form E-value for RR > 1 (success)", () => {
    // RR=1.8 → E = 1.8 + √(1.8×0.8) = 1.8 + 1.2 = 3.0
    const result = computeEValue({ estimate: 1.8, scale: "rr" });
    expect(result.rr).toBeCloseTo(1.8, 2);
    expect(result.evalue).toBeCloseTo(3, 2);
    expect(result.robustness).toBe("moderate");
    expect(result.methodNote).toContain("Van der Weele");
  });

  it("returns E-value of 1 for a null association RR = 1 (edge)", () => {
    const result = computeEValue({ estimate: 1, scale: "rr" });
    expect(result.evalue).toBe(1);
    expect(result.robustness).toBe("negligible");
    expect(result.evalueCI).toBeNull();
  });

  it("inverts protective effects (RR < 1) before computing (edge)", () => {
    // RR=0.5 → inverted to 2 → E = 2 + √(2×1) ≈ 3.41
    const result = computeEValue({ estimate: 0.5, scale: "rr" });
    expect(result.rr).toBeCloseTo(2, 2);
    expect(result.evalue).toBeCloseTo(3.41, 2);
  });

  it("computes a CI lower-bound E-value when ciLower is provided (success)", () => {
    const result = computeEValue({ estimate: 1.8, ciLower: 1.2, scale: "rr" });
    // CI bound RR=1.2 → 1.2 + √(1.2×0.2) ≈ 1.69
    expect(result.evalueCI).toBeCloseTo(1.69, 2);
    expect(result.interpretation).toContain("CI lower bound");
  });

  it("clamps the CI E-value to 1 when the bound crosses the null (edge)", () => {
    const result = computeEValue({ estimate: 1.8, ciLower: 1.0, scale: "rr" });
    expect(result.evalueCI).toBe(1);
  });
});

describe("computeEValue — robustness tiers", () => {
  it("labels a large effect as strong", () => {
    const result = computeEValue({ estimate: 4, scale: "rr" });
    expect(result.robustness).toBe("strong");
    expect(result.interpretation).toContain("robust");
  });

  it("labels a small effect as weak", () => {
    // RR=1.3 → 1.3 + √(1.3×0.3) ≈ 1.92 → weak (>=1.5, <2.5)
    const result = computeEValue({ estimate: 1.3, scale: "rr" });
    expect(result.evalue).toBeGreaterThanOrEqual(1.5);
    expect(result.evalue).toBeLessThan(2.5);
    expect(result.robustness).toBe("weak");
  });
});

describe("computeEValue — other scales", () => {
  it("treats hazard ratios like risk ratios", () => {
    const hr = computeEValue({ estimate: 1.8, scale: "hr" });
    const rr = computeEValue({ estimate: 1.8, scale: "rr" });
    expect(hr.evalue).toBeCloseTo(rr.evalue, 5);
  });

  it("converts an odds ratio to an approximate risk ratio (success)", () => {
    const or = computeEValue({
      estimate: 3,
      scale: "or",
      prevalenceOutcome: 0.1,
    });
    // OR→RR = 3/(1−0.1+0.1×3) = 3/1.2 = 2.5, so RR < OR
    expect(or.rr).toBeCloseTo(2.5, 2);
    expect(or.rr).toBeLessThan(3);
  });

  it("converts Cohen's d to an approximate risk ratio (success)", () => {
    // RR ≈ exp(0.91×d); d=0.5 → exp(0.455) ≈ 1.576
    const d = computeEValue({ estimate: 0.5, scale: "d" });
    expect(d.rr).toBeCloseTo(1.58, 1);
    expect(d.evalue).toBeGreaterThan(1);
  });

  it("uses the magnitude of a negative Cohen's d (edge)", () => {
    const neg = computeEValue({ estimate: -0.5, scale: "d" });
    const pos = computeEValue({ estimate: 0.5, scale: "d" });
    expect(neg.rr).toBeCloseTo(pos.rr, 5);
  });
});
