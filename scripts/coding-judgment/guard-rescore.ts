#!/usr/bin/env tsx
/**
 * Re-score a recorded coding-judgment run with the routing guard applied.
 * No network, no keys: it reads committed replies and pinned data only.
 *
 *   npm run coding-judgment:guard -- --run <runDir> [--note <text>]
 *
 * Writes <runDir>/guarded-results.json and guarded-results.md.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  type GuardedReport,
  scoreWithGuard,
} from "../../src/lib/payerOps/codingJudgment/guardedScore";
import { loadRecordedRun } from "../../src/lib/payerOps/codingJudgment/recordedRun";
import { ROUTING_GUARD_VERSION } from "../../src/lib/payerOps/codingJudgment/routingGuard";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

const NOTES: Record<string, string> = {
  "2026-11-20-openrouter-free":
    "The routing guard was written after seeing these iteration-1 failures. This set shaped the guard, so it cannot validate it. Results here show only that the guard fixes the failures it was designed for.",
  "2026-11-23-heldout-openrouter-free":
    "Held-out set frozen (cases, labels and SHA-256) in commit aaa9837 before any model call on it; the guard was committed in 302c3d9 and not changed after this run. The same assistant wrote the guard and these cases, so they test new codes, dates, payers and profiles within known failure types, not failure types nobody anticipated. Labels are assistant-built and not adjudicated by a coder.",
};

function row(label: string, r: GuardedReport): string[] {
  const b = r.before;
  const a = r.after;
  const n = b.caseCount;
  return [
    `| ${label} | unsafe auto routes | ${b.unsafeAutoRoutes} | ${a.unsafeAutoRoutes} |`,
    `| ${label} | wrong answers sent as auto | ${b.wrongAnswersAuto} | ${a.wrongAnswersAuto} |`,
    `| ${label} | decided automatically | ${b.decidedAutomatically}/${n} | ${a.decidedAutomatically}/${n} |`,
    `| ${label} | sent to a person | ${b.sentToPerson}/${n} | ${a.sentToPerson}/${n} |`,
    `| ${label} | avoidable reviews | ${b.avoidableReviews} | ${a.avoidableReviews} |`,
    `| ${label} | of which auto was the only acceptable route | ${b.avoidableReviewsAutoOnly} | ${a.avoidableReviewsAutoOnly} |`,
  ];
}

function main(): void {
  const runDir = arg("--run");
  if (!runDir) throw new Error("Pass --run <runDir>");
  const run = loadRecordedRun(runDir);
  const runId = run.manifest.runId;
  const note = arg("--note") ?? NOTES[runId] ??
    "Read docs/CODING_JUDGMENT_ITERATION_2.md for how this set relates to the guard.";
  const reports = run.manifest.modelIds.flatMap((modelId) =>
    run.manifest.conditions.map((condition) =>
      scoreWithGuard({
        cases: run.cases,
        intakeFor: run.intakeFor,
        replies: run.replies,
        modelId,
        condition,
        subset: run.subset,
        benchmark: run.benchmark,
        pinnedIds: run.pinnedIds,
      })
    )
  );
  const out = {
    schemaVersion: "1.0.0",
    runId,
    guardVersion: ROUTING_GUARD_VERSION,
    evalSetPath: run.paths.evalSet,
    note,
    status:
      "Assistant-built eval set and labels, not independently adjudicated; one pass per model.",
    reports,
  };
  writeFileSync(
    path.join(runDir, "guarded-results.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  const lines = [
    `# Routing guard re-score: ${runId}`,
    "",
    `Guard ${ROUTING_GUARD_VERSION}. Eval set \`${run.paths.evalSet}\`.`,
    "",
    `**${note}**`,
    "",
    "| Model and arm | Measure | Before guard | After guard |",
    "| --- | --- | ---: | ---: |",
    ...reports.flatMap((r) =>
      row(`${r.modelId.split("/")[1]} ${r.condition}`, r)
    ),
    "",
    "Before = the route the model asked for (a malformed reply counts as sent to a person). After = the guard's final route. Avoidable review = sent to a person although `auto` was acceptable and the model's decision was right. Some of these cases also accepted human review (modifier bypasses, clinical MUE limits), so a review there is a policy choice rather than an error; the next row counts only cases where `auto` was the only acceptable route.",
    "",
  ];
  for (const r of reports) {
    lines.push(`## ${r.modelId} ${r.condition}`, "");
    const notable = r.cases.filter((c) =>
      c.routeBefore !== c.routeAfter ||
      (c.routeAfter === "auto" &&
        (!c.decisionCorrect || !c.acceptableRoutes.includes("auto")))
    );
    if (!notable.length) lines.push("No route changes.");
    for (const c of notable) {
      lines.push(
        `- ${c.caseId}: model ${
          c.modelDecision ?? "malformed"
        }/${c.routeBefore} → ${c.routeAfter} (expected ${c.expectedDecision}; ${
          c.guard.reasons.join(", ") || "auto"
        })`,
      );
    }
    lines.push("");
  }
  writeFileSync(path.join(runDir, "guarded-results.md"), lines.join("\n"));
  for (const r of reports) {
    console.log(
      `${r.modelId} ${r.condition}: unsafe auto ${r.before.unsafeAutoRoutes}→${r.after.unsafeAutoRoutes}, wrong auto ${r.before.wrongAnswersAuto}→${r.after.wrongAnswersAuto}, auto ${r.before.decidedAutomatically}→${r.after.decidedAutomatically}/${r.before.caseCount}, avoidable reviews ${r.before.avoidableReviews}→${r.after.avoidableReviews}`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
