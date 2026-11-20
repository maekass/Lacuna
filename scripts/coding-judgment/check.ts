#!/usr/bin/env tsx
/**
 * Verify the frozen eval set against the pinned NCCI subset and benchmark:
 * every rule-derivable expected answer must match the oracle, justifying ids
 * must exist, and committed artifacts must contain no NPI-like strings.
 *
 *   npm run coding-judgment:check
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildProfileCases } from "../../src/lib/payerOps/codingJudgment/caseBuilder";
import { benchmarkPathFor } from "../../src/lib/payerOps/codingJudgment/config";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";
import {
  checkEvalSet,
  findNpiLikeStrings,
} from "../../src/lib/payerOps/codingJudgment/checks";
import {
  emBenchmarkSchema,
  evalSetSchema,
  ncciSubsetSchema,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function main(): void {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(path.join(DIR, name), "utf8"));
  const evalSet = evalSetSchema.parse(read("eval-cases.v1.json"));
  const subset = ncciSubsetSchema.parse(
    read("ncci-practitioner-2026q4.subset.json"),
  );
  const benchmark = emBenchmarkSchema.parse(
    JSON.parse(
      readFileSync(benchmarkPathFor(loadPeerScreenConfig().config), "utf8"),
    ),
  );
  const problems = checkEvalSet(evalSet, subset, benchmark);
  const built = buildProfileCases(
    benchmark,
    subset,
    loadPeerScreenConfig().config.caseBuilder.firstCaseNumber,
  );
  for (const item of built) {
    const frozen = evalSet.cases.find((c) => c.id === item.id);
    if (JSON.stringify(frozen) !== JSON.stringify(item)) {
      problems.push(`${item.id}: differs from the profile-case builder output`);
    }
  }
  for (const file of walk(DIR)) {
    const hits = findNpiLikeStrings(readFileSync(file, "utf8"));
    if (hits.length) problems.push(`${file}: ${hits.length} NPI-like strings`);
  }
  if (problems.length) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ ${evalSet.cases.length} cases consistent with pinned NCCI ${subset.ptpVersion} and ${benchmark.id}`,
  );
}

main();
