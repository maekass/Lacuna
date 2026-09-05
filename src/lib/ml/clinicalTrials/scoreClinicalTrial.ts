import modelCard from "@/data/ml/clinical-trials/model-card.json";
import whRelevanceArtifact from "@/data/ml/clinical-trials/wh-relevance-v1.json";
import completionProxyArtifact from "@/data/ml/clinical-trials/completion-proxy-v2.json";
import { scoreTfidfLogistic } from "@/lib/ml/clinicalTrials/inference";
import type {
  TfidfLogisticArtifact,
  TrialModelScore,
  TrialScoreInput,
} from "@/lib/ml/clinicalTrials/types";

export const WH_RELEVANCE_MODEL = whRelevanceArtifact as TfidfLogisticArtifact;

const completionEnabled =
  modelCard.exportGate.committedCompletionPasses === true &&
  modelCard.models.completionProxy != null;

const COMPLETION_PROXY_MODEL = completionEnabled
  ? (completionProxyArtifact as TfidfLogisticArtifact)
  : null;

/** Score whether a trial excerpt is women's-health relevant. */
export function scoreWhTrialRelevance(
  input: TrialScoreInput,
): TrialModelScore {
  return scoreTfidfLogistic(WH_RELEVANCE_MODEL, input);
}

/**
 * Completion proxy: P(COMPLETED | stopped early) using text + phase/enrollment features.
 * Only scored when model passed offline eval gate (see model-card.json).
 */
export function scoreTrialCompletionProxy(
  input: TrialScoreInput,
): TrialModelScore | null {
  if (!COMPLETION_PROXY_MODEL) return null;
  return scoreTfidfLogistic(COMPLETION_PROXY_MODEL, input);
}

export interface ClinicalTrialMlScores {
  readonly whRelevance: TrialModelScore;
  readonly completionProxy: TrialModelScore | null;
}

/** Run all exported clinical-trial ML models on a CT.gov row. */
export function scoreClinicalTrial(
  input: TrialScoreInput,
): ClinicalTrialMlScores {
  return {
    whRelevance: scoreWhTrialRelevance(input),
    completionProxy: scoreTrialCompletionProxy(input),
  };
}

export const CLINICAL_TRIALS_ML_MODEL = {
  module: "src/lib/ml/clinicalTrials/scoreClinicalTrial.ts",
  exportName: "scoreClinicalTrial",
  definition:
    "Offline sklearn TF-IDF + logistic on ClinicalTrials.gov (WH relevance + optional completion proxy). Retrain: npm run ml:ct:train. Not clinical advice.",
} as const;

export function getClinicalTrialsTrainingSource(): string {
  return modelCard.trainingSource ?? "unknown";
}

const RELEASED_TRAINING_SOURCES = new Set(["ctgov_live", "ctgov_cached"]);

/**
 * Synthetic-seed artifacts are CI/offline fallbacks. Do not render model
 * percentages in production UI until training is live ClinicalTrials.gov data.
 */
export function areClinicalTrialMlScoresReleased(): boolean {
  return RELEASED_TRAINING_SOURCES.has(getClinicalTrialsTrainingSource());
}

export function getWhRelevanceModelMetrics(): Readonly<Record<string, number>> {
  return modelCard.models.whRelevance.metrics;
}

export function getCompletionProxyMetrics():
  | Readonly<Record<string, number>>
  | null {
  if (!completionEnabled) return null;
  const served = modelCard.models.completionProxy;
  if (!served || typeof served !== "object") return null;
  if ("metrics" in served && served.metrics && typeof served.metrics === "object") {
    return served.metrics;
  }
  return served as Readonly<Record<string, number>>;
}

export function isCompletionProxyAvailable(): boolean {
  return completionEnabled;
}
