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
import type {
  VerifiedAcquisition,
  VerifiedCompany,
  VerifiedDataset,
} from "../src/lib/data/datasetSchema";
import { parseVerifiedDataset } from "../src/lib/data/datasetSchema";
import { generatedAtFromProvenance } from "../src/lib/data/computedArtifactMeta";
import { withoutLineage, writeSlimArtifact } from "./slimArtifacts";

const dataset = JSON.parse(
  readFileSync("src/data/dataset.verified.json", "utf-8"),
) as VerifiedDataset;
const options: LineageOptions = {
  datasetVersion: dataset.provenance.datasetVersion,
  datasetHash: hashDataset(parseVerifiedDataset(dataset)).fullHash,
  computedAt: generatedAtFromProvenance(dataset.provenance.lastUpdated),
};

type JoinedDeal = VerifiedAcquisition & { readonly company: VerifiedCompany };

interface PremiumMetricOutput {
  readonly metricId: string;
  readonly label: string;
  readonly definition: string;
  readonly unit: string;
  readonly estimate: TracedValue;
}

interface AcquirerPremiumOutput {
  readonly acquirerName: string;
  readonly metricId: string;
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

const denominatorFields = {
  "acquirer.premium.preDealValuation": (deal: JoinedDeal) =>
    deal.preDealValuation,
  "acquirer.premium.lastKnownValuation": (deal: JoinedDeal) =>
    deal.company.lastKnownValuation,
  "acquirer.premium.totalFunding": (deal: JoinedDeal) =>
    deal.company.totalFunding,
} as const;

type PremiumMetricId = keyof typeof denominatorFields;

function denominatorCollection(metricId: PremiumMetricId) {
  return eligibleCollection(metricId).map(
    (deal) => {
      const getDenominator = denominatorFields[metricId];
      return deal.dealValue! / getDenominator(deal)!;
    },
    metricId === "acquirer.premium.preDealValuation"
      ? "dealValue / preDealValuation"
      : metricId === "acquirer.premium.lastKnownValuation"
      ? "dealValue / company.lastKnownValuation"
      : "dealValue / company.totalFunding",
  );
}

function eligibleCollection(
  metricId: PremiumMetricId,
  acquirerName?: string,
) {
  const getDenominator = denominatorFields[metricId];
  return base
    .exclude(
      (deal) => deal.dealValue === undefined || deal.dealValue <= 0,
      "value_undisclosed",
      "dealValue",
    )
    .exclude(
      (deal) => {
        const denominator = getDenominator(deal);
        return denominator === undefined || denominator <= 0;
      },
      metricId === "acquirer.premium.preDealValuation"
        ? "pre_deal_valuation_unresearched"
        : metricId === "acquirer.premium.lastKnownValuation"
        ? "last_known_valuation_unresearched"
        : "funding_unresearched",
      metricId === "acquirer.premium.preDealValuation"
        ? "preDealValuation"
        : metricId === "acquirer.premium.lastKnownValuation"
        ? "lastKnownValuation"
        : "totalFunding",
    )
    .exclude(
      (deal) =>
        acquirerName !== undefined &&
        deal.acquirerName !== acquirerName,
      "other_acquirer",
    );
}

function estimate(
  collection: ReturnType<typeof denominatorCollection>,
  metricId: PremiumMetricId,
  withheld: WithheldMetric[],
): TracedValue | undefined {
  const result = collection.estimate(metricId);
  if (!isSufficient(result)) {
    withheld.push({
      metricId,
      reason: result.message,
      lineage: summarizeLineage(result.lineage),
    });
    return undefined;
  }
  return result;
}

const withheld: WithheldMetric[] = [];
const premiumMetrics: Record<string, PremiumMetricOutput> = {};
for (const metricId of Object.keys(denominatorFields) as PremiumMetricId[]) {
  const result = estimate(
    denominatorCollection(metricId),
    metricId,
    withheld,
  );
  if (result) {
    const declaration = getMetricDeclaration(metricId);
    premiumMetrics[metricId] = {
      metricId,
      label: declaration.label,
      definition: declaration.definition,
      unit: declaration.unit,
      estimate: result,
    };
  }
}

const acquirerPremiums: AcquirerPremiumOutput[] = [];
const acquirerNames = [
  ...new Set(dataset.acquisitions.map((deal) => deal.acquirerName)),
];
for (const metricId of Object.keys(denominatorFields) as PremiumMetricId[]) {
  const getDenominator = denominatorFields[metricId];
  for (const acquirerName of acquirerNames) {
    const collection = eligibleCollection(metricId, acquirerName).map(
      (deal) => deal.dealValue! / getDenominator(deal)!,
      metricId === "acquirer.premium.preDealValuation"
        ? "dealValue / preDealValuation"
        : metricId === "acquirer.premium.lastKnownValuation"
        ? "dealValue / company.lastKnownValuation"
        : "dealValue / company.totalFunding",
    );
    const result = collection.estimate(metricId);
    if (!isSufficient(result)) {
      if (collection.n > 0) {
        withheld.push({
          metricId,
          reason:
            `Acquirer ${acquirerName} has n=${collection.n}; aggregate withheld below the registry minimum`,
          lineage: summarizeLineage(result.lineage),
        });
      }
      continue;
    }
    acquirerPremiums.push({
      acquirerName,
      metricId,
      estimate: result,
    });
  }
}

const output = {
  generatedAt: options.computedAt,
  datasetVersion: options.datasetVersion,
  datasetHash: options.datasetHash ??
    hashDataset(parseVerifiedDataset(dataset)).fullHash,
  source: "Lacuna verified dataset (src/data/dataset.verified.json)",
  premiumMetrics,
  acquirerPremiums,
  withheld,
};

writeFileSync(
  "src/data/computed-acquirer-premiums.json",
  JSON.stringify(output, null, 2) + "\n",
);
writeSlimArtifact(
  "computed-acquirer-premiums.slim.json",
  output,
  [
    ...Object.values(premiumMetrics).map((metric) => ({
      metricId: metric.metricId,
      label: metric.label,
      definition: metric.definition,
      unit: metric.unit,
      estimate: withoutLineage(metric.estimate) as Record<string, unknown>,
      n: metric.estimate.sampleSize,
    })),
    ...withheld.map((entry) => ({
      metricId: entry.metricId,
      label: entry.metricId,
      definition: entry.metricId,
      unit: "x",
      n: entry.lineage.n,
      withheldReason: entry.reason,
    })),
  ],
);

console.log(
  `✅ Computed ${
    Object.keys(premiumMetrics).length
  } premium metrics; withheld ${withheld.length} metrics`,
);
