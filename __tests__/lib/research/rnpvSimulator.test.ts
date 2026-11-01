import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildRnpvExport } from "@/lib/research/rnpvExport";
import {
  illustrativePreset,
  parseScenarioForm,
} from "@/lib/research/rnpvScenarioForm";
import {
  calculateRnpv,
  salesFactor,
  simulateRnpv,
  simulateRnpvYielding,
} from "@/lib/research/rnpvSimulator";
import type { RnpvScenario } from "@/lib/research/rnpvSimulator";
import { RNPV_BENCHMARKS } from "@/lib/research/rnpvBenchmarks";

const scenario: RnpvScenario = {
  discount: 0,
  peakSales: 100,
  margin: 1,
  tax: 0,
  commercialYears: 1,
  rampYears: 1,
  plateauYears: 1,
  decline: 0,
  upfront: 0,
  launchCost: 0,
  stages: [
    { name: "I", years: 1, probability: 0.5, cost: 10 },
    { name: "II", years: 1, probability: 1, cost: 20 },
  ],
};
const settings = {
  iterations: 10000,
  seed: 42,
  financialSpread: 0,
  probabilitySpread: 0,
};

describe("native rNPV sandbox", () => {
  it("weights costs by stage entry, not final approval", () => {
    expect(calculateRnpv(scenario).rnpv).toBe(30);
  });

  it("weights a later stage cost by the probability of entering it", () => {
    const result = calculateRnpv({
      ...scenario,
      peakSales: 0,
      margin: 0,
      stages: [
        { name: "I", years: 1, probability: 0.25, cost: 0 },
        { name: "II", years: 1, probability: 0.5, cost: 40 },
      ],
    });
    expect(result.expectedDevelopmentCostPv).toBe(10);
    expect(result.approvalProbability).toBeCloseTo(0.125);
  });

  it("weights launch investment by the probability of reaching launch", () => {
    const result = calculateRnpv({
      ...scenario,
      peakSales: 0,
      margin: 0,
      launchCost: 8,
      stages: [
        { name: "I", years: 1, probability: 0.25, cost: 0 },
        { name: "II", years: 1, probability: 0.5, cost: 0 },
      ],
    });
    expect(result.expectedLaunchCostPv).toBe(1);
    expect(result.rnpv).toBe(-1);
  });

  it("weights commercial cash flows by the probability of finishing every stage", () => {
    const result = calculateRnpv({
      ...scenario,
      peakSales: 80,
      stages: [
        { name: "I", years: 1, probability: 0.25, cost: 0 },
        { name: "II", years: 1, probability: 0.5, cost: 0 },
      ],
    });
    expect(result.expectedCommercialPv).toBe(10);
    expect(result.rnpv).toBe(10);
  });

  it("discounts commercial cash flow after development", () => {
    expect(
      calculateRnpv({
        ...scenario,
        discount: 0.1,
        stages: [],
        launchCost: 5,
      }).rnpv,
    ).toBeCloseTo(100 / 1.1 - 5);
  });

  it("discounts a stage cost to the year it is paid", () => {
    expect(
      calculateRnpv({
        ...scenario,
        discount: 0.1,
        peakSales: 0,
        margin: 0,
        stages: [{ name: "I", years: 1, probability: 1, cost: 10 }],
      }).rnpv,
    ).toBeCloseTo(-10 / 1.1);
  });

  it("reaches peak in the final ramp year and then declines", () => {
    expect(
      salesFactor(
        { ...scenario, rampYears: 2, plateauYears: 0, decline: 0.5 },
        1,
      ),
    )
      .toBe(0.5);
    expect(
      salesFactor(
        { ...scenario, rampYears: 2, plateauYears: 0, decline: 0.5 },
        2,
      ),
    )
      .toBe(1);
    expect(
      salesFactor(
        { ...scenario, rampYears: 2, plateauYears: 0, decline: 0.5 },
        3,
      ),
    )
      .toBe(0.5);
    expect(
      calculateRnpv({
        ...scenario,
        commercialYears: 2,
        rampYears: 1,
        plateauYears: 0,
        decline: 0.5,
        stages: [],
      }).rnpv,
    ).toBe(150);
  });

  it("stops costs after a certain failure", () => {
    const failed = {
      ...scenario,
      stages: [{ ...scenario.stages[0], probability: 0 }, scenario.stages[1]],
    };
    expect(calculateRnpv(failed).rnpv).toBe(-10);
    expect(simulateRnpv(failed, settings).mean).toBe(-10);
  });

  it("reproduces identical seeded paths", () => {
    expect(simulateRnpv(scenario, settings)).toEqual(
      simulateRnpv(scenario, settings),
    );
  });

  it("does not double risk-adjust sampled paths", () => {
    const result = simulateRnpv(scenario, settings);
    expect(result.samples.every((value) => value === -10 || value === 70)).toBe(
      true,
    );
  });

  it("converges to analytic expectation at zero spreads", () => {
    const result = simulateRnpv(scenario, settings);
    expect(Math.abs(result.mean - calculateRnpv(scenario).rnpv)).toBeLessThan(
      5 * result.standardError,
    );
  });

  it("collapses the distribution for certain success and zero spreads", () => {
    const result = simulateRnpv({ ...scenario, stages: [] }, settings);
    expect(result.mean).toBe(100);
    expect(result.standardError).toBe(0);
  });

  it("retains negative valuations", () => {
    expect(calculateRnpv({ ...scenario, upfront: 100 }).rnpv).toBe(-70);
  });

  it("rejects nonfinite inputs", () => {
    expect(() => calculateRnpv({ ...scenario, peakSales: Number.NaN }))
      .toThrow();
  });

  it("rejects invalid probabilities", () => {
    expect(() =>
      calculateRnpv({
        ...scenario,
        stages: [{ ...scenario.stages[0], probability: 1.1 }],
      })
    ).toThrow();
  });

  it("bounds iterations and seeds", () => {
    expect(() => simulateRnpv(scenario, { ...settings, iterations: 10001 }))
      .toThrow();
    expect(() => simulateRnpv(scenario, { ...settings, seed: -1 })).toThrow();
  });

  it("orders reported percentiles", () => {
    const result = simulateRnpv(scenario, {
      ...settings,
      financialSpread: 0.2,
      probabilitySpread: 0.1,
    });
    expect(result.p10).toBeLessThanOrEqual(result.median);
    expect(result.median).toBeLessThanOrEqual(result.p90);
  });

  it("matches the synchronous sampler when the run yields between chunks", async () => {
    const compact = { ...settings, iterations: 200 };
    const synced = simulateRnpv(scenario, compact);
    const yielded = await simulateRnpvYielding(scenario, compact, {
      chunkSize: 50,
    });
    expect(yielded).toEqual(synced);
  });

  it("cancels before drawing paths when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(simulateRnpvYielding(scenario, settings, {
      signal: controller.signal,
    })).rejects.toThrow(/cancelled/);
  });
});

