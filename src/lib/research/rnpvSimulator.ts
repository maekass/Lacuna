/**
 * Browser-only hypothetical rNPV. Do not import the published benchmark reference layer.
 * Amounts are USD millions. Callers supply every assumption.
 */

export const RNPV_MODEL_VERSION = "native-rnpv-0.2.0";

/** Stable id for the discounting and probability-weighting rules. */
export const TIMING_CONVENTION_ID = "year-end-stage-entry-v1";

/**
 * Valuation is at entry to the first modeled stage (t = 0), not mid-stage.
 * Certain upfront cost is undiscounted at t = 0. Each remaining stage pays
 * its cost in equal year-end installments, weighted by the probability of
 * entering that stage. Conditional success is applied at the stage end;
 * failure stops later spending. Launch investment is paid at the
 * development-completion year-end and weighted by the probability of
 * completing every remaining stage. The first commercial cash flow is one
 * year later. The discount factor is 1 / (1 + discount) ^ t.
 */
export const TIMING_CONVENTION =
  "Year-end cash flows from stage entry. Upfront cost at t=0. Stage costs are entry-weighted. Launch investment and commercial cash flows are weighted by the probability of completing every remaining stage. First revenue is one year after development completion.";

export interface RnpvStage {
  name: string;
  years: number;
  /** Conditional probability of completing the stage, given entry. */
  probability: number;
  /** Total future cost of the stage, USD millions. */
  cost: number;
}

export interface RnpvScenario {
  /** Annual discount rate as a fraction. */
  discount: number;
  /** Peak annual sales, USD millions. */
  peakSales: number;
  /** Operating cash margin as a fraction of sales. */
  margin: number;
  /** Tax rate applied to operating cash flow, as a fraction. */
  tax: number;
  commercialYears: number;
  /** Years to reach peak. The final ramp year is at peak sales. */
  rampYears: number;
  /** Additional years at peak after the final ramp year. */
  plateauYears: number;
  /** Geometric annual decline after the peak window, as a fraction. */
  decline: number;
  /** Certain cash outflow at t = 0, USD millions. Not a sunk-cost add-back. */
  upfront: number;
  /** Launch investment paid only if every remaining stage is completed. */
  launchCost: number;
  stages: RnpvStage[];
}

export interface MonteCarloSettings {
  iterations: number;
  seed: number;
  /** Multiplicative half-width for discount, sales, launch cost, and stage costs. */
  financialSpread: number;
  /** Absolute half-width added to conditional probabilities that are not 0 or 1. */
  probabilitySpread: number;
}

export interface RnpvResult {
  rnpv: number;
  approvalProbability: number;
  developmentYears: number;
  expectedCostPv: number;
  expectedCommercialPv: number;
  upfrontCost: number;
  expectedDevelopmentCostPv: number;
  expectedLaunchCostPv: number;
  timingConvention: typeof TIMING_CONVENTION_ID;
  valuationPoint: "stage-entry";
}

export interface MonteCarloResult {
  modelVersion: typeof RNPV_MODEL_VERSION;
  timingConvention: typeof TIMING_CONVENTION_ID;
  valuationPoint: "stage-entry";
  settings: MonteCarloSettings;
  mean: number;
  standardError: number;
  meanInterval95: [number, number];
  p10: number;
  median: number;
  p90: number;
  negativeProbability: number;
  approvalFrequency: number;
  /** Path NPVs in simulation order. Not probability-weighted again. */
  samples: number[];
}

const MAX_AMOUNT = 1_000_000;

/** Validate a standalone analyst scenario. Amounts are USD millions. */
export function validateScenario(scenario: RnpvScenario): void {
  const fractions = [
    scenario.discount,
    scenario.margin,
    scenario.tax,
    scenario.decline,
  ];
  if (
    fractions.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new Error("Rates must be finite fractions between zero and one.");
  }
  if (
    [scenario.peakSales, scenario.upfront, scenario.launchCost].some((value) =>
      !Number.isFinite(value) || value < 0 || value > MAX_AMOUNT
    )
  ) {
    throw new Error("Amounts must be between zero and 1,000,000 USD millions.");
  }
  if (
    [scenario.commercialYears, scenario.rampYears].some((value) =>
      !Number.isInteger(value) || value < 1 || value > 40
    )
  ) {
    throw new Error(
      "Commercial horizon and ramp must be integers from 1 to 40.",
    );
  }
  if (
    !Number.isInteger(scenario.plateauYears) || scenario.plateauYears < 0 ||
    scenario.plateauYears > 40
  ) {
    throw new Error("Additional peak years must be an integer from 0 to 40.");
  }
  if (scenario.stages.length > 8) {
    throw new Error("At most eight stages are allowed.");
  }
  for (const stage of scenario.stages) {
    if (
      !stage.name.trim() || !Number.isInteger(stage.years) || stage.years < 1 ||
      stage.years > 15 || !Number.isFinite(stage.probability) ||
      stage.probability < 0 || stage.probability > 1 ||
      !Number.isFinite(stage.cost) || stage.cost < 0 || stage.cost > MAX_AMOUNT
    ) {
      throw new Error("Invalid development stage.");
    }
  }
}

