#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync } from "node:fs";
import {
  fromRecords,
  type LineageOptions,
  summarizeLineage,
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

const collection = fromRecords(
  "acquisitions",
  dataset.acquisitions,
  options,
).join(
  "companies",
  "company",
  dataset.companies,
  (deal) => deal.targetId,
)
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
  .map(
    (deal) => deal.dealValue! / deal.company.totalFunding!,
    ({ input, ref, supporting }) => [
      { ref, field: "dealValue", value: input.dealValue },
      {
        ref: supporting[0]!,
        field: "totalFunding",
        value: input.company.totalFunding,
      },
    ],
  );

const lineageEstimate = collection.estimate("sector.moic.median");
const output = {
  generatedAt: options.computedAt,
  datasetVersion: options.datasetVersion,
  datasetHash: options.datasetHash ?? hashDataset(dataset).fullHash,
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  sectors: [],
  withheld: [
    {
      metricId: "sector.correlation.pearson",
      reason:
        "Withheld: Pearson correlation used sectors as observations and the deal-level version has only the same 7 usable pairs; no honest registered estimator exists.",
      lineage: {
        ...summarizeLineage(lineageEstimate.lineage),
        metricId: "sector.correlation.pearson",
        estimator: "not-computed",
      },
    },
  ],
};

if (isSufficient(lineageEstimate)) {
  console.log(
    `Correlation withheld for ${lineageEstimate.lineage.n} usable deal-level pairs`,
  );
} else {
  console.log("Correlation withheld because its lineage input is insufficient");
}

writeFileSync(
  "src/data/computed-sector-correlations.json",
  JSON.stringify(output, null, 2) + "\n",
);

console.log("✅ Sector correlation statistic withheld");
