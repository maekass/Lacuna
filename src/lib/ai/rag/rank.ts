import type { EvidencePassage } from "./contracts";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "under",
  "what",
  "with",
]);

export function queryTokens(value: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of value.toLowerCase().split(/[^a-z0-9.]+/)) {
    const token = raw.replace(/^\.+|\.+$/g, "");
    if (token.length < 2 || STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function haystack(passage: EvidencePassage): Set<string> {
  const code = passage.record?.code ?? "";
  const metric = passage.record?.metric ?? "";
  return new Set(queryTokens(
    [
      passage.passageId,
      passage.sourceId,
      passage.documentId,
      passage.title,
      passage.locator,
      passage.payer ?? "",
      passage.setting ?? "",
      passage.text ?? "",
      code,
      metric,
    ].join(" "),
  ));
}

/** Higher is better. Zero means the passage is not a lexical candidate. */
export function lexicalScore(query: string, passage: EvidencePassage): number {
  const trimmed = query.trim();
  if (!trimmed) return 0;
  let score = 0;
  if (
    trimmed === passage.passageId ||
    trimmed === passage.sourceId ||
    trimmed === passage.documentId
  ) {
    score += 1_000;
  }
  const tokens = queryTokens(trimmed);
  const words = haystack(passage);
  for (const token of tokens) {
    if (words.has(token)) score += 10;
  }
  const code = passage.record?.code?.toLowerCase();
  if (code && tokens.includes(code)) score += 50;
  return score;
}

export function rankPassages(
  passages: readonly EvidencePassage[],
  query: string,
  topK: number,
): EvidencePassage[] {
  return passages
    .map((passage) => ({ passage, score: lexicalScore(query, passage) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.passage.passageId.localeCompare(right.passage.passageId);
    })
    .slice(0, topK)
    .map((item) => item.passage);
}
