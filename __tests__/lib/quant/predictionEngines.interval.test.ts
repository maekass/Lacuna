import { describe, expect, it } from "vitest";
import {
  composeAcquisitionIndex,
  isSufficient,
  SECTOR_SHARE_SCALE,
  sectorShareAdjustment,
} from "@/lib/quant/quantEngine";

const SECTOR_SHARES = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.4];
const WEIGHTED_SCORES = [0.1, 0.4, 0.7, 1];

/** Catalog-level exit share 59/150 with the Wilson 95% interval from the audit. */
const AUDIT_BASE_RATE = 59 / 150;
const AUDIT_CI: [number, number] = [0.3188, 0.4732];

describe("sectorShareAdjustment", () => {
  it("keeps the undocumented heuristic scale at 5", () => {
    expect(SECTOR_SHARE_SCALE).toBe(5);
  });

  it("clamps sectorShare * 5 into [0.8, 1.2]", () => {
    expect(sectorShareAdjustment(0.1)).toBe(0.8);
    expect(sectorShareAdjustment(0.203)).toBeCloseTo(1.015, 5);
    expect(sectorShareAdjustment(0.4)).toBe(1.2);
  });
});

describe("composeAcquisitionIndex interval invariant", () => {
  it("keeps lo <= point <= hi for all 32 sectorShare × weightedScore pairs", () => {
    let sufficientCount = 0;

    for (const sectorShare of SECTOR_SHARES) {
      for (const weightedScore of WEIGHTED_SCORES) {
        const result = composeAcquisitionIndex({
          weightedScore,
          baseRate: AUDIT_BASE_RATE,
          confidenceInterval: AUDIT_CI,
          sectorAdjustment: sectorShareAdjustment(sectorShare),
          sampleSize: 150,
        });
        expect(isSufficient(result)).toBe(true);
        if (isSufficient(result)) {
          sufficientCount += 1;
          const [lo, hi] = result.confidenceInterval;
          expect(lo).toBeLessThanOrEqual(result.value);
          expect(result.value).toBeLessThanOrEqual(hi);
        }
      }
    }

    expect(sufficientCount).toBe(32);
  });

  it("regression: sectorShare=0.10 and weightedScore=1.0 stays inside the interval", () => {
    const result = composeAcquisitionIndex({
      weightedScore: 1,
      baseRate: AUDIT_BASE_RATE,
      confidenceInterval: AUDIT_CI,
      sectorAdjustment: sectorShareAdjustment(0.1),
      sampleSize: 150,
    });

    expect(isSufficient(result)).toBe(true);
    if (isSufficient(result)) {
      const [lo, hi] = result.confidenceInterval;
      expect(result.value).toBeGreaterThanOrEqual(lo);
      expect(result.value).toBeLessThanOrEqual(hi);
    }
  });

  it("returns missingInput below reportable resolution instead of flooring", () => {
    const result = composeAcquisitionIndex({
      weightedScore: 0.01,
      baseRate: 0.1,
      confidenceInterval: [0.05, 0.2],
      sectorAdjustment: 0.8,
      sampleSize: 150,
    });

    expect(isSufficient(result)).toBe(false);
    expect(result).toMatchObject({
      kind: "insufficient",
      code: "missing_input",
      message: "Below reportable resolution",
    });
  });

  it("returns missingInput when the interval excludes the point", () => {
    const result = composeAcquisitionIndex({
      weightedScore: 1,
      baseRate: 0.4,
      confidenceInterval: [0.8, 0.9],
      sectorAdjustment: 1,
      sampleSize: 150,
    });

    expect(isSufficient(result)).toBe(false);
    expect(result).toMatchObject({
      kind: "insufficient",
      code: "missing_input",
      message: "Interval inconsistent with point estimate",
    });
  });
});
