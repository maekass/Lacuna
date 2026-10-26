import { describe, expect, it } from "vitest";
import { calculateRnpv, simulateRnpv } from "@/lib/research/rnpvSimulator";
import type { RnpvScenario } from "@/lib/research/rnpvSimulator";
const scenario: RnpvScenario = { discount: 0, peakSales: 100, margin: 1, tax: 0, commercialYears: 1, rampYears: 1, plateauYears: 1, decline: 0, upfront: 0, launchCost: 0, stages: [{ name: "I", years: 1, probability: 0.5, cost: 10 }, { name: "II", years: 1, probability: 1, cost: 20 }] };
const settings = { iterations: 10000, seed: 42, financialSpread: 0, probabilitySpread: 0 };
describe("native rNPV sandbox", () => {
  it("weights costs by stage entry, not final approval", () => { expect(calculateRnpv(scenario).rnpv).toBe(30); });
  it("discounts commercial cash flow after development", () => { expect(calculateRnpv({ ...scenario, discount: 0.1, stages: [], launchCost: 5 }).rnpv).toBeCloseTo(100 / 1.1 - 5); });
  it("stops costs after a certain failure", () => { const s = { ...scenario, stages: [{ ...scenario.stages[0], probability: 0 }, scenario.stages[1]] }; expect(calculateRnpv(s).rnpv).toBe(-10); expect(simulateRnpv(s, settings).mean).toBe(-10); });
  it("reproduces identical seeded paths", () => { expect(simulateRnpv(scenario, settings)).toEqual(simulateRnpv(scenario, settings)); });
  it("does not double risk-adjust sampled paths", () => { const r = simulateRnpv(scenario, settings); expect(r.samples.every((v) => v === -10 || v === 70)).toBe(true); });
  it("converges to analytic expectation at zero spreads", () => { const r = simulateRnpv(scenario, settings); expect(Math.abs(r.mean - calculateRnpv(scenario).rnpv)).toBeLessThan(5 * r.standardError); });
  it("collapses the distribution for certain success and zero spreads", () => { const r = simulateRnpv({ ...scenario, stages: [] }, settings); expect(r.mean).toBe(100); expect(r.standardError).toBe(0); });
  it("retains negative valuations", () => { expect(calculateRnpv({ ...scenario, upfront: 100 }).rnpv).toBe(-70); });
  it("rejects nonfinite inputs", () => { expect(() => calculateRnpv({ ...scenario, peakSales: NaN })).toThrow(); });
  it("rejects invalid probabilities", () => { expect(() => calculateRnpv({ ...scenario, stages: [{ ...scenario.stages[0], probability: 1.1 }] })).toThrow(); });
  it("bounds iterations and seeds", () => { expect(() => simulateRnpv(scenario, { ...settings, iterations: 10001 })).toThrow(); expect(() => simulateRnpv(scenario, { ...settings, seed: -1 })).toThrow(); });
  it("orders reported percentiles", () => { const r = simulateRnpv(scenario, { ...settings, financialSpread: 0.2, probabilitySpread: 0.1 }); expect(r.p10).toBeLessThanOrEqual(r.median); expect(r.median).toBeLessThanOrEqual(r.p90); });
});
