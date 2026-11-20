#!/usr/bin/env tsx
/**
 * Regenerate the provider-profile cases of an eval set from the benchmark
 * built for a peer-screen config. Rule (PTP/MUE) cases and hand-labeled
 * traps are left untouched.
 *
 *   npm run coding-judgment:build-cases [-- --config <path>] [--eval-set <path>]
 *
 * For a new specialty, point --eval-set at a new file seeded with the rule
 * cases and traps you want, then run this to add its profile cases.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { buildProfileCases } from "../../src/lib/payerOps/codingJudgment/caseBuilder";
import { benchmarkPathFor } from "../../src/lib/payerOps/codingJudgment/config";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";
import {
  emBenchmarkSchema,
  evalSetSchema,
  ncciSubsetSchema,
} from "../../src/lib/payerOps/codingJudgment/schemas";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const evalSetPath = arg("--eval-set") ??
  "data/coding-judgment/eval-cases.v1.json";
const { config } = loadPeerScreenConfig(arg("--config"));
const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const benchmark = emBenchmarkSchema.parse(read(benchmarkPathFor(config)));
const subset = ncciSubsetSchema.parse(
  read("data/coding-judgment/ncci-practitioner-2026q4.subset.json"),
);
const evalSet = evalSetSchema.parse(read(evalSetPath));
const built = buildProfileCases(
  benchmark,
  subset,
  config.caseBuilder.firstCaseNumber,
);
const builtIds = new Set(built.map((item) => item.id));
const kept = evalSet.cases.filter((item) =>
  item.kind !== "profile" && !builtIds.has(item.id)
);
const clash = evalSet.cases.find((item) =>
  item.kind !== "profile" && builtIds.has(item.id)
);
if (clash) {
  console.error(
    `${clash.id} is a ${clash.kind} case; choose another firstCaseNumber`,
  );
  process.exitCode = 1;
} else {
  const cases = [...kept, ...built].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    evalSetPath,
    `${JSON.stringify(evalSetSchema.parse({ ...evalSet, cases }), null, 2)}\n`,
  );
  console.log(`Wrote ${built.length} profile cases into ${evalSetPath}`);
}
