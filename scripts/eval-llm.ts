#!/usr/bin/env tsx
/**
 * Offline LLM eval — precision/recall for SEC deal classifier vs golden fixtures.
 * Uses MockLanguageModelV3 per fixture (no live API spend).
 */

import { runClassificationEval } from "../src/lib/ai/evals/classificationEval";

async function main() {
  const report = await runClassificationEval();
  const { metrics, cases, confidenceExact, mismatches } = report;

  console.log("Lacuna LLM eval — deal classification (golden set)");
  console.log(`Cases: ${cases}`);
  console.log(
    `Precision: ${(metrics.precision * 100).toFixed(1)}%  Recall: ${
      (metrics.recall * 100).toFixed(1)
    }%  F1: ${(metrics.f1 * 100).toFixed(1)}%`,
  );
  console.log(
    `Confusion: TP=${metrics.tp} FP=${metrics.fp} TN=${metrics.tn} FN=${metrics.fn}`,
  );
  console.log(`Confidence exact match: ${confidenceExact}/${cases}`);
  if (mismatches.length > 0) {
    console.log("Mismatches:");
    for (const m of mismatches) {
      console.log(
        `  - ${m.id}: expected=${m.expected} predicted=${m.predicted}`,
      );
    }
  }
  console.log(report.pass ? "PASS" : "FAIL");
  process.exit(report.pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
