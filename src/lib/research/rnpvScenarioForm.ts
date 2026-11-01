/**
 * Form state for the analyst sandbox. Preset figures are round hypotheticals.
 * This module does not read the published benchmark reference layer.
 */

import type {
  MonteCarloSettings,
  RnpvScenario,
} from "@/lib/research/rnpvSimulator";

export const ILLUSTRATIVE_PRESET_ID = "illustrative-round-v1";

export const STAGE_ORDER = [
  "preclinical",
  "phase1",
  "phase2",
  "phase3",
  "submission",
] as const;

export type StageId = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<StageId, string> = {
  preclinical: "Preclinical",
  phase1: "Phase I",
  phase2: "Phase II",
  phase3: "Phase III",
  submission: "Regulatory submission",
};

export interface StageDraft {
  years: string;
  probabilityPercent: string;
  cost: string;
}

export interface ScenarioFormState {
  startStage: StageId;
  discountPercent: string;
  peakSales: string;
  marginPercent: string;
  taxPercent: string;
  commercialYears: string;
  rampYears: string;
  peakYears: string;
  declinePercent: string;
  upfront: string;
  launchCost: string;
  stages: Record<StageId, StageDraft>;
  preclinicalRationale: string;
  assumptionNotes: string;
  iterations: string;
  seed: string;
  financialSpreadPercent: string;
  probabilitySpreadPoints: string;
  presetId: string | null;
}

export type NumericFormKey =
  | "discountPercent"
  | "peakSales"
  | "marginPercent"
  | "taxPercent"
  | "commercialYears"
  | "rampYears"
  | "peakYears"
  | "declinePercent"
  | "upfront"
  | "launchCost"
  | "iterations"
  | "seed"
  | "financialSpreadPercent"
  | "probabilitySpreadPoints";

export interface AssumptionField {
  key: NumericFormKey;
  label: string;
  unit: string;
  help: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
}

export const CAPITAL_FIELDS: readonly AssumptionField[] = [
  {
    key: "discountPercent",
    label: "Discount rate",
    unit: "percent per year",
    help: "Annual rate used to discount year-end cash flows.",
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    key: "upfront",
    label: "Certain upfront cost",
    unit: "USD million, paid now",
    help:
      "Cash that must be paid at the valuation date regardless of outcome. Historical spend is excluded unless you enter it here.",
    min: 0,
    max: 1_000_000,
    step: 0.1,
  },
  {
    key: "launchCost",
    label: "Launch investment",
    unit: "USD million",
    help:
      "Paid at the end of the development completion year, and only if every remaining stage succeeds.",
    min: 0,
    max: 1_000_000,
    step: 0.1,
  },
];

export const COMMERCIAL_FIELDS: readonly AssumptionField[] = [
  {
    key: "peakSales",
    label: "Peak annual sales",
    unit: "USD million per year",
    help: "Sales level reached in the final ramp year.",
    min: 0,
    max: 1_000_000,
    step: 0.1,
  },
  {
    key: "marginPercent",
    label: "Operating cash margin",
    unit: "percent of sales",
    help: "Cash operating margin before tax. Not a valuation multiple.",
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    key: "taxPercent",
    label: "Tax rate",
    unit: "percent of operating cash flow",
    help:
      "Applied to commercial cash flow only. Development costs are not tax-shielded.",
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    key: "commercialYears",
    label: "Commercial forecast horizon",
    unit: "years after first revenue",
    help: "Finite horizon. There is no terminal value after the last year.",
    min: 1,
    max: 40,
    step: 1,
    integer: true,
  },
  {
    key: "rampYears",
    label: "Sales ramp",
    unit: "years",
    help:
      "Sales rise linearly and reach the peak in the final ramp year. A ramp longer than the horizon never reaches the decline.",
    min: 1,
    max: 40,
    step: 1,
    integer: true,
  },
  {
    key: "peakYears",
    label: "Additional years at peak",
    unit: "years",
    help: "Years at peak after the final ramp year, before the decline starts.",
    min: 0,
    max: 40,
    step: 1,
    integer: true,
  },
  {
    key: "declinePercent",
    label: "Post-peak decline",
    unit: "percent per year",
    help: "Geometric decline applied after the peak window.",
    min: 0,
    max: 100,
    step: 0.1,
  },
];