/** Share of peak sales in a 1-based commercial year. */
export function salesFactor(
  scenario: RnpvScenario,
  commercialYear: number,
): number {
  const peakEnd = scenario.rampYears + scenario.plateauYears;
  if (commercialYear <= scenario.rampYears) {
    return commercialYear / scenario.rampYears;
  }
  if (commercialYear <= peakEnd) return 1;
  const declineYears = commercialYear - peakEnd;
  return (1 - scenario.decline) ** declineYears;
}

function commercialPv(scenario: RnpvScenario, completionYear: number): number {
  let value = 0;
  for (let year = 1; year <= scenario.commercialYears; year++) {
    const cash = scenario.peakSales * salesFactor(scenario, year) *
      scenario.margin *
      (1 - scenario.tax);
    value += cash / (1 + scenario.discount) ** (completionYear + year);
  }
  return value;
}

/**
 * Deterministic rNPV. Stage costs use the probability of entering the stage.
 * Commercial cash flows and launch investment use the probability of
 * completing every remaining stage.
 */
export function calculateRnpv(scenario: RnpvScenario): RnpvResult {
  validateScenario(scenario);
  let entryProbability = 1;
  let year = 0;
  let development = 0;
  for (const stage of scenario.stages) {
    for (let k = 0; k < stage.years; k++) {
      year += 1;
      development += entryProbability * (stage.cost / stage.years) /
        (1 + scenario.discount) ** year;
    }
    entryProbability *= stage.probability;
  }
  const launch = entryProbability * scenario.launchCost /
    (1 + scenario.discount) ** year;
  const commercial = entryProbability * commercialPv(scenario, year);
  const costs = scenario.upfront + development + launch;
  return {
    rnpv: commercial - costs,
    approvalProbability: entryProbability,
    developmentYears: year,
    expectedCostPv: costs,
    expectedCommercialPv: commercial,
    upfrontCost: scenario.upfront,
    expectedDevelopmentCostPv: development,
    expectedLaunchCostPv: launch,
    timingConvention: TIMING_CONVENTION_ID,
    valuationPoint: "stage-entry",
  };
}

/** Reproducible non-cryptographic PRNG with an explicit uint32 seed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function quantile(sorted: number[], p: number): number {
  const x = (sorted.length - 1) * p;
  const index = Math.floor(x);
  const fraction = x - index;
  const next = sorted[Math.min(index + 1, sorted.length - 1)] ??
    sorted[index] ?? 0;
  return (sorted[index] ?? 0) + (next - (sorted[index] ?? 0)) * fraction;
}

function assertSettings(settings: MonteCarloSettings): void {
  if (
    !Number.isInteger(settings.iterations) || settings.iterations < 100 ||
    settings.iterations > 10_000
  ) {
    throw new Error("Use 100 to 10,000 iterations.");
  }
  if (
    !Number.isInteger(settings.seed) || settings.seed < 0 ||
    settings.seed > 4_294_967_295
  ) {
    throw new Error("Seed must be a uint32 integer.");
  }
  if (
    [settings.financialSpread, settings.probabilitySpread].some((value) =>
      !Number.isFinite(value) || value < 0 || value > 1
    )
  ) {
    throw new Error("Spreads must be between zero and one.");
  }
}

function scale(value: number, spread: number, random: () => number): number {
  return value * (1 + (2 * random() - 1) * spread);
}

/**
 * One realized path. Samples uncertainty, then stops spending after the first
 * failed stage. The returned NPV is not multiplied by a success probability.
 */
