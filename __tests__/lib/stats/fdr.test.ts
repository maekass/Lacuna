import { describe, expect, it } from "vitest";
import {
  benjaminiHochberg,
  holmBonferroni,
  pairwiseTTests,
  welchTTest,
} from "@/lib/stats/fdr";

describe("benjaminiHochberg", () => {
  it("returns an empty array for no tests (edge)", () => {
    expect(benjaminiHochberg([])).toEqual([]);
  });

  it("adjusts and ranks p-values, preserving labels (success)", () => {
    const result = benjaminiHochberg([
      { label: "c", pValue: 0.04 },
      { label: "a", pValue: 0.01 },
      { label: "b", pValue: 0.02 },
    ]);
    expect(result).toHaveLength(3);
    // Sorted by rank ascending → smallest p first
    expect(result.map((r) => r.label)).toEqual(["a", "b", "c"]);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
    // Adjusted p-values are monotone non-decreasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pAdjusted).toBeGreaterThanOrEqual(
        result[i - 1].pAdjusted,
      );
    }
  });

  it("never inflates the largest p-value beyond its raw value", () => {
    const result = benjaminiHochberg([
      { label: "x", pValue: 0.001 },
      { label: "y", pValue: 0.9 },
    ]);
    const top = result.find((r) => r.label === "y")!;
    expect(top.pAdjusted).toBeCloseTo(0.9, 4);
  });

  it("flags significance at the chosen q threshold", () => {
    const result = benjaminiHochberg(
      [
        { label: "sig", pValue: 0.001 },
        { label: "ns", pValue: 0.8 },
      ],
      0.05,
    );
    expect(result.find((r) => r.label === "sig")!.significant).toBe(true);
    expect(result.find((r) => r.label === "ns")!.significant).toBe(false);
  });
});

describe("holmBonferroni", () => {
  it("returns an empty array for no tests (edge)", () => {
    expect(holmBonferroni([])).toEqual([]);
  });

  it("produces monotone adjusted p-values capped at 1 (success)", () => {
    const result = holmBonferroni([
      { label: "a", pValue: 0.01 },
      { label: "b", pValue: 0.04 },
      { label: "c", pValue: 0.5 },
    ]);
    // p(1) × m = 0.01 × 3 = 0.03
    expect(result[0].pAdjusted).toBeCloseTo(0.03, 4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].pAdjusted).toBeGreaterThanOrEqual(
        result[i - 1].pAdjusted,
      );
    }
    expect(result.every((r) => r.pAdjusted <= 1)).toBe(true);
  });

  it("is more conservative than BH on the same input", () => {
    const tests = [
      { label: "a", pValue: 0.01 },
      { label: "b", pValue: 0.02 },
      { label: "c", pValue: 0.03 },
    ];
    const bh = benjaminiHochberg(tests);
    const holm = holmBonferroni(tests);
    const bhTop = bh.find((r) => r.label === "a")!.pAdjusted;
    const holmTop = holm.find((r) => r.label === "a")!.pAdjusted;
    expect(holmTop).toBeGreaterThanOrEqual(bhTop);
  });
});

describe("welchTTest", () => {
  it("yields t≈0 and p≈1 for identical groups (edge)", () => {
    const result = welchTTest([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(result.t).toBeCloseTo(0, 6);
    expect(result.pValue).toBeCloseTo(1, 2);
    expect(result.cohenD).toBeCloseTo(0, 6);
    expect(result.diffMeans).toBeCloseTo(0, 6);
  });

  it("detects a clear mean difference (success)", () => {
    const result = welchTTest([10, 11, 12, 13, 14], [1, 2, 3, 4, 5]);
    expect(result.meanA).toBeCloseTo(12, 6);
    expect(result.meanB).toBeCloseTo(3, 6);
    expect(result.diffMeans).toBeCloseTo(9, 6);
    expect(result.pValue).toBeLessThan(0.01);
    expect(result.cohenD).toBeGreaterThan(1);
    expect(result.mde80).toBeGreaterThan(0);
  });
});

describe("pairwiseTTests", () => {
  it("runs all pairs and returns corrected results (success)", () => {
    const { pairwiseResults, corrected } = pairwiseTTests({
      low: [1, 2, 3, 4],
      mid: [5, 6, 7, 8],
      high: [9, 10, 11, 12],
    });
    // 3 groups → 3 unique pairs
    expect(pairwiseResults).toHaveLength(3);
    expect(corrected).toHaveLength(3);
    expect(corrected.every((c) => c.label.includes(" vs "))).toBe(true);
  });

  it("skips groups with fewer than two observations (edge)", () => {
    const { pairwiseResults } = pairwiseTTests({
      ok: [1, 2, 3],
      tooSmall: [5],
    });
    expect(pairwiseResults).toHaveLength(0);
  });

  it("supports Holm correction as an alternative", () => {
    const { corrected } = pairwiseTTests(
      {
        a: [1, 2, 3, 4],
        b: [8, 9, 10, 11],
      },
      "Holm",
    );
    expect(corrected).toHaveLength(1);
  });
});
