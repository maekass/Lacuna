/**
 * Offline classification eval — precision/recall vs golden fixtures.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModel } from "ai";
import type { DealClassificationAiOutput } from "@/lib/ai/schemas";
import {
  classifyDealAsync,
  type DealClassificationInput,
} from "@/lib/ingestion/dealClassificationEngine";

export interface GoldenClassificationCase {
  id: string;
  input: DealClassificationInput;
  expected: {
    womensHealthRelevant: boolean;
    confidence?: "high" | "medium" | "low";
  };
  mockAi: DealClassificationAiOutput;
}

export interface BinaryMetrics {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ClassificationEvalMismatch {
  id: string;
  expected: boolean;
  predicted: boolean;
}

export interface ClassificationEvalReport {
  pass: boolean;
  cases: number;
  metrics: BinaryMetrics;
  confidenceExact: number;
  mismatches: ClassificationEvalMismatch[];
  modelId: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadGoldenClassificationFixtures(): GoldenClassificationCase[] {
  const path = join(
    __dirname,
    "fixtures",
    "deal-classification.golden.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as GoldenClassificationCase[];
}

export function computeBinaryMetrics(
  pairs: Array<{ expected: boolean; predicted: boolean }>,
): BinaryMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const { expected, predicted } of pairs) {
    if (expected && predicted) tp++;
    else if (!expected && predicted) fp++;
    else if (!expected && !predicted) tn++;
    else fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;
  return { tp, fp, tn, fn, precision, recall, f1 };
}

/** Build a mock model that returns fixture-specific structured JSON. */
export function mockModelForPayload(
  payload: DealClassificationAiOutput,
): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        content: [{ type: "text" as const, text: JSON.stringify(payload) }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage: {
          inputTokens: {
            total: 120,
            noCache: 120,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 80, text: 80, reasoning: undefined },
        },
        warnings: [],
      }),
  });
}

/**
 * Run golden-set eval with per-case mock models (no live API).
 * Pass thresholds to gate CI / npm run eval:llm.
 */
export async function runClassificationEval(options: {
  minPrecision?: number;
  minRecall?: number;
} = {}): Promise<ClassificationEvalReport> {
  const fixtures = loadGoldenClassificationFixtures();
  const minPrecision = options.minPrecision ?? 0.95;
  const minRecall = options.minRecall ?? 0.95;

  const pairs: Array<{ expected: boolean; predicted: boolean }> = [];
  const mismatches: ClassificationEvalMismatch[] = [];
  let confidenceExact = 0;

  for (const fixture of fixtures) {
    const model = mockModelForPayload(fixture.mockAi);
    const result = await classifyDealAsync(fixture.input, { model });
    pairs.push({
      expected: fixture.expected.womensHealthRelevant,
      predicted: result.womensHealthRelevant,
    });
    if (result.womensHealthRelevant !== fixture.expected.womensHealthRelevant) {
      mismatches.push({
        id: fixture.id,
        expected: fixture.expected.womensHealthRelevant,
        predicted: result.womensHealthRelevant,
      });
    }
    if (
      fixture.expected.confidence &&
      result.confidence === fixture.expected.confidence
    ) {
      confidenceExact++;
    }
  }

  const metrics = computeBinaryMetrics(pairs);
  const pass = mismatches.length === 0 &&
    metrics.precision >= minPrecision &&
    metrics.recall >= minRecall;

  return {
    pass,
    cases: fixtures.length,
    metrics,
    confidenceExact,
    mismatches,
    modelId: "mock-golden",
  };
}
