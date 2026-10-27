/**
 * Embedding cosine similarity for response meaning.
 * The hashing embedder is the offline stand-in. The sentence-transformer
 * embedder lives in `scripts/evals/sentenceTransformerEmbedder.ts` so the
 * model runtime stays out of the Next.js bundle.
 */

import type { MetricRange } from "@/lib/ai/evals/responseTypes";

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "and",
  "or",
  "in",
  "on",
  "for",
  "is",
  "are",
  "this",
  "that",
  "with",
  "from",
  "as",
  "it",
  "be",
  "was",
  "by",
  "at",
]);

/** Content tokens used by the hashing embedder and the relevance score. */
export function contentTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9$]+/g) ?? []).filter((token) =>
    token.length > 2 && !STOP.has(token)
  );
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

function l2(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

/**
 * Fixed-width hashing sentence embedding.
 * Same tokens land in the same dimensions, so paraphrases that share
 * meaning-bearing words sit near each other under cosine similarity.
 */
export function hashingEmbed(text: string, dims = 128): number[] {
  const vector = new Array<number>(dims).fill(0);
  for (const token of contentTokens(text)) {
    const hash = hashToken(token);
    const index = Math.abs(hash) % dims;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign;
  }
  return l2(vector);
}

/** Cosine similarity in [-1, 1]. A zero vector yields 0. */
export function cosineSimilarity(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < length; i++) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

/** Mean-pool token vectors, then L2-normalize. Used by the transformer embedder. */
export function meanPool(
  tokenVectors: readonly (readonly number[])[],
): number[] {
  const first = tokenVectors[0];
  if (!first || first.length === 0) return [];
  const sum = new Array<number>(first.length).fill(0);
  let used = 0;
  for (const row of tokenVectors) {
    if (row.length !== first.length) continue;
    used += 1;
    for (let i = 0; i < first.length; i++) sum[i] += row[i] ?? 0;
  }
  if (used === 0) return [];
  for (let i = 0; i < sum.length; i++) sum[i] /= used;
  return l2(sum);
}

/** Hashing-embedder cosine in [0, 1] after clamping numerical noise. */
export function hashingSimilarity(left: string, right: string): number {
  const score = cosineSimilarity(hashingEmbed(left), hashingEmbed(right));
  if (score > 1) return 1;
  if (score < 0) return 0;
  return score;
}

/** Inclusive range check for a numeric metric. */
export function withinRange(value: number, range: MetricRange): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}
