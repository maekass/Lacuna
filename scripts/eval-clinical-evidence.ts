#!/usr/bin/env tsx
/** Run a frozen, offline, researcher-reviewed evidence QA benchmark. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  evaluateClinicalEvidenceRun,
  type ClinicalEvidenceEvalReport,
} from "../src/lib/ai/evals/clinicalEvidenceEval";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main(): void {
  const benchmarkPath = arg("--benchmark");
  const runPath = arg("--run");
  const outputPath = arg("--out");
  if (!benchmarkPath || !runPath) {
    throw new Error(
      "Usage: npm run eval:clinical-evidence -- --benchmark <json> --run <json> [--out <json>]",
    );
  }

  const report: ClinicalEvidenceEvalReport = evaluateClinicalEvidenceRun(
    readJson(benchmarkPath),
    readJson(runPath),
  );
  const serialized = JSON.stringify(report, null, 2) + "\n";
  if (outputPath) writeFileSync(resolve(outputPath), serialized);
  process.stdout.write(serialized);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    "Clinical evidence evaluation failed: " + message + "\n",
  );
  process.exitCode = 1;
}
