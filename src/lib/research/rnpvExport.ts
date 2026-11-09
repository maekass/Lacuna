/**
 * JSON export for the analyst sandbox. Stale simulations are omitted.
 */

import type { ScenarioFormState } from "@/lib/research/rnpvScenarioForm";
import {
  RNPV_MODEL_VERSION,
  TIMING_CONVENTION,
  TIMING_CONVENTION_ID,
} from "@/lib/research/rnpvSimulator";
import type {
  MonteCarloResult,
  MonteCarloSettings,
  RnpvResult,
  RnpvScenario,
} from "@/lib/research/rnpvSimulator";

export const RNPV_EXPORT_LIMITATIONS =
  "Hypothetical analyst assumptions. Independent uniform input ranges are not calibrated distributions, confidence intervals, or clinical predictions. Outputs are not investment recommendations, company rankings, or verified valuations, and they do not feed Lacuna deal scores.";

export interface RnpvExportDocument {
  modelVersion: typeof RNPV_MODEL_VERSION;
  timingConvention: typeof TIMING_CONVENTION_ID;
  timingSummary: string;
  valuationPoint: "stage-entry";
  startingStage: string;
  presetId: string | null;
  acknowledgedHypothetical: true;
  scenario: RnpvScenario;
  monteCarlo: MonteCarloSettings;
  assumptionNotes: string;
  preclinicalRationale: string;
  deterministic: RnpvResult;
  simulation: MonteCarloResult | null;
  simulationFresh: boolean;
  limitations: string;
}

export function buildRnpvExport(input: {
  form: ScenarioFormState;
  scenario: RnpvScenario;
  settings: MonteCarloSettings;
  deterministic: RnpvResult;
  simulation: MonteCarloResult | null;
  fresh: boolean;
}): RnpvExportDocument {
  const freshSimulation = input.fresh && input.simulation
    ? input.simulation
    : null;
  return {
    modelVersion: RNPV_MODEL_VERSION,
    timingConvention: TIMING_CONVENTION_ID,
    timingSummary: TIMING_CONVENTION,
    valuationPoint: "stage-entry",
    startingStage: input.form.startStage,
    presetId: input.form.presetId,
    acknowledgedHypothetical: true,
    scenario: input.scenario,
    monteCarlo: input.settings,
    assumptionNotes: input.form.assumptionNotes.trim(),
    preclinicalRationale: input.form.preclinicalRationale.trim(),
    deterministic: input.deterministic,
    simulation: freshSimulation,
    simulationFresh: freshSimulation !== null,
    limitations: RNPV_EXPORT_LIMITATIONS,
  };
}