export const MONTE_CARLO_FIELDS: readonly AssumptionField[] = [
  {
    key: "iterations",
    label: "Iterations",
    unit: "paths",
    help:
      "Between 100 and 10,000. More paths shrink sampling error. They do not make the assumptions true.",
    min: 100,
    max: 10_000,
    step: 1,
    integer: true,
  },
  {
    key: "seed",
    label: "Random seed",
    unit: "integer from 0 to 4,294,967,295",
    help:
      "The same seed and inputs reproduce the same paths. The generator is not cryptographic.",
    min: 0,
    max: 4_294_967_295,
    step: 1,
    integer: true,
  },
  {
    key: "financialSpreadPercent",
    label: "Financial uncertainty range",
    unit: "± percent of the entered value",
    help:
      "Independent uniform range for the discount rate, peak sales, launch investment, and stage costs. A zero base stays zero.",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "probabilitySpreadPoints",
    label: "Probability uncertainty range",
    unit: "± percentage points",
    help:
      "Independent uniform range for conditional probabilities that are not exactly 0% or 100%. Values are clipped to 0–100%. Exact 0% and 100% stay fixed.",
    min: 0,
    max: 100,
    step: 1,
  },
];

function emptyStage(): StageDraft {
  return { years: "", probabilityPercent: "", cost: "" };
}

function emptyStages(): Record<StageId, StageDraft> {
  return {
    preclinical: emptyStage(),
    phase1: emptyStage(),
    phase2: emptyStage(),
    phase3: emptyStage(),
    submission: emptyStage(),
  };
}

/** Blank analyst form. No benchmark or company figures are filled in. */
export function blankScenarioForm(
  startStage: StageId = "phase1",
): ScenarioFormState {
  return {
    startStage,
    discountPercent: "",
    peakSales: "",
    marginPercent: "",
    taxPercent: "",
    commercialYears: "",
    rampYears: "",
    peakYears: "",
    declinePercent: "",
    upfront: "",
    launchCost: "",
    stages: emptyStages(),
    preclinicalRationale: "",
    assumptionNotes: "",
    iterations: "",
    seed: "",
    financialSpreadPercent: "",
    probabilitySpreadPoints: "",
    presetId: null,
  };
}

/**
 * Round hypothetical teaching inputs. Not observed company data and not a
 * published success-rate table. Load only after the analyst acknowledges that.
 */
export function illustrativePreset(): ScenarioFormState {
  const stages = emptyStages();
  stages.phase1 = { years: "2", probabilityPercent: "33", cost: "7" };
  stages.phase2 = { years: "2", probabilityPercent: "33", cost: "14" };
  stages.phase3 = { years: "3", probabilityPercent: "33", cost: "41" };
  stages.submission = { years: "1", probabilityPercent: "33", cost: "5" };
  return {
    startStage: "phase1",
    discountPercent: "12",
    peakSales: "73",
    marginPercent: "46",
    taxPercent: "22",
    commercialYears: "8",
    rampYears: "3",
    peakYears: "2",
    declinePercent: "16",
    upfront: "0",
    launchCost: "9",
    stages,
    preclinicalRationale: "",
    assumptionNotes: "",
    iterations: "2000",
    seed: "42",
    financialSpreadPercent: "0",
    probabilitySpreadPoints: "0",
    presetId: ILLUSTRATIVE_PRESET_ID,
  };
}

export function isStageId(value: string): value is StageId {
  return (STAGE_ORDER as readonly string[]).includes(value);
}

/** Stages that are still ahead, including the selected stage, at stage entry. */
export function stagesFromStart(startStage: StageId): StageId[] {
  return STAGE_ORDER.slice(STAGE_ORDER.indexOf(startStage));
}

export interface ParsedScenario {
  ok: true;
  scenario: RnpvScenario;
  settings: MonteCarloSettings;
}

export interface ScenarioParseFailure {
  ok: false;
  errors: string[];
  fieldErrors: Record<string, string>;
}