describe("rNPV scenario form", () => {
  it("keeps the sandbox source off the benchmark module", () => {
    const files = [
      "src/lib/research/rnpvSimulator.ts",
      "src/lib/research/rnpvScenarioForm.ts",
      "src/lib/research/rnpvExport.ts",
      "src/components/RnpvSimulator.tsx",
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8").includes("rnpvBenchmarks")).toBe(false);
    }
  });

  it("drops stages before the selected entry point", () => {
    const parsed = parseScenarioForm({
      ...illustrativePreset(),
      startStage: "phase3",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.scenario.stages.map((stage) => stage.name)).toEqual([
      "Phase III",
      "Regulatory submission",
    ]);
    expect(parsed.scenario.stages.reduce((sum, stage) => sum + stage.cost, 0))
      .toBe(46);
  });

  it("requires a user rationale and does not invent a preclinical probability", () => {
    const blank = parseScenarioForm({
      ...illustrativePreset(),
      startStage: "preclinical",
      preclinicalRationale: "",
    });
    expect(blank.ok).toBe(false);
    if (blank.ok) return;
    expect(blank.errors.some((error) => error.includes("preclinical"))).toBe(
      true,
    );
    expect(illustrativePreset().stages.preclinical).toEqual({
      years: "",
      probabilityPercent: "",
      cost: "",
    });
  });

  it("uses round hypothetical preset rates that are not stored benchmarks", () => {
    const parsed = parseScenarioForm(illustrativePreset());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const fractions = new Set(
      RNPV_BENCHMARKS.filter((item) => item.unit === "fraction").map((item) =>
        item.value
      ),
    );
    const dollars = new Set(
      RNPV_BENCHMARKS.filter((item) => item.unit === "usd").map((item) =>
        item.value
      ),
    );
    const rates = [
      parsed.scenario.discount,
      parsed.scenario.margin,
      parsed.scenario.tax,
      parsed.scenario.decline,
      ...parsed.scenario.stages.map((stage) => stage.probability),
    ];
    for (const rate of rates) {
      expect(fractions.has(rate), `fraction ${rate}`).toBe(false);
    }
    const amounts = [
      parsed.scenario.peakSales,
      parsed.scenario.upfront,
      parsed.scenario.launchCost,
      ...parsed.scenario.stages.map((stage) => stage.cost),
    ];
    for (const amount of amounts) {
      expect(dollars.has(amount), `amount ${amount}`).toBe(false);
      expect(dollars.has(amount * 1_000_000), `usd ${amount}`).toBe(false);
    }
  });

  it("omits a simulation that is no longer current", () => {
    const parsed = parseScenarioForm(illustrativePreset());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const deterministic = calculateRnpv(parsed.scenario);
    const simulation = simulateRnpv(parsed.scenario, {
      ...parsed.settings,
      iterations: 100,
    });
    const stale = buildRnpvExport({
      form: illustrativePreset(),
      scenario: parsed.scenario,
      settings: parsed.settings,
      deterministic,
      simulation,
      fresh: false,
    });
    expect(stale.simulation).toBeNull();
    expect(stale.simulationFresh).toBe(false);
    expect(stale.deterministic.rnpv).toBe(deterministic.rnpv);
    const current = buildRnpvExport({
      form: illustrativePreset(),
      scenario: parsed.scenario,
      settings: parsed.settings,
      deterministic,
      simulation,
      fresh: true,
    });
    expect(current.simulation?.samples).toHaveLength(100);
    expect(current.acknowledgedHypothetical).toBe(true);
    expect(current.presetId).toBe("illustrative-round-v1");
  });
});
