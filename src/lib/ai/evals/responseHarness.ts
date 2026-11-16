/**
 * Offline response harness.
 * Scores meaning with embedding cosine similarity and a judge, then checks
 * acceptable ranges. Reject-polarity cases pass when the candidate falls
 * outside the acceptable band.
 */

import { llmJudge, rubricJudge } from "@/lib/ai/evals/responseJudge";
import {
  ACCEPTABLE_RESPONSE_RANGES,
  HANDCRAFTED_PASS_RATE,
  type JudgeScores,
  type MetricRange,
  type ResponseBucket,
  type ResponseCaseResult,
  type ResponseEvalCase,
  type ResponseEvalReport,
} from "@/lib/ai/evals/responseTypes";
import {
  cosineSimilarity,
  hashingEmbed,
  withinRange,
} from "@/lib/ai/evals/similarity";

export type TextEmbedder = (
  text: string,
) => readonly number[] | Promise<readonly number[]>;

const BUCKETS: readonly ResponseBucket[] = ["happy", "edge", "adversarial"];

async function embedPair(
  embed: TextEmbedder,
  reference: string,
  candidate: string,
): Promise<number> {
  const [left, right] = await Promise.all([
    embed(reference),
    embed(candidate),
  ]);
  const score = cosineSimilarity(left, right);
  if (score > 1) return 1;
  if (score < 0) return 0;
  return score;
}

function rangeFailures(
  similarity: number,
  judge: JudgeScores,
  ranges: ResponseEvalCase["ranges"],
): string[] {
  const checks: Array<[string, number, MetricRange]> = [
    ["semanticSimilarity", similarity, ranges.semanticSimilarity],
    ["accuracy", judge.accuracy, ranges.accuracy],
    ["tone", judge.tone, ranges.tone],
    ["safety", judge.safety, ranges.safety],
    ["relevance", judge.relevance, ranges.relevance],
  ];
  return checks.filter(([, value, range]) => !withinRange(value, range)).map((
    [name, value, range],
  ) => `${name} ${value} outside ${range.min}–${range.max}`);
}

/** Score one candidate against its case. */
export async function scoreResponseCase(
  evalCase: ResponseEvalCase,
  options: {
    embed?: TextEmbedder;
    judge?: "rubric" | "llm";
    targetModelId?: string;
    candidate?: string;
  } = {},
): Promise<ResponseCaseResult> {
  const candidate = options.candidate ?? evalCase.candidate;
  const embed = options.embed ?? hashingEmbed;
  const similarity = await embedPair(
    embed,
    evalCase.referenceMeaning,
    candidate,
  );
  const judgeMode = options.judge ?? "rubric";
  const llmScores = judgeMode === "llm"
    ? await llmJudge(evalCase, candidate, options.targetModelId)
    : null;
  const judge = llmScores ?? rubricJudge(evalCase, candidate);
  const failures = rangeFailures(similarity, judge, evalCase.ranges);
  const within = failures.length === 0;
  const pass = evalCase.polarity === "accept" ? within : !within;
  return {
    id: evalCase.id,
    bucket: evalCase.bucket,
    polarity: evalCase.polarity,
    semanticSimilarity: Math.round(similarity * 1000) / 1000,
    judge,
    withinRanges: within,
    pass,
    failures: pass
      ? []
      : evalCase.polarity === "reject"
      ? ["reject-polarity candidate stayed inside the acceptable band"]
      : failures,
  };
}

function emptyBuckets(): ResponseEvalReport["byBucket"] {
  return {
    happy: { cases: 0, passed: 0 },
    edge: { cases: 0, passed: 0 },
    adversarial: { cases: 0, passed: 0 },
  };
}

/**
 * Run a case list. The default embedder is the hashing sentence embedding.
 * Pass a sentence-transformer embedder from the nightly script when the
 * model runtime is installed.
 */
export async function runResponseEval(
  cases: readonly ResponseEvalCase[],
  options: {
    embed?: TextEmbedder;
    embedderName?: string;
    judge?: "rubric" | "llm";
    passRateRange?: MetricRange;
    split?: string;
    targetModelId?: string;
  } = {},
): Promise<ResponseEvalReport> {
  const results: ResponseCaseResult[] = [];
  for (const evalCase of cases) {
    results.push(
      await scoreResponseCase(evalCase, {
        embed: options.embed,
        judge: options.judge,
        targetModelId: options.targetModelId,
      }),
    );
  }

  const byBucket = emptyBuckets();
  for (const result of results) {
    byBucket[result.bucket].cases += 1;
    if (result.pass) byBucket[result.bucket].passed += 1;
  }
  const passed = results.filter((result) => result.pass).length;
  const passRate = results.length === 0 ? 0 : passed / results.length;
  const passRateRange = options.passRateRange ?? HANDCRAFTED_PASS_RATE;
  const judge = results.every((result) => result.judge.source === "llm") &&
      results.length > 0
    ? "llm"
    : "rubric";

  return {
    split: options.split ?? "custom",
    embedder: options.embedderName ?? "hashing",
    judge,
    cases: results.length,
    passed,
    passRate: Math.round(passRate * 1000) / 1000,
    passRateRange,
    pass: withinRange(passRate, passRateRange),
    byBucket,
    failures: results.filter((result) => !result.pass).map((result) => ({
      id: result.id,
      failures: result.failures,
    })),
  };
}

export { ACCEPTABLE_RESPONSE_RANGES, BUCKETS };
