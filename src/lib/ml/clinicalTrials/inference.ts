import type { TfidfLogisticArtifact, TrialModelScore, TrialScoreInput } from "./types";
import { trialNumericFeatures, trialTextCorpus } from "./types";

const TOKEN_PATTERN = /\b[a-z0-9']+\b/g;

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  return normalized.match(TOKEN_PATTERN) ?? [];
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
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

/**
 * Score text (+ optional numeric features) with an exported TF-IDF + logistic model.
 */
export function scoreTfidfLogistic(
  artifact: TfidfLogisticArtifact,
  input: TrialScoreInput,
  threshold = 0.5,
): TrialModelScore {
  const corpus = trialTextCorpus(input);
  const tokens = tokenize(corpus);
  const tf = termFrequency(tokens);
  const vocabIndex = buildVocabIndex(artifact.vocabulary);

  let logit = artifact.intercept;
  for (const [term, count] of tf) {
    const idx = vocabIndex.get(term);
    if (idx === undefined) continue;
    const idf = artifact.idf[idx] ?? 0;
    const tfidf = (1 + Math.log(count)) * idf;
    logit += (artifact.coefficients[idx] ?? 0) * tfidf;
  }

  if (
    artifact.numericCoefficients &&
    artifact.numericMeans &&
    artifact.numericScales
  ) {
    const numeric = scaleNumeric(
      trialNumericFeatures(input),
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
