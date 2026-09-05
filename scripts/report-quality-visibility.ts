#!/usr/bin/env npx tsx

/**
 * Surface the measurement-layer census outside CI logs.
 *
 * Writes quality-visibility-report.md, appends GITHUB_STEP_SUMMARY,
 * and emits ::warning / ::notice annotations when running on GitHub Actions.
 *
 * Usage: npx tsx scripts/report-quality-visibility.ts
 */

import { appendFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { formatQualityVisibilityMarkdown } from "../src/lib/data/qualityVisibility";
import { getQualityVisibility } from "../src/lib/data/qualityVisibilityProvider";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function githubCommand(
  kind: "warning" | "notice",
  title: string,
  message: string,
): void {
  const escaped = message.replace(/\r?\n/g, "%0A").replace(/::/g, " ");
  console.log(`::${kind} title=${title}::${escaped}`);
}

function main(): void {
  const artifact = getQualityVisibility();
  const markdown = formatQualityVisibilityMarkdown(artifact);
  const reportPath = join(repoRoot, "quality-visibility-report.md");
  writeFileSync(reportPath, `${markdown}\n`);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${markdown}\n`);
  }

  const { metrics, vintage, quality, displayProvenance, premiums } = artifact;
  githubCommand(
    "notice",
    "Published gated metrics",
    `${metrics.publishedWithFullProvenance}/${metrics.published} published estimates carry unit, definition, n, bootstrap CI, and lineage. computedPremium ${premiums.reproducible}/${premiums.computed} exactly reproducible.`,
  );
  githubCommand(
    "warning",
    "Withheld metrics",
    `${metrics.withheld}/${metrics.registered} registered metrics (${
      (metrics.withheldRate * 100).toFixed(1)
    }%) are withheld with machine-readable reasons.`,
  );
  githubCommand(
    "warning",
    "Vintage gap",
    `${vintage.missingDedicatedAsOf}/${vintage.primaryNumbers} primary economic numbers (${
      (vintage.missingDedicatedAsOfRate * 100).toFixed(1)
    }%) have no dedicated as-of date.`,
  );
  githubCommand(
    "warning",
    "Display provenance",
    `${displayProvenance.uncovered}/${displayProvenance.total} numeric render sites (${
      (displayProvenance.uncoveredRate * 100).toFixed(1)
    }%) have no <Metric> affordance.`,
  );

  const lowGrade = quality.lowGradeCompanies.length +
    quality.lowGradeDeals.length;
  if (lowGrade > 0) {
    githubCommand(
      "warning",
      "Low-grade entities",
      `${quality.lowGradeCompanies.length} companies and ${quality.lowGradeDeals.length} deal${
        quality.lowGradeDeals.length === 1 ? "" : "s"
      } graded D/F in computed-data-quality-scores.json.`,
    );
  }

  console.log(markdown);
  console.log(`Wrote ${reportPath}`);
}

main();
