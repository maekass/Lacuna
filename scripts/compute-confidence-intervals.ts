#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync } from "node:fs";
import {
  fromRecords,
  getMetricDeclaration,
  type LineageOptions,
  type LineageSummary,
  summarizeLineage,
  type TracedValue,
} from "../src/lib/lineage";
import { hashDataset } from "../src/lib/lineage/datasetHash";
import { isSufficient } from "../src/lib/quant/estimators";
import {
  parseVerifiedDataset,
  type VerifiedDataset,
} from "../src/lib/data/datasetSchema";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";

const dataset = JSON.parse(
  readFileSync("src/data/dataset.verified.json", "utf-8"),
) as VerifiedDataset;
const options: LineageOptions = {
  datasetVersion: dataset.provenance.datasetVersion,
  datasetHash: hashDataset(parseVerifiedDataset(dataset)).fullHash,
  computedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
};

interface ConfidenceResult {
  readonly metricId: string;
  readonly scope: string;
  readonly label: string;
  readonly definition: string;
  readonly estimate: TracedValue;
}

interface WithheldMetric {
  readonly metricId: string;
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

function moicCollection(sector?: string) {
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

const withheld: WithheldMetric[] = [];
const results: ConfidenceResult[] = [];
const sectors = [
  ...new Set(dataset.companies.map((company) => company.sector)),
].filter(Boolean);

for (const scope of ["All sectors", ...sectors]) {
  const collection = moicCollection(
    scope === "All sectors" ? undefined : scope,
  );
  for (
    const metricId of [
      "sector.moic.median",
      "sector.moic.p25",
      "sector.moic.p75",
    ] as const
  ) {
    const estimate = collection.estimate(metricId);
    if (!isSufficient(estimate)) {
      withheld.push({
        metricId,
        reason: estimate.message,
        lineage: summarizeLineage(estimate.lineage),
      });
      continue;
    }
    const declaration = getMetricDeclaration(metricId);
    results.push({
      metricId,
      scope,
      label: declaration.label,
      definition: declaration.definition,
      estimate,
    });
  }
}

const output = {
  generatedAt: options.computedAt,
  datasetVersion: options.datasetVersion,
  datasetHash: options.datasetHash ??
    hashDataset(parseVerifiedDataset(dataset)).fullHash,
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  results,
  withheld,
};

writeFileSync(
  "src/data/computed-confidence-intervals.json",
  JSON.stringify(output, null, 2) + "\n",
);

console.log(
  `✅ Computed ${results.length} confidence results; withheld ${withheld.length} metrics`,
);
