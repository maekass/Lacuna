#!/usr/bin/env tsx
/**
 * Verify the frozen eval set against the pinned NCCI subset and benchmark:
 * every rule-derivable expected answer must match the oracle, justifying ids
 * must exist, and committed artifacts must contain no NPI-like strings.
 *
 * The held-out set (v2) is checked the same way against its own subset and
 * benchmark, and its committed SHA-256 manifest must still match, so labels
 * cannot change after the freeze without this check failing.
 *
 *   npm run coding-judgment:check
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
  heldoutEvalSetSchema,
  ncciSubsetSchema,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";
const HELDOUT_SET = "eval-cases.v2-heldout.json";
const HELDOUT_HASHES = "eval-cases.v2-heldout.sha256";

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
  const heldout = heldoutEvalSetSchema.parse(read(HELDOUT_SET));
  const heldoutProblems = checkEvalSet(
    heldout,
    ncciSubsetSchema.parse(
      JSON.parse(readFileSync(heldout.ncciSubsetPath, "utf8")),
    ),
    emBenchmarkSchema.parse(
      JSON.parse(readFileSync(heldout.emBenchmarkPath, "utf8")),
    ),
  );
  for (const problem of heldoutProblems) problems.push(`v2-heldout ${problem}`);
  // Strict freeze check: every line must parse (CRLF tolerated), and the
  // manifest must cover exactly the held-out set and its pinned inputs.
  const expectedFrozen = [
    path.join(DIR, HELDOUT_SET),
    heldout.ncciSubsetPath,
    heldout.emBenchmarkPath,
  ].sort();
  const frozen: string[] = [];
  const hashLines = readFileSync(path.join(DIR, HELDOUT_HASHES), "utf8")
    .split(/\r?\n/).filter((line) => line.trim() !== "");
  for (const line of hashLines) {
    const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    if (!match) {
      problems.push(`${HELDOUT_HASHES}: unparseable line "${line}"`);
      continue;
    }
    frozen.push(match[2]);
    if (!existsSync(match[2])) {
      problems.push(`${match[2]}: listed in the freeze manifest but missing`);
      continue;
    }
    const actual = createHash("sha256").update(readFileSync(match[2])).digest(
      "hex",
    );
    if (actual !== match[1]) {
      problems.push(`${match[2]}: SHA-256 differs from the freeze manifest`);
    }
  }
  if (frozen.sort().join("\n") !== expectedFrozen.join("\n")) {
    problems.push(
      `${HELDOUT_HASHES}: expected entries for ${expectedFrozen.join(", ")}`,
    );
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
    `✓ ${evalSet.cases.length} v1 cases and ${heldout.cases.length} held-out cases consistent with pinned NCCI ${subset.ptpVersion} and ${benchmark.id}; freeze hashes match`,
  );
}

main();
