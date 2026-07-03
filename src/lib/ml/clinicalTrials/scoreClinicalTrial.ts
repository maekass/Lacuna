import modelCard from "@/data/ml/clinical-trials/model-card.json";
import whRelevanceArtifact from "@/data/ml/clinical-trials/wh-relevance-v1.json";
import { scoreTfidfLogistic } from "@/lib/ml/clinicalTrials/inference";
import type {
  TfidfLogisticArtifact,
  TrialModelScore,
  TrialScoreInput,
} from "@/lib/ml/clinicalTrials/types";

export const WH_RELEVANCE_MODEL = whRelevanceArtifact as TfidfLogisticArtifact;

/** Score whether a trial excerpt is women's-health relevant. */
export function scoreWhTrialRelevance(
  input: TrialScoreInput,
): TrialModelScore {
  return scoreTfidfLogistic(WH_RELEVANCE_MODEL, input);
}

export const CLINICAL_TRIALS_ML_MODEL = {
  module: "src/lib/ml/clinicalTrials/scoreClinicalTrial.ts",
  exportName: "scoreWhTrialRelevance",
  definition:
    "Offline TF-IDF + logistic regression on ClinicalTrials.gov text fields. Retrain with npm run ml:ct:train. Not clinical advice.",
} as const;

export function getClinicalTrialsTrainingSource(): string {
  return modelCard.trainingSource ?? "unknown";
}

export function getWhRelevanceModelMetrics(): Readonly<Record<string, number>> {
  return modelCard.models.whRelevance.metrics;
}
