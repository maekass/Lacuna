import { describe, expect, it } from "vitest";
import {
  annualBudget,
  compareIntervention,
  type DemandInputs,
  type InterventionInputs,
} from "@/lib/marketAccess/model";
import { marketAccessSourceSchema } from "@/lib/marketAccess/schema";

const demand: DemandInputs = {
  targetPopulation: 10_000,
  prevalence: 0.5,
  serviceReach: 0.8,
  diagnosisRate: 0.5,
  treatmentEligibility: 0.5,
  currentUptake: 0.2,
};

const baseline: InterventionInputs = {
  id: "status-quo",
  label: "Status quo",
  targetUptake: 0.2,
  unitCommodityCostUsd: 10,
  deliveryCostPerPatientUsd: 5,
  fixedImplementationCostUsd: 0,
};

const intervention: InterventionInputs = {
  ...baseline,
  id: "subsidy",
  label: "Subsidy",
  targetUptake: 0.5,
};

describe("compareIntervention", () => {
  it("measures incremental reach against the funnel's current uptake", () => {
    const result = compareIntervention(demand, baseline, intervention);
    expect(result.treatedPatients).toBe(500);
    expect(result.incrementalPatientsReached).toBe(300);
  });

  it("rejects a baseline uptake that disagrees with current uptake", () => {
    expect(() =>
      compareIntervention(
        demand,
        { ...baseline, targetUptake: 0.4 },
        intervention,
      )
    ).toThrow(/currentUptake/);
  });

  it("rejects budgets that overflow to Infinity", () => {
    expect(() =>
      annualBudget(1, {
        unitCommodityCostUsd: Number.MAX_VALUE,
        deliveryCostPerPatientUsd: Number.MAX_VALUE,
        fixedImplementationCostUsd: 0,
      })
    ).toThrow(/non-finite/);
  });
});

describe("marketAccessSourceSchema", () => {
  it("rejects calendar-invalid ISO dates", () => {
    const base = {
      url: "https://example.org/report",
      title: "Report",
      organization: "WHO",
      locator: "Table 1",
    };
    expect(
      marketAccessSourceSchema.safeParse({ ...base, accessedAt: "2026-02-31" })
        .success,
    ).toBe(false);
    expect(
      marketAccessSourceSchema.safeParse({ ...base, accessedAt: "2026-02-28" })
        .success,
    ).toBe(true);
  });
});
