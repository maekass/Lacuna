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
  readonly numericCoefficients?: readonly number[];
  readonly numericMeans?: readonly number[];
  readonly numericScales?: readonly number[];
}

export interface TrialScoreInput {
  readonly title: string;
  readonly condition: string;
  readonly sponsor: string;
  readonly interventions?: readonly string[];
  readonly phase?: string;
  readonly status?: string;
  readonly enrollment?: number;
  readonly hasResults?: boolean;
}

export interface TrialModelScore {
  readonly probability: number;
  readonly label: boolean;
  readonly modelId: string;
  readonly task: string;
}

const PHASE_TO_NUM: Record<string, number> = {
  EARLY_PHASE1: 0.5,
  PHASE1: 1,
  PHASE2: 2,
  PHASE3: 3,
  PHASE4: 4,
  NA: 0,
  "Not Applicable": 0,
};

export function trialTextCorpus(input: TrialScoreInput): string {
  const interventions = (input.interventions ?? []).join(", ");
  return [input.title, input.condition, interventions, input.sponsor]
    .filter(Boolean)
    .join(" ");
}

/** Numeric features aligned with ml/clinical_trials/lacuna_ct/features.py */
export function trialNumericFeatures(input: TrialScoreInput): number[] {
  const phase = input.phase ?? "";
  const phaseNum = PHASE_TO_NUM[phase] ?? PHASE_TO_NUM[phase.toUpperCase()] ?? 0;
  const enrollment = Math.max(input.enrollment ?? 0, 1);
  const interventionCount = (input.interventions ?? []).filter(Boolean).length;
  const hasResults = input.hasResults ? 1 : 0;
  return [
    phaseNum,
    Math.log10(enrollment),
    interventionCount,
    hasResults,
  ];
}
