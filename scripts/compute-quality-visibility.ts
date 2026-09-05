#!/usr/bin/env npx tsx

/**
 * Slim measurement-layer census for the UI and CI.
 *
 * Reads computed quality scores, gated-metric artifacts, the provenance
 * baseline, and the verified dataset. Does not use wall-clock time.
 *
 * Usage: npx tsx scripts/compute-quality-visibility.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";
import { buildQualityLayerSummary } from "../src/lib/data/dataQualityScores";
import {
  computeMetricPublicationCensus,
  computeVintageCensus,
  countReproduciblePremiums,
  type QualityVisibilityArtifact,
  summarizeDisplayProvenance,
} from "../src/lib/data/qualityVisibility";
import { getStaticVerifiedDataset } from "../src/lib/data/staticDataset";
import { hashDataset } from "../src/lib/lineage/datasetHash";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(join(repoRoot, relativePath), "utf8"),
  ) as T;
}

function main(): void {
  const dataset = getStaticVerifiedDataset();
  const benchmarks = readJson<
    Parameters<typeof computeMetricPublicationCensus>[0]["benchmarks"]
  >("src/data/computed-benchmarks.json");
  const premiums = readJson<
    Parameters<typeof computeMetricPublicationCensus>[0]["premiums"]
  >("src/data/computed-acquirer-premiums.json");
  const confidenceIntervals = readJson<
    Parameters<
      typeof computeMetricPublicationCensus
    >[0]["confidenceIntervals"]
  >("src/data/computed-confidence-intervals.json");
  const correlations = readJson<
    Parameters<typeof computeMetricPublicationCensus>[0]["correlations"]
  >("src/data/computed-sector-correlations.json");
  const baseline = readJson<{
    total: number;
    covered: number;
    exempt: number;
    uncovered: number;
    perFileUncovered: Record<string, number>;
  }>("scripts/provenance-baseline.json");

  const output: QualityVisibilityArtifact = {
    generatedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
    datasetHash: hashDataset(dataset).fullHash,
    datasetVersion: dataset.provenance.datasetVersion,
    source:
      "Lacuna measurement-layer census (quality scores, gated metrics, vintage, display provenance)",
    quality: buildQualityLayerSummary(),
    metrics: computeMetricPublicationCensus({
      benchmarks,
      premiums,
      confidenceIntervals,
      correlations,
    }),
    vintage: computeVintageCensus(dataset),
    premiums: countReproduciblePremiums(dataset.acquisitions),
    displayProvenance: summarizeDisplayProvenance(baseline),
  };

  const dest = join(repoRoot, "src/data/computed-quality-visibility.json");
  writeFileSync(dest, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`✅ Quality visibility written to ${dest}`);
  console.log(
    `   published=${output.metrics.published} withheld=${output.metrics.withheld} vintageMissing=${
      (output.vintage.missingDedicatedAsOfRate * 100).toFixed(1)
    }% uncovered=${output.displayProvenance.uncovered}/${output.displayProvenance.total}`,
  );
}

main();
