import type {
  TfidfLogisticArtifact,
  TrialModelScore,
  TrialScoreInput,
} from "./types";
import { trialNumericFeatures, trialTextCorpus } from "./types";

/** sklearn TfidfVectorizer default: `(?u)\\b\\w\\w+\\b` after lowercasing. */
const TOKEN_PATTERN = /[a-z0-9_]{2,}/g;

function tokenize(text: string): string[] {
  return text.toLowerCase().match(TOKEN_PATTERN) ?? [];
}

/** Unigrams plus consecutive bigrams, matching `ngram_range=(1, 2)`. */
export function ngrams(tokens: readonly string[]): string[] {
  const terms = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    terms.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return terms;
}

function termFrequency(terms: readonly string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }
  return tf;
}

function buildVocabIndex(vocabulary: readonly string[]): Map<string, number> {
  const index = new Map<string, number>();
  vocabulary.forEach((term, idx) => {
    if (term) index.set(term, idx);
  });
  return index;
}

function l2Normalize(values: Map<number, number>): Map<number, number> {
  let sumSquares = 0;
  for (const value of values.values()) {
    sumSquares += value * value;
  }
  const norm = Math.sqrt(sumSquares);
  if (norm === 0) return values;
  const next = new Map<number, number>();
  for (const [idx, value] of values) {
    next.set(idx, value / norm);
  }
  return next;
}

function scaleNumeric(
  values: number[],
  means: readonly number[],
  scales: readonly number[],
): number[] {
  return values.map((v, i) => {
    const scale = scales[i] || 1;
    return (v - (means[i] ?? 0)) / scale;
  });
}

function numericForArtifact(
  artifact: TfidfLogisticArtifact,
  input: TrialScoreInput,
): number[] {
  const all = trialNumericFeatures(input);
  const names = artifact.numericFeatureNames;
  if (!names || names.length === 0) return all;
  const byName: Record<string, number> = {
    phase_num: all[0] ?? 0,
    enrollment_log10: all[1] ?? 0,
    intervention_count: all[2] ?? 0,
    has_results_flag: all[3] ?? 0,
  };
  return names.map((name) => byName[name] ?? 0);
}

/**
 * Score text (+ optional numeric features) with an exported TF-IDF + logistic
 * model. Matches sklearn `TfidfVectorizer(ngram_range=(1,2), sublinear_tf=False,
 * norm="l2")` then `LogisticRegression.predict_proba`.
 */
export function scoreTfidfLogistic(
  artifact: TfidfLogisticArtifact,
  input: TrialScoreInput,
  threshold = 0.5,
): TrialModelScore {
  const tokens = tokenize(trialTextCorpus(input));
  const tf = termFrequency(ngrams(tokens));
  const vocabIndex = buildVocabIndex(artifact.vocabulary);

  const raw = new Map<number, number>();
  for (const [term, count] of tf) {
    const idx = vocabIndex.get(term);
    if (idx === undefined) continue;
    const idf = artifact.idf[idx] ?? 0;
    raw.set(idx, count * idf);
  }
  const normalized = l2Normalize(raw);

  let logit = artifact.intercept;
  for (const [idx, value] of normalized) {
    logit += (artifact.coefficients[idx] ?? 0) * value;
  }

  if (
    artifact.numericCoefficients &&
    artifact.numericMeans &&
    artifact.numericScales
  ) {
    const numeric = scaleNumeric(
      numericForArtifact(artifact, input),
      artifact.numericMeans,
      artifact.numericScales,
    );
    for (let i = 0; i < numeric.length; i++) {
      logit += (artifact.numericCoefficients[i] ?? 0) * numeric[i];
    }
  }

  const probability = 1 / (1 + Math.exp(-logit));
  return {
    probability,
    label: probability >= threshold,
    modelId: artifact.id,
    task: artifact.task,
  };
}
