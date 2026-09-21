export interface DemandInputs {
  targetPopulation: number;
  prevalence: number;
  serviceReach: number;
  diagnosisRate: number;
  treatmentEligibility: number;
  currentUptake: number;
}

export interface InterventionInputs {
  id: string;
  label: string;
  targetUptake: number;
  unitCommodityCostUsd: number;
  deliveryCostPerPatientUsd: number;
  fixedImplementationCostUsd: number;
}

export interface DemandFunnel {
  affectedPopulation: number;
  reachedPopulation: number;
  diagnosedPopulation: number;
  eligiblePopulation: number;
  currentTreatedPatients: number;
}

export interface InterventionResult extends InterventionInputs {
  treatedPatients: number;
  incrementalPatientsReached: number;
  commodityCostUsd: number;
  deliveryCostUsd: number;
  totalAnnualBudgetUsd: number;
  incrementalBudgetUsd: number;
  incrementalCostPerAdditionalPatientUsd: number | null;
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite, non-negative number`);
  }
}

function assertRate(name: string, value: number): void {
  assertFiniteNonNegative(name, value);
  if (value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function assertFiniteResult(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} overflowed to a non-finite number`);
  }
  return value;
}

export function calculateDemandFunnel(inputs: DemandInputs): DemandFunnel {
  assertFiniteNonNegative("targetPopulation", inputs.targetPopulation);
  assertRate("prevalence", inputs.prevalence);
  assertRate("serviceReach", inputs.serviceReach);
  assertRate("diagnosisRate", inputs.diagnosisRate);
  assertRate("treatmentEligibility", inputs.treatmentEligibility);
  assertRate("currentUptake", inputs.currentUptake);

  const affectedPopulation = inputs.targetPopulation * inputs.prevalence;
  const reachedPopulation = affectedPopulation * inputs.serviceReach;
  const diagnosedPopulation = reachedPopulation * inputs.diagnosisRate;
  const eligiblePopulation = diagnosedPopulation * inputs.treatmentEligibility;
  const currentTreatedPatients = eligiblePopulation * inputs.currentUptake;

  return {
    affectedPopulation,
    reachedPopulation,
    diagnosedPopulation,
    eligiblePopulation,
    currentTreatedPatients,
  };
}

export function annualBudget(
  treatedPatients: number,
  scenario: Pick<
    InterventionInputs,
    | "unitCommodityCostUsd"
    | "deliveryCostPerPatientUsd"
    | "fixedImplementationCostUsd"
  >,
): number {
  assertFiniteNonNegative("treatedPatients", treatedPatients);
  assertFiniteNonNegative(
    "unitCommodityCostUsd",
    scenario.unitCommodityCostUsd,
  );
  assertFiniteNonNegative(
    "deliveryCostPerPatientUsd",
    scenario.deliveryCostPerPatientUsd,
  );
  assertFiniteNonNegative(
    "fixedImplementationCostUsd",
    scenario.fixedImplementationCostUsd,
  );

  return assertFiniteResult(
    "annualBudget",
    treatedPatients *
        (scenario.unitCommodityCostUsd + scenario.deliveryCostPerPatientUsd) +
      scenario.fixedImplementationCostUsd,
  );
}

export function compareIntervention(
  demand: DemandInputs,
  baseline: InterventionInputs,
  intervention: InterventionInputs,
): InterventionResult {
  const funnel = calculateDemandFunnel(demand);

  assertRate("baseline.targetUptake", baseline.targetUptake);
  assertRate("intervention.targetUptake", intervention.targetUptake);
  if (baseline.targetUptake !== demand.currentUptake) {
    throw new Error(
      "baseline.targetUptake must equal demand.currentUptake; the status quo has one uptake",
    );
  }

  const baselineTreated = funnel.currentTreatedPatients;
  const treatedPatients = funnel.eligiblePopulation * intervention.targetUptake;
  const incrementalPatientsReached = treatedPatients - baselineTreated;

  const baselineBudget = annualBudget(baselineTreated, baseline);
  const commodityCostUsd = assertFiniteResult(
    "commodityCostUsd",
    treatedPatients * intervention.unitCommodityCostUsd,
  );
  const deliveryCostUsd = assertFiniteResult(
    "deliveryCostUsd",
    treatedPatients * intervention.deliveryCostPerPatientUsd,
  );
  const totalAnnualBudgetUsd = annualBudget(treatedPatients, intervention);
  const incrementalBudgetUsd = totalAnnualBudgetUsd - baselineBudget;

  return {
    ...intervention,
    treatedPatients,
    incrementalPatientsReached,
    commodityCostUsd,
    deliveryCostUsd,
    totalAnnualBudgetUsd,
    incrementalBudgetUsd,
    incrementalCostPerAdditionalPatientUsd: incrementalPatientsReached > 0
      ? incrementalBudgetUsd / incrementalPatientsReached
      : null,
  };
}

export function rankFrontier(
  demand: DemandInputs,
  baseline: InterventionInputs,
  interventions: InterventionInputs[],
): InterventionResult[] {
  return interventions
    .map((intervention) => compareIntervention(demand, baseline, intervention))
    .sort((a, b) => {
      if (a.incrementalPatientsReached !== b.incrementalPatientsReached) {
        return b.incrementalPatientsReached - a.incrementalPatientsReached;
      }
      return a.incrementalBudgetUsd - b.incrementalBudgetUsd;
    });
}
