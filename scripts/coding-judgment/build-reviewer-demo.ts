#!/usr/bin/env tsx
/**
 * Build the data file behind the read-only reviewer demo page
 * (/payer-ops/coding-review) from committed recorded runs.
 * No network, no keys, no model calls.
 *
 *   npm run coding-judgment:reviewer-demo
 */
import { writeFileSync } from "node:fs";
import {
  buildReviewerDemo,
  REVIEWER_DEMO_PATH,
  REVIEWER_DEMO_RUNS,
} from "../../src/lib/payerOps/codingJudgment/reviewerDemo";
import { loadRecordedRun } from "../../src/lib/payerOps/codingJudgment/recordedRun";

const demo = buildReviewerDemo(
  REVIEWER_DEMO_RUNS.map(({ runDir, label, note }) => ({
    run: loadRecordedRun(runDir),
    label,
    note,
  })),
);
writeFileSync(REVIEWER_DEMO_PATH, `${JSON.stringify(demo, null, 2)}\n`);
console.log(
  `✓ ${REVIEWER_DEMO_PATH}: ${demo.records.length} recorded replies from ${demo.runs.length} runs`,
);
