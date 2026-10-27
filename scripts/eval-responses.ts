#!/usr/bin/env tsx
/**
 * Offline response eval.
 * Pre-merge: `npm run eval:responses` (handcrafted, hashing embedder, rubric judge).
 * Nightly exam: `npm run eval:responses:nightly` (1,000 synthetic cases).
 * Sentence transformer: add `--embed transformer` when `@huggingface/transformers` is installed.
 * LLM judge: add `--judge llm` when AI Gateway or OPENAI_API_KEY is configured.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildSyntheticCases,
  handcraftedCases,
} from "../src/lib/ai/evals/responseCases";
import { runResponseEval } from "../src/lib/ai/evals/responseHarness";
import {
  HANDCRAFTED_PASS_RATE,
  type ResponseEvalCase,
  SYNTHETIC_PASS_RATE,
} from "../src/lib/ai/evals/responseTypes";
import { isServerInferenceConfigured } from "../src/lib/ai/inference";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

async function transformerEmbedder(): Promise<
  (text: string) => Promise<number[]>
> {
  const module = await import("./evals/sentenceTransformerEmbedder");
  return module.sentenceTransformerEmbed;
}

async function main(): Promise<void> {
  const split = arg("--split") ?? "handcrafted";
  const embedderName = arg("--embed") ?? "hashing";
  const judgeFlag = arg("--judge") ?? "rubric";
  const count = Number(arg("--count") ?? "1000");
  const writePath = arg("--write");

  if (judgeFlag !== "rubric" && judgeFlag !== "llm") {
    throw new Error("--judge must be rubric or llm");
  }
  if (judgeFlag === "llm" && !isServerInferenceConfigured()) {
    throw new Error(
      "LLM judge requested but AI Gateway and OPENAI_API_KEY are unset. No judge scores were invented.",
    );
  }

  const cases: ResponseEvalCase[] = [];
  if (split === "handcrafted" || split === "all") {
    cases.push(...handcraftedCases());
  }
  if (split === "synthetic" || split === "all") {
    cases.push(...buildSyntheticCases(Number.isFinite(count) ? count : 1000));
  }
  if (cases.length === 0) {
    throw new Error("--split must be handcrafted, synthetic, or all");
  }

  const embed = embedderName === "transformer"
    ? await transformerEmbedder()
    : undefined;
  const passRateRange = split === "synthetic"
    ? SYNTHETIC_PASS_RATE
    : HANDCRAFTED_PASS_RATE;

  const report = await runResponseEval(cases, {
    embed,
    embedderName: embedderName === "transformer"
      ? "sentence-transformer"
      : "hashing",
    judge: judgeFlag,
    passRateRange,
    split,
  });

  console.log(
    `Lacuna response eval — ${report.split} via ${report.embedder} / ${report.judge}`,
  );
  console.log(
    `Cases: ${report.cases}  passed: ${report.passed}  pass rate: ${
      (report.passRate * 100).toFixed(1)
    }%  band: ${report.passRateRange.min}–${report.passRateRange.max}`,
  );
  for (const bucket of ["happy", "edge", "adversarial"] as const) {
    const row = report.byBucket[bucket];
    console.log(`  ${bucket}: ${row.passed}/${row.cases}`);
  }
  if (report.failures.length > 0) {
    console.log("Failures:");
    for (const failure of report.failures.slice(0, 20)) {
      console.log(`  - ${failure.id}: ${failure.failures.join("; ")}`);
    }
  }
  if (writePath) {
    mkdirSync(dirname(writePath), { recursive: true });
    writeFileSync(writePath, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(report.pass ? "PASS" : "FAIL");
  process.exit(report.pass ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
