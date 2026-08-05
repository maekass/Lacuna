import { describe, expect, it } from "vitest";
import {
  kaplanMeier,
  logRankTest,
  stratifiedKM,
  type SurvivalObs,
} from "@/lib/stats/survival";

describe("kaplanMeier", () => {
  it("returns an empty result for no observations (edge)", () => {
    const result = kaplanMeier([]);
    expect(result.n).toBe(0);
    expect(result.nEvents).toBe(0);
    expect(result.steps).toEqual([]);
    expect(result.medianSurvival).toBeNull();
    expect(result.medianCI).toBeNull();
  });

  it("produces a monotone non-increasing survival curve (success)", () => {
    const obs: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 2, event: 1 },
      { time: 3, event: 1 },
      { time: 4, event: 1 },
    ];
    const result = kaplanMeier(obs, "cohort");
    expect(result.group).toBe("cohort");
    expect(result.n).toBe(4);
    expect(result.nEvents).toBe(4);
    // S drops 1 → 0.75 → 0.5 → 0.25 → 0
    expect(result.steps.map((s) => s.survival)).toEqual([0.75, 0.5, 0.25, 0]);
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].survival).toBeLessThanOrEqual(
        result.steps[i - 1].survival,
      );
    }
    // Median is the first time survival crosses 0.5
    expect(result.medianSurvival).toBe(2);
  });

  it("keeps confidence bounds within [0, 1]", () => {
    const obs: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 2, event: 0 },
      { time: 3, event: 1 },
      { time: 5, event: 1 },
    ];
    const result = kaplanMeier(obs);
    for (const step of result.steps) {
      expect(step.lower95).toBeGreaterThanOrEqual(0);
      expect(step.upper95).toBeLessThanOrEqual(1);
      expect(step.se).toBeGreaterThanOrEqual(0);
    }
  });

  it("holds survival flat through a censoring-only time point (edge)", () => {
    const obs: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 2, event: 0 },
      { time: 3, event: 0 },
    ];
    const result = kaplanMeier(obs);
    const censorStep = result.steps.find((s) => s.time === 2)!;
    expect(censorStep.nEvents).toBe(0);
    expect(censorStep.nCensored).toBe(1);
    // Survival unchanged from the previous event at t=1 (S=1−1/3)
    expect(censorStep.survival).toBeCloseTo(2 / 3, 6);
    expect(result.medianSurvival).toBeNull();
  });
});

describe("logRankTest", () => {
  it("yields chi-squared ≈ 0 and p ≈ 1 for identical groups (edge)", () => {
    const same: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 2, event: 1 },
      { time: 3, event: 1 },
    ];
    const result = logRankTest({ a: same, b: [...same] });
    expect(result.df).toBe(1);
    expect(result.chiSquared).toBeCloseTo(0, 3);
    expect(result.pValue).toBeCloseTo(1, 2);
  });

  it("returns a positive statistic and small p for divergent groups (success)", () => {
    const early: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 1, event: 1 },
      { time: 2, event: 1 },
      { time: 2, event: 1 },
    ];
    const late: SurvivalObs[] = [
      { time: 8, event: 1 },
      { time: 9, event: 1 },
      { time: 10, event: 1 },
      { time: 11, event: 1 },
    ];
    const result = logRankTest({ early, late });
    expect(result.chiSquared).toBeGreaterThan(0);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.observed.early + result.observed.late).toBe(8);
  });
});

describe("stratifiedKM", () => {
  it("groups observations and runs a log-rank test across strata (success)", () => {
    const obs: SurvivalObs[] = [
      { time: 1, event: 1, group: "x" },
      { time: 2, event: 1, group: "x" },
      { time: 8, event: 1, group: "y" },
      { time: 9, event: 1, group: "y" },
    ];
    const { groups, logRank } = stratifiedKM(obs);
    expect(groups.map((g) => g.group).sort()).toEqual(["x", "y"]);
    expect(logRank).not.toBeNull();
    expect(logRank!.df).toBe(1);
  });

  it("skips the log-rank test with a single stratum (edge)", () => {
    const obs: SurvivalObs[] = [
      { time: 1, event: 1 },
      { time: 2, event: 1 },
    ];
    const { groups, logRank } = stratifiedKM(obs);
    expect(groups).toHaveLength(1);
    expect(groups[0].group).toBe("Overall");
    expect(logRank).toBeNull();
  });
});
