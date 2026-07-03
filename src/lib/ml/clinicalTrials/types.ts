/** Portable TF-IDF + logistic binary classifier exported from scikit-learn. */
export interface TfidfLogisticArtifact {
  readonly id: string;
  readonly modelType: "tfidf_logistic_binary";
  readonly task: string;
  readonly trainedAt: string;
  readonly metrics: Readonly<Record<string, number>>;
  readonly positiveLabel: string;
  /** Index-aligned vocabulary terms. */
  readonly vocabulary: readonly string[];
  readonly idf: readonly number[];
  readonly coefficients: readonly number[];
  readonly intercept: number;
  readonly numericFeatureNames?: readonly string[];
}

export interface TrialScoreInput {
  readonly title: string;
  readonly condition: string;
  readonly sponsor: string;
  readonly interventions?: readonly string[];
  readonly phase?: string;
  readonly status?: string;
  readonly enrollment?: number;
}

export interface TrialModelScore {
  readonly probability: number;
  readonly label: boolean;
  readonly modelId: string;
  readonly task: string;
}

export function trialTextCorpus(input: TrialScoreInput): string {
  const interventions = (input.interventions ?? []).join(", ");
  return [input.title, input.condition, interventions, input.sponsor]
    .filter(Boolean)
    .join(" ");
}
