#!/usr/bin/env tsx
/**
 * Build or check the frozen cited-answer lift eval set.
 *
 *   npm run eval:lift:set     write src/lib/ai/evals/fixtures/lift-eval-set.v1.json
 *   npm run eval:lift:check   verify the committed hash and that every gold
 *                             value still equals its verified-dataset field
 *
 * The committed file is the eval set. Regenerating after a dataset change
 * writes a new file only with --write; bump LIFT_EVAL_SET_VERSION when gold
 * values change so earlier reports stay comparable.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { getVerifiedDataset } from "../src/lib/data/datasetProvider";
import {
  buildLiftEvalSet,
  checkFrozenLiftEvalSet,
} from "../src/lib/ai/evals/lift/evalSet";
import { liftEvalSetSchema } from "../src/lib/ai/evals/lift/types";

const LIFT_EVAL_SET_PATH = path.join(
  "src",
  "lib",
  "ai",
  "evals",
  "fixtures",
  "lift-eval-set.v1.json",
);

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const dataset = await getVerifiedDataset();
  const target = path.resolve(LIFT_EVAL_SET_PATH);

  if (check) {
    if (!existsSync(target)) {
      throw new Error(
        `${LIFT_EVAL_SET_PATH} is missing. Run npm run eval:lift:set.`,
      );
    }
    const frozen = liftEvalSetSchema.parse(
      JSON.parse(readFileSync(target, "utf8")),
    );
    const problems = checkFrozenLiftEvalSet(frozen, dataset);
    const regenerated = buildLiftEvalSet(dataset);
    console.log(
      `Lift eval set ${frozen.version}: ${frozen.counts.total} items (${frozen.counts.answerable} answerable, ${frozen.counts.shouldAbstain} should-abstain)`,
    );
    console.log(`itemsSha256 ${frozen.itemsSha256}`);
    if (regenerated.itemsSha256 !== frozen.itemsSha256) {
      console.log(
        "Note: regenerating from the current dataset would select different items. The frozen set stays authoritative.",
      );
    }
    if (problems.length > 0) {
      for (const problem of problems) console.error(`- ${problem}`);
      throw new Error(
        `Frozen lift eval set failed ${problems.length} check(s).`,
      );
    }
    console.log("PASS: hash intact; gold values match the verified dataset.");
    return;
  }

  const set = buildLiftEvalSet(dataset);
  liftEvalSetSchema.parse(set);
  writeFileSync(target, `${JSON.stringify(set, null, 2)}\n`);
  console.log(
    `Wrote ${LIFT_EVAL_SET_PATH}: ${set.counts.total} items (${set.counts.answerable} answerable, ${set.counts.shouldAbstain} should-abstain), sha256 ${set.itemsSha256}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
