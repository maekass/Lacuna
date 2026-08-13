#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fromRecords,
  getMetricDeclaration,
  type LineageOptions,
  type LineageSummary,
  summarizeLineage,
  type TracedValue,
} from "../src/lib/lineage";
import { isSufficient } from "../src/lib/quant/estimators";
import type { VerifiedDataset } from "../src/lib/data/datasetSchema";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";

const ROOT = resolve(__dirname, "..");
const dataset = JSON.parse(
  readFileSync(resolve(ROOT, "src/data/dataset.verified.json"), "utf-8"),
) as VerifiedDataset;
const options: LineageOptions = {
  datasetVersion: dataset.provenance.datasetVersion,
  computedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
};

interface BenchmarkRow {
  readonly sector: string;
  readonly label: string;
  readonly definition: string;
  readonly unit: string;
  readonly medianMoic?: TracedValue;
  readonly p25Moic?: TracedValue;
  readonly p75Moic?: TracedValue;
  readonly sampleSize: number;
}

interface WithheldMetric {
  readonly metricId: string;
  readonly scope: string;
  readonly reason: string;
  readonly lineage: LineageSummary;
}

const base = fromRecords(
  "acquisitions",
  dataset.acquisitions,
  options,
).join(
  "companies",
  "company",
  dataset.companies,
  (deal) => deal.targetId,
);

function metric(
  collection: ReturnType<typeof base.map>,
  metricId: string,
  scope: string,
  withheld: WithheldMetric[],
): TracedValue | undefined {
  const estimate = collection.estimate(metricId);
  if (!isSufficient(estimate)) {
    withheld.push({
      metricId,
      scope,
      reason: estimate.message,
      lineage: summarizeLineage(estimate.lineage),
    });
    return undefined;
  }
  return estimate;
}

function collectionForSector(sector?: string) {
  let collection = base;
  if (sector !== undefined) {
    collection = collection.exclude(
      (deal) => deal.company.sector !== sector,
      "out_of_sector",
    );
  }
  return collection
    .exclude(
      (deal) => deal.dealValue === undefined || deal.dealValue <= 0,
      "value_undisclosed",
      "dealValue",
    )
    .exclude(
      (deal) =>
        deal.company.totalFunding === undefined ||
        deal.company.totalFunding <= 0,
      "funding_unresearched",
      "totalFunding",
    )
    .map((deal) => deal.dealValue! / deal.company.totalFunding!);
}

function buildRow(
  sector: string,
  collection: ReturnType<typeof collectionForSector>,
  withheld: WithheldMetric[],
): BenchmarkRow | undefined {
  const medianMoic = metric(
    collection,
    "sector.moic.median",
    sector,
    withheld,
  );
  const p25Moic = metric(collection, "sector.moic.p25", sector, withheld);
  const p75Moic = metric(collection, "sector.moic.p75", sector, withheld);
  const declaration = getMetricDeclaration("sector.moic.median");

  if (!medianMoic && !p25Moic && !p75Moic) return undefined;
  return {
    sector,
    label: declaration.label,
    definition: declaration.definition,
    unit: declaration.unit,
    medianMoic,
    p25Moic,
    p75Moic,
    sampleSize: medianMoic?.sampleSize ?? p25Moic?.sampleSize ??
      p75Moic?.sampleSize ?? 0,
  };
}

const withheld: WithheldMetric[] = [];
const sectors = [
  ...new Set(dataset.companies.map((company) => company.sector)),
].filter(Boolean);
const benchmarks = sectors
  .map((sector) => buildRow(sector, collectionForSector(sector), withheld))
  .filter((row): row is BenchmarkRow => row !== undefined);
const allSectors = buildRow(
  "All sectors",
  collectionForSector(),
  withheld,
);
if (allSectors) benchmarks.unshift(allSectors);

const output = {
  generatedAt: options.computedAt,
  datasetVersion: options.datasetVersion,
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  benchmarks,
  withheld,
};

writeFileSync(
  resolve(ROOT, "src/data/computed-benchmarks.json"),
  JSON.stringify(output, null, 2) + "\n",
);

console.log(
  `✅ Computed ${benchmarks.length} benchmark rows; withheld ${withheld.length} metrics`,
);