function realizedNpv(
  scenario: RnpvScenario,
  settings: MonteCarloSettings,
  random: () => number,
): { npv: number; approved: boolean } {
  const discount = Math.min(
    1,
    scale(scenario.discount, settings.financialSpread, random),
  );
  const peakSales = scale(scenario.peakSales, settings.financialSpread, random);
  const launchCost = scale(
    scenario.launchCost,
    settings.financialSpread,
    random,
  );
  const stages = scenario.stages.map((stage) => ({
    ...stage,
    cost: scale(stage.cost, settings.financialSpread, random),
    probability: stage.probability === 0 || stage.probability === 1
      ? stage.probability
      : Math.min(
        1,
        Math.max(
          0,
          stage.probability +
            (2 * random() - 1) * settings.probabilitySpread,
        ),
      ),
  }));
  const sampled: RnpvScenario = {
    ...scenario,
    discount,
    peakSales,
    launchCost,
    stages,
  };
  let npv = -scenario.upfront;
  let year = 0;
  let approved = true;
  for (const stage of stages) {
    for (let k = 0; k < stage.years; k++) {
      year += 1;
      npv -= stage.cost / stage.years / (1 + discount) ** year;
    }
    if (random() >= stage.probability) {
      approved = false;
      break;
    }
  }
  if (approved) {
    npv += commercialPv(sampled, year) - launchCost / (1 + discount) ** year;
  }
  return { npv, approved };
}

interface PreparedSimulation {
  scenario: RnpvScenario;
  settings: MonteCarloSettings;
  random: () => number;
  samples: number[];
  approvals: number;
  negative: number;
  completed: number;
}

function prepareSimulation(
  scenario: RnpvScenario,
  settings: MonteCarloSettings,
): PreparedSimulation {
  validateScenario(scenario);
  assertSettings(settings);
  return {
    scenario,
    settings: { ...settings },
    random: seededRandom(settings.seed),
    samples: [],
    approvals: 0,
    negative: 0,
    completed: 0,
  };
}

function advanceSimulation(prepared: PreparedSimulation, count: number): void {
  const end = Math.min(
    prepared.settings.iterations,
    prepared.completed + count,
  );
  for (let i = prepared.completed; i < end; i++) {
    const path = realizedNpv(
      prepared.scenario,
      prepared.settings,
      prepared.random,
    );
    if (path.approved) prepared.approvals += 1;
    if (path.npv < 0) prepared.negative += 1;
    prepared.samples.push(path.npv);
  }
  prepared.completed = end;
}

function finalizeSimulation(prepared: PreparedSimulation): MonteCarloResult {
  const samples = prepared.samples;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (samples.length - 1);
  const standardError = Math.sqrt(Math.max(0, variance) / samples.length);
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    modelVersion: RNPV_MODEL_VERSION,
    timingConvention: TIMING_CONVENTION_ID,
    valuationPoint: "stage-entry",
    settings: prepared.settings,
    mean,
    standardError,
    meanInterval95: [
      mean - 1.96 * standardError,
      mean + 1.96 * standardError,
    ],
    p10: quantile(sorted, 0.1),
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    negativeProbability: prepared.negative / samples.length,
    approvalFrequency: prepared.approvals / samples.length,
    samples,
  };
}

/**
 * Simulate realized development paths.
 * Do not probability-weight sampled cash flows again.
 */
export function simulateRnpv(
  scenario: RnpvScenario,
  settings: MonteCarloSettings,
): MonteCarloResult {
  const prepared = prepareSimulation(scenario, settings);
  advanceSimulation(prepared, settings.iterations);
  return finalizeSimulation(prepared);
}

export interface SimulationProgress {
  completed: number;
  total: number;
}

/**
 * Same sampler as `simulateRnpv`, yielding to the event loop between chunks
 * so a long run does not freeze the page.
 */
export async function simulateRnpvYielding(
  scenario: RnpvScenario,
  settings: MonteCarloSettings,
  options?: {
    chunkSize?: number;
    signal?: AbortSignal;
    onProgress?: (progress: SimulationProgress) => void;
  },
): Promise<MonteCarloResult> {
  const chunkSize = options?.chunkSize ?? 2_000;
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("Chunk size must be a positive integer.");
  }
  const prepared = prepareSimulation(scenario, settings);
  while (prepared.completed < settings.iterations) {
    if (options?.signal?.aborted) {
      throw new DOMException("The simulation was cancelled.", "AbortError");
    }
    const step = Math.min(chunkSize, settings.iterations - prepared.completed);
    advanceSimulation(prepared, step);
    options?.onProgress?.({
      completed: prepared.completed,
      total: settings.iterations,
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  return finalizeSimulation(prepared);
}
