/**
 * Deterministic scorers for the lift eval. No LLM judge.
 *
 * Per response:
 * - correct: answerable item, not abstained, gold value present in the answer
 * - citationCorrect: answerable + answered; cited ⊆ retrieved and cites a gold passage
 * - unsupported: answered; asserts a money/date/year value absent from cited passages
 * - abstained: disposition is "abstain"
 */
import type { EvidencePassage } from "@/lib/ai/rag/contracts";
import {
  type ExtractedValues,
  extractValues,
  mentionsEntity,
  usdMatches,
} from "./extract";
import {
  LIFT_AS_OF_DATE,
  type LiftEvalItem,
  type LiftResponseRecord,
} from "./types";

export interface ItemScore {
  itemId: string;
  type: LiftEvalItem["type"];
  abstained: boolean;
  /** null when the item is not answerable. */
  correct: boolean | null;
  /** null when not answerable or abstained. */
  citationCorrect: boolean | null;
  /** null when abstained. */
  unsupported: boolean | null;
  unsupportedValues: string[];
  errored: boolean;
}

function responseText(response: LiftResponseRecord): string {
  return [response.answer, ...response.claimTexts].join("\n");
}

/** Does the answer state the gold value? */
export function answerMatchesGold(item: LiftEvalItem, text: string): boolean {
  const gold = item.gold;
  if (gold.value === null) return false;
  const values = extractValues(text);
  switch (gold.kind) {
    case "usd_millions":
      return typeof gold.value === "number" &&
        values.usdMillions.some((value) =>
          usdMatches(value, gold.value as number)
        );
    case "iso_date":
      return values.isoDates.includes(String(gold.value));
    case "year": {
      const year = Number(gold.value);
      return values.years.includes(year) ||
        values.isoDates.some((date) => date.startsWith(`${year}-`));
    }
    case "entity": {
      const aliases = gold.aliases.length > 0
        ? gold.aliases
        : [String(gold.value)];
      return aliases.some((alias) => mentionsEntity(text, alias));
    }
    case "none":
      return false;
  }
}

function supportSet(
  citedIds: readonly string[],
  corpusById: ReadonlyMap<string, EvidencePassage>,
): ExtractedValues {
  const texts = citedIds.flatMap((id) => {
    const passage = corpusById.get(id);
    return passage?.text ? [passage.text] : [];
  });
  return extractValues(texts.join("\n"));
}

/** Values asserted in the response that the cited passages do not hold. */
export function unsupportedValues(
  response: LiftResponseRecord,
  item: LiftEvalItem,
  corpusById: ReadonlyMap<string, EvidencePassage>,
): string[] {
  const asserted = extractValues(responseText(response));
  const support = supportSet(response.citedIds, corpusById);
  // Values the user supplied are not claims by the model.
  const given = extractValues(`${item.question}\n${LIFT_AS_OF_DATE}`);
  const supportedDates = new Set([...support.isoDates, ...given.isoDates]);
  const supportedYears = new Set([
    ...support.years,
    ...given.years,
    ...[...supportedDates].map((date) => Number(date.slice(0, 4))),
  ]);
  const supportedMoney = [...support.usdMillions, ...given.usdMillions];
  const missing: string[] = [];
  for (const value of asserted.usdMillions) {
    if (!supportedMoney.some((known) => usdMatches(value, known))) {
      missing.push(`usd_millions:${value}`);
    }
  }
  for (const date of asserted.isoDates) {
    if (!supportedDates.has(date)) missing.push(`date:${date}`);
  }
  for (const year of asserted.years) {
    if (!supportedYears.has(year)) missing.push(`year:${year}`);
  }
  return missing;
}

/** Citation correctness: non-empty, all retrieved, at least one gold. */
export function citationIsCorrect(
  response: Pick<LiftResponseRecord, "citedIds" | "retrievedIds">,
  item: Pick<LiftEvalItem, "goldPassageIds">,
): boolean {
  if (response.citedIds.length === 0) return false;
  const retrieved = new Set(response.retrievedIds);
  if (!response.citedIds.every((id) => retrieved.has(id))) return false;
  return response.citedIds.some((id) => item.goldPassageIds.includes(id));
}

export function scoreResponse(
  item: LiftEvalItem,
  response: LiftResponseRecord,
  corpusById: ReadonlyMap<string, EvidencePassage>,
): ItemScore {
  const abstained = response.disposition === "abstain";
  const answerable = item.type === "answerable";
  const missing = abstained
    ? []
    : unsupportedValues(response, item, corpusById);
  return {
    itemId: item.id,
    type: item.type,
    abstained,
    correct: answerable
      ? !abstained && answerMatchesGold(item, responseText(response))
      : null,
    citationCorrect: answerable && !abstained
      ? citationIsCorrect(response, item)
      : null,
    unsupported: abstained ? null : missing.length > 0,
    unsupportedValues: missing,
    errored: Boolean(response.error),
  };
}

/** Item-level indicator vectors; null = not in the metric's denominator. */
export const METRIC_NAMES = [
  "accuracy",
  "citationCorrectness",
  "unsupportedClaimRate",
  "abstentionRate",
  "falseAbstentionRate",
] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export function metricIndicator(
  score: ItemScore,
  metric: MetricName,
): number | null {
  const bit = (value: boolean | null) => value === null ? null : value ? 1 : 0;
  switch (metric) {
    case "accuracy":
      return bit(score.correct);
    case "citationCorrectness":
      return bit(score.citationCorrect);
    case "unsupportedClaimRate":
      return bit(score.unsupported);
    case "abstentionRate":
      return score.type === "should_abstain" ? (score.abstained ? 1 : 0) : null;
    case "falseAbstentionRate":
      return score.type === "answerable" ? (score.abstained ? 1 : 0) : null;
  }
}

/** Share of answerable items whose gold passage the retriever returned. */
export function retrievalHit(
  item: Pick<LiftEvalItem, "goldPassageIds">,
  retrievedIds: readonly string[],
): boolean {
  return item.goldPassageIds.some((id) => retrievedIds.includes(id));
}