function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "").replace(/%$/, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function requireNumber(
  fieldErrors: Record<string, string>,
  errors: string[],
  key: string,
  label: string,
  raw: string,
  min: number,
  max: number,
  integer = false,
): number {
  const value = parseDecimal(raw);
  if (
    value === null || value < min || value > max ||
    (integer && !Number.isInteger(value))
  ) {
    const detail = integer
      ? `${label} must be a whole number from ${min} to ${max}.`
      : `${label} must be a number from ${min} to ${max}.`;
    fieldErrors[key] = detail;
    errors.push(detail);
    return Number.NaN;
  }
  return value;
}

/**
 * Convert the form into a scenario that contains only the selected stage and
 * later stages. Preclinical inputs are rejected until the analyst writes a rationale.
 */
export function parseScenarioForm(
  form: ScenarioFormState,
): ParsedScenario | ScenarioParseFailure {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  const active = stagesFromStart(form.startStage);
  if (form.startStage === "preclinical" && !form.preclinicalRationale.trim()) {
    const detail =
      "Enter a rationale for the preclinical probability, duration, and cost. Lacuna does not supply a preclinical benchmark.";
    fieldErrors.preclinicalRationale = detail;
    errors.push(detail);
  }

  const discount = requireNumber(
    fieldErrors,
    errors,
    "discountPercent",
    "Discount rate",
    form.discountPercent,
    0,
    100,
  ) / 100;
  const peakSales = requireNumber(
    fieldErrors,
    errors,
    "peakSales",
    "Peak annual sales",
    form.peakSales,
    0,
    1_000_000,
  );
  const margin = requireNumber(
    fieldErrors,
    errors,
    "marginPercent",
    "Operating cash margin",
    form.marginPercent,
    0,
    100,
  ) / 100;
  const tax = requireNumber(
    fieldErrors,
    errors,
    "taxPercent",
    "Tax rate",
    form.taxPercent,
    0,
    100,
  ) / 100;
  const commercialYears = requireNumber(
    fieldErrors,
    errors,
    "commercialYears",
    "Commercial forecast horizon",
    form.commercialYears,
    1,
    40,
    true,
  );
  const rampYears = requireNumber(
    fieldErrors,
    errors,
    "rampYears",
    "Sales ramp",
    form.rampYears,
    1,
    40,
    true,
  );
  const plateauYears = requireNumber(
    fieldErrors,
    errors,
    "peakYears",
    "Additional years at peak",
    form.peakYears,
    0,
    40,
    true,
  );
  const decline = requireNumber(
    fieldErrors,
    errors,
    "declinePercent",
    "Post-peak decline",
    form.declinePercent,
    0,
    100,
  ) / 100;
  const upfront = requireNumber(
    fieldErrors,
    errors,
    "upfront",
    "Certain upfront cost",
    form.upfront,
    0,
    1_000_000,
  );
  const launchCost = requireNumber(
    fieldErrors,
    errors,
    "launchCost",
    "Launch investment",
    form.launchCost,
    0,
    1_000_000,
  );
  const iterations = requireNumber(
    fieldErrors,
    errors,
    "iterations",
    "Iterations",
    form.iterations,
    100,
    10_000,
    true,
  );
  const seed = requireNumber(
    fieldErrors,
    errors,
    "seed",
    "Random seed",
    form.seed,
    0,
    4_294_967_295,
    true,
  );
  const financialSpread = requireNumber(
    fieldErrors,
    errors,
    "financialSpreadPercent",
    "Financial uncertainty range",
    form.financialSpreadPercent,
    0,
    100,
  ) / 100;
  const probabilitySpread = requireNumber(
    fieldErrors,
    errors,
    "probabilitySpreadPoints",
    "Probability uncertainty range",
    form.probabilitySpreadPoints,
    0,
    100,
  ) / 100;

  const stages = active.map((id) => {
    const draft = form.stages[id];
    const prefix = `stage-${id}`;
    const years = requireNumber(
      fieldErrors,
      errors,
      `${prefix}-years`,
      `${STAGE_LABELS[id]} duration`,
      draft.years,
      1,
      15,
      true,
    );
    const probability = requireNumber(
      fieldErrors,
      errors,
      `${prefix}-probability`,
      `${STAGE_LABELS[id]} conditional success probability`,
      draft.probabilityPercent,
      0,
      100,
    ) / 100;
    const cost = requireNumber(
      fieldErrors,
      errors,
      `${prefix}-cost`,
      `${STAGE_LABELS[id]} future cost`,
      draft.cost,
      0,
      1_000_000,
    );
    return { name: STAGE_LABELS[id], years, probability, cost };
  });

  if (errors.length > 0) return { ok: false, errors, fieldErrors };
  return {
    ok: true,
    scenario: {
      discount,
      peakSales,
      margin,
      tax,
      commercialYears,
      rampYears,
      plateauYears,
      decline,
      upfront,
      launchCost,
      stages,
    },
    settings: { iterations, seed, financialSpread, probabilitySpread },
  };
}
