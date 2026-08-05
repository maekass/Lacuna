import { describe, expect, it } from "vitest";
import {
  bcaCI,
  diffMeanBCaCI,
  meanBCaCI,
  medianBCaCI,
} from "@/lib/stats/bootstrap";
import { bcaBootstrapCi } from "@/lib/quant/estimators";

const sample = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

describe("bcaCI", () => {
  it("returns a percentile fallback with a warning when n < 4 (edge)", () => {
    const result = bcaCI(
      [1, 2, 3],
      (s) => s.reduce((a, b) => a + b, 0) / s.length,
    );
    expect(result.method).toBe("percentile");
    expect(result.B).toBe(0);
    expect(result.lower).toBe(result.estimate);
    expect(result.upper).toBe(result.estimate);
    expect(result.warning).toContain("too small");
  });

  it("brackets the point estimate for a well-sized sample (success)", () => {
    const result = bcaCI(
      sample,
      (s) => s.reduce((a, b) => a + b, 0) / s.length,
    );
    expect(result.method).toBe("BCa");
    expect(result.lower).toBeLessThanOrEqual(result.estimate);
    expect(result.upper).toBeGreaterThanOrEqual(result.estimate);
    expect(result.B).toBeGreaterThan(0);
    expect(result.level).toBe(0.95);
  });

  it("is reproducible for a fixed seed and varies across seeds", () => {
    const stat = (s: number[]) => s.reduce((a, b) => a + b, 0) / s.length;
    const a = bcaCI(sample, stat, 999, 0.95, 7);
    const b = bcaCI(sample, stat, 999, 0.95, 7);
    const c = bcaCI(sample, stat, 999, 0.95, 8);
    expect(a.lower).toBe(b.lower);
    expect(a.upper).toBe(b.upper);
    expect(a.lower === c.lower && a.upper === c.upper).toBe(false);
  });

  it("degrades to a percentile interval and warns for small n (4–9) (edge)", () => {
    const result = bcaCI(
      [1, 2, 3, 4, 5],
      (s) => s.reduce((a, b) => a + b, 0) / s.length,
    );
    expect(result.method).toBe("percentile");
    expect(result.warning).toContain("jackknife acceleration unreliable");
  });

  it("handles constant samples with finite percentile bounds (edge)", () => {
    const result = bcaCI([5, 5, 5, 5, 5, 5, 5, 5], (s) => s[0]);
    expect(result.method).toBe("percentile");
    expect(result.lower).toBe(5);
    expect(result.upper).toBe(5);
    expect(Number.isFinite(result.lower)).toBe(true);
    expect(Number.isFinite(result.upper)).toBe(true);
  });

  it("returns identical bounds through both BCa wrappers", () => {
    const statistic = (s: number[]) =>
      s.reduce((sum, value) => sum + value, 0) / s.length;
    const bootstrap = bcaCI(sample, statistic, 1999, 0.95, 42);
    const quant = bcaBootstrapCi(sample, statistic, {
      resamples: 1999,
      alpha: 0.05,
      seed: 42,
      minSampleSize: 4,
    });
    expect(quant.kind).toBe("sufficient");
    if (quant.kind === "sufficient") {
      expect(quant.confidenceInterval).toEqual([
        bootstrap.lower,
        bootstrap.upper,
      ]);
    }
  });
});

describe("meanBCaCI", () => {
  it("estimates the sample mean (success)", () => {
    const result = meanBCaCI(sample);
    expect(result.estimate).toBeCloseTo(9.5, 6);
    expect(result.lower).toBeLessThan(result.upper);
  });
});

describe("medianBCaCI", () => {
  it("estimates the sample median for an even-length sample (success)", () => {
    const result = medianBCaCI(sample);
    expect(result.estimate).toBeCloseTo(9.5, 6);
  });

  it("estimates the sample median for an odd-length sample (edge)", () => {
    const result = medianBCaCI([1, 2, 3, 4, 5, 6, 7]);
    expect(result.estimate).toBeCloseTo(4, 6);
  });
});

describe("diffMeanBCaCI", () => {
  it("returns a positive estimate when group A exceeds group B (success)", () => {
    const result = diffMeanBCaCI(
      [10, 11, 12, 13, 14, 15],
      [1, 2, 3, 4, 5, 6],
    );
    expect(result.estimate).toBeCloseTo(9, 6);
    expect(result.lower).toBeLessThanOrEqual(result.estimate);
    expect(result.upper).toBeGreaterThanOrEqual(result.estimate);
    expect(result.method).toBe("BCa");
  });

  it("is reproducible for a fixed seed", () => {
    const a = diffMeanBCaCI([5, 6, 7, 8, 9], [1, 2, 3, 4, 5], 0.95, 3);
    const b = diffMeanBCaCI([5, 6, 7, 8, 9], [1, 2, 3, 4, 5], 0.95, 3);
    expect(a.lower).toBe(b.lower);
    expect(a.upper).toBe(b.upper);
  });

  it("uses finite percentile bounds for n < 10 and one-element groups", () => {
    const small = diffMeanBCaCI([5, 6], [1, 2], 0.95, 3);
    expect(small.method).toBe("percentile");
    expect(Number.isFinite(small.lower)).toBe(true);
    expect(Number.isFinite(small.upper)).toBe(true);

    const single = diffMeanBCaCI([5], [1], 0.95, 3);
    expect(single.method).toBe("percentile");
    expect(single.lower).toBe(4);
    expect(single.upper).toBe(4);
  });
});
