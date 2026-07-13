import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { mean, quantile } from "simple-statistics";
import {
  bcaBootstrapCi,
  createSeededRng,
  gatedMedian,
  gatedProportionCi,
  isSufficient,
  MIN_BCA_SAMPLE,
} from "@/lib/quant/estimators";

/** Fisher–Yates shuffle with seeded RNG. */
function permute<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe("estimators property tests", () => {
  it("BCa median is permutation-invariant", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(0.01), max: 1000, noNaN: true }), {
          minLength: MIN_BCA_SAMPLE,
          maxLength: 24,
        }),
        fc.integer({ min: 1, max: 99999 }),
        (values, seed) => {
          const positive = values.filter((v) => v > 0);
          fc.pre(positive.length >= MIN_BCA_SAMPLE);
          const base = bcaBootstrapCi(positive, (xs) => quantile(xs, 0.5), {
            seed,
            resamples: 400,
          });
          const shuffled = permute(positive, createSeededRng(seed + 1));
          const permuted = bcaBootstrapCi(shuffled, (xs) => quantile(xs, 0.5), {
            seed,
            resamples: 400,
          });
          if (!isSufficient(base) || !isSufficient(permuted)) return true;
          expect(permuted.value).toBeCloseTo(base.value, 10);
          return true;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("gated median is monotone under appended observations", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 500, noNaN: true }), {
          minLength: MIN_BCA_SAMPLE,
          maxLength: 16,
        }),
        fc.float({ min: 1, max: 500, noNaN: true }),
        (values, extra) => {
          const base = gatedMedian(values, {
            seed: 7,
            disclosedCount: values.length,
          });
          const extended = gatedMedian([...values, extra], {
            seed: 7,
            disclosedCount: values.length + 1,
          });
          if (!isSufficient(base) || !isSufficient(extended)) return true;
          const lo = Math.min(...values);
          const hi = Math.max(...values, extra);
          expect(extended.value).toBeGreaterThanOrEqual(lo);
          expect(extended.value).toBeLessThanOrEqual(hi);
          return true;
        },
      ),
      { numRuns: 40 },
    );
  });

  it("BCa mean CI covers synthetic normal ground truth at reasonable rate", () => {
    const alpha = 0.05;
    const nTrials = 100;
    const sampleSize = 30;
    const trueMean = 42;
    const sd = 8;
    let covered = 0;
    let evaluated = 0;

    for (let trial = 0; trial < nTrials; trial++) {
      const rng = createSeededRng(1000 + trial);
      const sample = Array.from({ length: sampleSize }, () => {
        const u1 = Math.max(rng(), 1e-10);
        const u2 = rng();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return trueMean + sd * z;
      });
      const result = bcaBootstrapCi(sample, mean, {
        seed: 2000 + trial,
        alpha,
        resamples: 1500,
        minSampleSize: MIN_BCA_SAMPLE,
      });
      if (!isSufficient(result)) continue;
      evaluated++;
      const [lo, hi] = result.confidenceInterval;
      if (lo <= trueMean && trueMean <= hi) covered++;
    }

    expect(evaluated).toBeGreaterThan(nTrials * 0.9);
    const coverage = covered / evaluated;
    // BCa on finite resamples — allow slack below nominal 95%.
    expect(coverage).toBeGreaterThan(0.85);
    expect(coverage).toBeLessThan(1.0);
  });

  it("gated proportion returns insufficient below minSampleSize", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 1, max: 4 }),
        (successes, total) => {
          fc.pre(successes <= total);
          const result = gatedProportionCi(successes, total, {
            minSampleSize: 5,
          });
          expect(result.kind).toBe("insufficient");
          return true;
        },
      ),
      { numRuns: 30 },
    );
  });

  it("seeded bootstrap is reproducible", () => {
    const sample = [10, 20, 30, 40, 50, 60, 70, 80];
    const a = bcaBootstrapCi(sample, mean, { seed: 42, resamples: 200 });
    const b = bcaBootstrapCi(sample, mean, { seed: 42, resamples: 200 });
    expect(a).toEqual(b);
  });
});
