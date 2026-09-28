/**
 * Measurement-layer census: quality grades, gated-metric publication,
 * vintage (as-of) coverage, and display-provenance debt.
 *
 * Pure functions — scripts write `computed-quality-visibility.json`;
 * the UI reads that slim artifact via `qualityVisibilityProvider.ts`.
 */

import { getMetricDeclaration } from "@/lib/lineage";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

export type QualityGrade = "A" | "B" | "C" | "D" | "F";

export interface GradeCounts {
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly D: number;
  readonly F: number;
}

export interface EntityQualitySummary {
  readonly total: number;
  readonly grades: GradeCounts;
  readonly avgScore: number;
}

export interface QualityLayerSummary {
  readonly companies: EntityQualitySummary;
  readonly acquisitions: EntityQualitySummary;
  readonly grading: Readonly<Record<QualityGrade, string>>;
  readonly lowGradeCompanies: readonly QualityFlag[];
  readonly lowGradeDeals: readonly QualityFlag[];
}

export interface QualityFlag {
  readonly id: string;
  readonly label: string;
  readonly grade: QualityGrade;
  readonly score: number;
}

export interface PublishedGatedMetric {
  readonly metricId: string;
  readonly scope: string;
  readonly label: string;
  readonly hasUnit: boolean;
  readonly hasDefinition: boolean;
  readonly hasN: boolean;
  readonly hasBootstrapCi: boolean;
  readonly hasLineage: boolean;
}

export interface MetricPublicationCensus {
  readonly published: number;
  readonly withheld: number;
  readonly registered: number;
  readonly withheldRate: number;
  readonly publishedWithFullProvenance: number;
  readonly publishedMetrics: readonly PublishedGatedMetric[];
}

export interface VintageBreakdown {
  readonly total: number;
  readonly withDedicatedAsOf: number;
}

export interface VintageCensus {
  readonly definition: string;
  readonly recordsInScope: number;
  readonly primaryNumbers: number;
  readonly dedicatedAsOf: number;
  readonly missingDedicatedAsOf: number;
  readonly missingDedicatedAsOfRate: number;
  readonly companyPrimary: VintageBreakdown;
  readonly dealValues: {
    readonly total: number;
    readonly withEventDate: number;
    readonly withValueAsOf: number;
  };
  readonly preDealValuations: VintageBreakdown;
}

export interface PremiumReproducibility {
  readonly computed: number;
  readonly reproducible: number;
}

export interface DisplayProvenanceFileCount {
  readonly file: string;
  readonly count: number;
}

export interface DisplayProvenanceCensus {
  readonly total: number;
  readonly covered: number;
  readonly exempt: number;
  readonly uncovered: number;
  readonly uncoveredRate: number;
  readonly topUncoveredFiles: readonly DisplayProvenanceFileCount[];
}

export interface EconomicReplayFieldDebt {
  readonly field: "totalFunding" | "lastKnownValuation";
  readonly active: number;
  readonly replayEligible: number;
  readonly currentOnlyMissingPublicAsOf: number;
}

export interface EconomicReplayCensus {
  readonly note: string;
  readonly activeRecords: number;
  readonly replayEligible: number;
  readonly replayEligibleRate: number;
  readonly currentOnlyMissingPublicAsOf: number;
  readonly currentOnlyRate: number;
  readonly byField: readonly EconomicReplayFieldDebt[];
}

export interface QualityVisibilityArtifact {
  readonly generatedAt: string;
  readonly datasetHash: string;
  readonly datasetVersion?: string;
  readonly source: string;
  readonly quality: QualityLayerSummary;
  readonly metrics: MetricPublicationCensus;
  readonly vintage: VintageCensus;
  readonly economicReplay?: EconomicReplayCensus;
  readonly premiums: PremiumReproducibility;
  readonly displayProvenance: DisplayProvenanceCensus;
}

export interface VintageRecordInput {
  readonly companies: ReadonlyArray<{
    readonly id?: string;
    readonly lastKnownValuation?: number;
    readonly totalFunding?: number;
  }>;
  readonly acquisitions: ReadonlyArray<{
    readonly dealValue?: number;
    readonly announcedDate?: string;
    readonly preDealValuation?: number;
    readonly preDealValuationDate?: string;
    readonly computedPremium?: number;
  }>;
}

export interface SufficientEstimate {
  readonly kind: "sufficient";
  readonly value: number;
  readonly sampleSize: number;
  readonly confidenceInterval?: readonly [number, number];
  readonly lineage?: unknown;
}

export interface MetricPublicationInput {
  readonly benchmarks: {
    readonly benchmarks: ReadonlyArray<{
      readonly sector?: string;
      readonly label?: string;
      readonly definition?: string;
      readonly unit?: string;
      readonly medianMoic?: unknown;
    }>;
    readonly withheld: readonly unknown[];
  };
  readonly premiums: {
    readonly premiumMetrics: Readonly<
      Record<string, {
        readonly metricId?: string;
        readonly label?: string;
        readonly definition?: string;
        readonly unit?: string;
        readonly estimate?: unknown;
      }>
    >;
    readonly acquirerPremiums: ReadonlyArray<{
      readonly acquirerName?: string;
      readonly metricId?: string;
      readonly estimate?: unknown;
    }>;
    readonly withheld: readonly unknown[];
  };
  readonly confidenceIntervals: {
    readonly results: ReadonlyArray<{
      readonly metricId?: string;
      readonly scope?: string;
      readonly label?: string;
      readonly definition?: string;
      readonly unit?: string;
      readonly estimate?: unknown;
    }>;
    readonly withheld: readonly unknown[];
  };
  readonly correlations: {
    readonly sectors: readonly unknown[];
    readonly withheld: readonly unknown[];
  };
}

export interface DisplayCensusInput {
  readonly total: number;
  readonly covered: number;
  readonly exempt: number;
  readonly uncovered: number;
  readonly perFileUncovered: Readonly<Record<string, number>>;
}

const VINTAGE_DEFINITION =
  "Dedicated as-of for the record's primary economic number. lastKnownValuation and totalFunding have no as-of field. dealValue's announcedDate is an event date, not a value vintage. Only preDealValuationDate counts when the primary number is preDealValuation.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSufficientEstimate(value: unknown): value is SufficientEstimate {
  if (!isRecord(value) || value.kind !== "sufficient") return false;
  if (typeof value.value !== "number" || typeof value.sampleSize !== "number") {
    return false;
  }
  return true;
}

/**
 * Normalize sparse grade maps from compute-data-quality.ts into A–F counts.
 */
export function normalizeGradeCounts(
  grades: Readonly<Record<string, number>>,
): GradeCounts {
  return {
    A: grades.A ?? 0,
    B: grades.B ?? 0,
    C: grades.C ?? 0,
    D: grades.D ?? 0,
    F: grades.F ?? 0,
  };
}

function companyPrimaryField(
  company: VintageRecordInput["companies"][number],
): "lastKnownValuation" | "totalFunding" | null {
  if (typeof company.lastKnownValuation === "number") {
    return "lastKnownValuation";
  }
  if (typeof company.totalFunding === "number") return "totalFunding";
  return null;
}

function dealPrimaryField(
  deal: VintageRecordInput["acquisitions"][number],
): "dealValue" | "preDealValuation" | null {
  if (typeof deal.dealValue === "number") return "dealValue";
  if (typeof deal.preDealValuation === "number") return "preDealValuation";
  return null;
}

/**
 * Count how many primary economic numbers lack a dedicated as-of date.
 */
export function computeVintageCensus(
  dataset: VintageRecordInput,
  evidenceRecords: readonly {
    readonly companyId?: string;
    readonly field?: string;
    readonly publicAsOfDate?: string | null;
    readonly id?: string;
    readonly verificationStatus?: string | null;
    readonly supersedesId?: string | null;
  }[] = [],
): VintageCensus {
  const superseded = new Set(
    evidenceRecords.flatMap((record) =>
      record.supersedesId ? [record.supersedesId] : []
    ),
  );
  const datedKeys = new Set(
    evidenceRecords.filter((record) =>
      record.id &&
      !superseded.has(record.id) &&
      record.verificationStatus !== "retracted" &&
      typeof record.publicAsOfDate === "string" &&
      record.companyId &&
      record.field
    ).map((record) => `${record.companyId}:${record.field}`),
  );
  let companyPrimary = 0;
  let companyDated = 0;
  for (const company of dataset.companies) {
    const field = companyPrimaryField(company);
    if (!field) continue;
    companyPrimary += 1;
    const id = "id" in company && typeof company.id === "string"
      ? company.id
      : undefined;
    if (id && datedKeys.has(`${id}:${field}`)) companyDated += 1;
  }

  let dealValueTotal = 0;
  let dealValueEventDate = 0;
  let preDealTotal = 0;
  let preDealAsOf = 0;
  let primaryNumbers = 0;
  let dedicatedAsOf = 0;

  for (const deal of dataset.acquisitions) {
    if (typeof deal.dealValue === "number") {
      dealValueTotal += 1;
      if (deal.announcedDate) dealValueEventDate += 1;
    }
    if (typeof deal.preDealValuation === "number") {
      preDealTotal += 1;
      if (deal.preDealValuationDate) preDealAsOf += 1;
    }
    const primary = dealPrimaryField(deal);
    if (!primary) continue;
    primaryNumbers += 1;
    if (primary === "preDealValuation" && deal.preDealValuationDate) {
      dedicatedAsOf += 1;
    }
  }

  primaryNumbers += companyPrimary;
  dedicatedAsOf += companyDated;
  const recordsInScope = dataset.companies.length +
    dataset.acquisitions.length;
  const missingDedicatedAsOf = primaryNumbers - dedicatedAsOf;

  return {
    definition: VINTAGE_DEFINITION,
    recordsInScope,
    primaryNumbers,
    dedicatedAsOf,
    missingDedicatedAsOf,
    missingDedicatedAsOfRate: primaryNumbers > 0
      ? missingDedicatedAsOf / primaryNumbers
      : 0,
    companyPrimary: { total: companyPrimary, withDedicatedAsOf: companyDated },
    dealValues: {
      total: dealValueTotal,
      withEventDate: dealValueEventDate,
      withValueAsOf: 0,
    },
    preDealValuations: {
      total: preDealTotal,
      withDedicatedAsOf: preDealAsOf,
    },
  };
}

/**
 * Verify curated `computedPremium` equals dealValue / preDealValuation.
 */
export function countReproduciblePremiums(
  deals: VintageRecordInput["acquisitions"],
): PremiumReproducibility {
  let computed = 0;
  let reproducible = 0;
  for (const deal of deals) {
    if (typeof deal.computedPremium !== "number") continue;
    computed += 1;
    if (
      typeof deal.dealValue !== "number" ||
      typeof deal.preDealValuation !== "number" ||
      deal.preDealValuation === 0
    ) {
      continue;
    }
    const expected = Number(
      (deal.dealValue / deal.preDealValuation).toFixed(2),
    );
    if (Math.abs(expected - deal.computedPremium) < 1e-9) reproducible += 1;
  }
  return { computed, reproducible };
}

const REPLAY_CENSUS_NOTE =
  "Missing publicAsOfDate means the fact is current-catalog only. Do not invent a publication date to raise the historical-replay share.";

function validReplayDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/**
 * Count active economic evidence that can be replayed versus current-only
 * because publication timing was never captured.
 */
export function computeEconomicReplayCensus(
  records: readonly {
    readonly id: string;
    readonly field: "totalFunding" | "lastKnownValuation";
    readonly sourceCitation?: string | null;
    readonly publicAsOfDate?: string | null;
    readonly datePrecision?: string | null;
    readonly verificationStatus?: string | null;
    readonly supersedesId?: string | null;
  }[],
): EconomicReplayCensus {
  const superseded = new Set<string>();
  for (const record of records) {
    if (record.supersedesId) superseded.add(record.supersedesId);
  }
  const active = records.filter((record) =>
    !superseded.has(record.id) && record.verificationStatus !== "retracted"
  );
  const fields = ["totalFunding", "lastKnownValuation"] as const;
  const byField = fields.map((field) => {
    const rows = active.filter((record) => record.field === field);
    const replayEligible = rows.filter((record) =>
      record.datePrecision === "day" &&
      typeof record.publicAsOfDate === "string" &&
      validReplayDay(record.publicAsOfDate) &&
      Boolean(record.sourceCitation?.trim())
    ).length;
    const currentOnlyMissingPublicAsOf = rows.filter((record) =>
      record.publicAsOfDate == null
    ).length;
    return {
      field,
      active: rows.length,
      replayEligible,
      currentOnlyMissingPublicAsOf,
    };
  });
  const replayEligible = byField.reduce(
    (sum, row) => sum + row.replayEligible,
    0,
  );
  const currentOnlyMissingPublicAsOf = byField.reduce(
    (sum, row) => sum + row.currentOnlyMissingPublicAsOf,
    0,
  );
  return {
    note: REPLAY_CENSUS_NOTE,
    activeRecords: active.length,
    replayEligible,
    replayEligibleRate: active.length > 0 ? replayEligible / active.length : 0,
    currentOnlyMissingPublicAsOf,
    currentOnlyRate: active.length > 0
      ? currentOnlyMissingPublicAsOf / active.length
      : 0,
    byField,
  };
}

function registryMeta(metricId: string | undefined): {
  label: string;
  definition: string;
  unit: string;
} {
  if (!metricId) return { label: "", definition: "", unit: "" };
  try {
    const declaration = getMetricDeclaration(metricId);
    return {
      label: declaration.label,
      definition: declaration.definition,
      unit: declaration.unit,
    };
  } catch {
    return { label: metricId, definition: "", unit: "" };
  }
}

function publishedFromEstimate(
  metricId: string,
  scope: string,
  row: {
    readonly label?: string;
    readonly definition?: string;
    readonly unit?: string;
  },
  estimate: SufficientEstimate,
): PublishedGatedMetric {
  const meta = registryMeta(metricId);
  const label = row.label || meta.label || metricId;
  const definition = row.definition || meta.definition;
  const unit = row.unit || meta.unit;
  return {
    metricId,
    scope,
    label,
    hasUnit: unit.length > 0,
    hasDefinition: definition.length > 0,
    hasN: Number.isFinite(estimate.sampleSize),
    hasBootstrapCi: Array.isArray(estimate.confidenceInterval) &&
      estimate.confidenceInterval.length === 2,
    hasLineage: estimate.lineage !== undefined && estimate.lineage !== null,
  };
}

/**
 * Count published vs withheld gated metrics across computed artifacts.
 */
export function computeMetricPublicationCensus(
  input: MetricPublicationInput,
): MetricPublicationCensus {
  const publishedMetrics: PublishedGatedMetric[] = [];

  for (const row of input.benchmarks.benchmarks) {
    if (!isSufficientEstimate(row.medianMoic)) continue;
    publishedMetrics.push(publishedFromEstimate(
      "sector.moic.median",
      row.sector ?? "All sectors",
      row,
      row.medianMoic,
    ));
  }

  for (const [metricId, row] of Object.entries(input.premiums.premiumMetrics)) {
    if (!isSufficientEstimate(row.estimate)) continue;
    publishedMetrics.push(publishedFromEstimate(
      row.metricId ?? metricId,
      "all acquirers",
      row,
      row.estimate,
    ));
  }

  for (const row of input.premiums.acquirerPremiums) {
    if (!isSufficientEstimate(row.estimate)) continue;
    publishedMetrics.push(publishedFromEstimate(
      row.metricId ?? "acquirer.premium",
      row.acquirerName ?? "acquirer",
      {},
      row.estimate,
    ));
  }

  for (const row of input.confidenceIntervals.results) {
    if (!isSufficientEstimate(row.estimate)) continue;
    publishedMetrics.push(publishedFromEstimate(
      row.metricId ?? "confidence",
      row.scope ?? "All sectors",
      row,
      row.estimate,
    ));
  }

  const withheld = input.benchmarks.withheld.length +
    input.premiums.withheld.length +
    input.confidenceIntervals.withheld.length +
    input.correlations.withheld.length;
  const published = publishedMetrics.length;
  const registered = published + withheld;
  const publishedWithFullProvenance =
    publishedMetrics.filter((metric) =>
      metric.hasUnit && metric.hasDefinition && metric.hasN &&
      metric.hasBootstrapCi && metric.hasLineage
    ).length;

  return {
    published,
    withheld,
    registered,
    withheldRate: registered > 0 ? withheld / registered : 0,
    publishedWithFullProvenance,
    publishedMetrics,
  };
}

/**
 * Slim display-provenance totals for the UI (not the full site list).
 */
export function summarizeDisplayProvenance(
  census: DisplayCensusInput,
): DisplayProvenanceCensus {
  const topUncoveredFiles = Object.entries(census.perFileUncovered)
    .sort((left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .slice(0, 8)
    .map(([file, count]) => ({ file, count }));
  return {
    total: census.total,
    covered: census.covered,
    exempt: census.exempt,
    uncovered: census.uncovered,
    uncoveredRate: census.total > 0 ? census.uncovered / census.total : 0,
    topUncoveredFiles,
  };
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function gradeCells(grades: GradeCounts): string {
  return `${grades.A} | ${grades.B} | ${grades.C} | ${grades.D} | ${grades.F}`;
}

/**
 * Markdown report for GitHub Actions step summaries and PR comments.
 */
export function formatQualityVisibilityMarkdown(
  artifact: QualityVisibilityArtifact,
): string {
  const { quality, metrics, vintage, premiums, displayProvenance } = artifact;
  const topFiles = displayProvenance.topUncoveredFiles
    .map((row) => `| \`${row.file}\` | ${row.count} |`)
    .join("\n");
  const publishedLines = metrics.publishedMetrics
    .map((metric) =>
      `- \`${metric.metricId}\` (${metric.scope}) — unit=${metric.hasUnit} definition=${metric.hasDefinition} n=${metric.hasN} CI=${metric.hasBootstrapCi} lineage=${metric.hasLineage}`
    )
    .join("\n");

  return [
    "<!-- lacuna-quality-visibility -->",
    "# Measurement layer visibility",
    "",
    `Dataset \`${
      artifact.datasetHash.slice(0, 12)
    }\` · ${artifact.generatedAt}`,
    "",
    "## Quality grades",
    "",
    "| Entity | n | avg | A | B | C | D | F |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| Companies | ${quality.companies.total} | ${quality.companies.avgScore} | ${
      gradeCells(quality.companies.grades)
    } |`,
    `| Acquisitions | ${quality.acquisitions.total} | ${quality.acquisitions.avgScore} | ${
      gradeCells(quality.acquisitions.grades)
    } |`,
    "",
    "## Gated metrics",
    "",
    `- Published: **${metrics.published}** (${metrics.publishedWithFullProvenance}/${metrics.published} with unit + definition + n + bootstrap CI + lineage)`,
    `- Withheld: **${metrics.withheld} / ${metrics.registered}** (${
      pct(metrics.withheldRate)
    })`,
    `- computedPremium: **${premiums.reproducible}/${premiums.computed}** exactly reproducible`,
    "",
    publishedLines,
    "",
    "## Vintage (dedicated as-of)",
    "",
    vintage.definition,
    "",
    `- Primary economic numbers: **${vintage.primaryNumbers}**`,
    `- Dedicated as-of: **${vintage.dedicatedAsOf}**`,
    `- Missing: **${vintage.missingDedicatedAsOf}** (${
      pct(vintage.missingDedicatedAsOfRate)
    })`,
    `- Company valuation/funding: ${vintage.companyPrimary.withDedicatedAsOf}/${vintage.companyPrimary.total} have as-of`,
    `- Deal values: ${vintage.dealValues.withValueAsOf}/${vintage.dealValues.total} have a value vintage (${vintage.dealValues.withEventDate} have announcement date only)`,
    `- Pre-deal valuations: ${vintage.preDealValuations.withDedicatedAsOf}/${vintage.preDealValuations.total} have \`preDealValuationDate\``,
    "",
    ...(artifact.economicReplay
      ? [
        "## Historical replay eligibility",
        "",
        artifact.economicReplay.note,
        "",
        `- Active economic records: **${artifact.economicReplay.activeRecords}**`,
        `- Replay-eligible (day-precision publicAsOfDate): **${artifact.economicReplay.replayEligible}** (${
          pct(artifact.economicReplay.replayEligibleRate)
        })`,
        `- Current-only because publicAsOfDate is missing: **${artifact.economicReplay.currentOnlyMissingPublicAsOf}** (${
          pct(artifact.economicReplay.currentOnlyRate)
        })`,
        ...artifact.economicReplay.byField.map((row) =>
          `- ${row.field}: ${row.replayEligible}/${row.active} replay-eligible; ${row.currentOnlyMissingPublicAsOf} missing publicAsOfDate`
        ),
        "",
      ]
      : []),
    "## Display provenance",
    "",
    `- Covered: **${displayProvenance.covered}** · exempt: **${displayProvenance.exempt}** · uncovered: **${displayProvenance.uncovered} / ${displayProvenance.total}** (${
      pct(displayProvenance.uncoveredRate)
    })`,
    "",
    "### Top uncovered files",
    "",
    "| File | Uncovered sites |",
    "| --- | ---: |",
    topFiles,
    "",
  ].join("\n");
}

export const QUALITY_VISIBILITY_MODELS = {
  companyAvgScore: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "getQualityVisibility",
    definition:
      "Average overallScore from computed-data-quality-scores.json company rows (source quality + completeness).",
  },
  dealAvgScore: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "getQualityVisibility",
    definition:
      "Average overallScore from computed-data-quality-scores.json acquisition rows.",
  },
  publishedMetrics: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "computeMetricPublicationCensus",
    definition:
      "Count of sufficient gated estimates across benchmarks, premiums, and confidence-interval artifacts.",
  },
  withheldMetrics: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "computeMetricPublicationCensus",
    definition:
      "Count of withheld[] rows across benchmarks, premiums, confidence intervals, and correlations.",
  },
  vintageMissingRate: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "computeVintageCensus",
    definition: VINTAGE_DEFINITION,
  },
  economicReplayEligibleRate: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "computeEconomicReplayCensus",
    definition:
      "Share of active economic evidence records with a valid day-precision publicAsOfDate. Null publicAsOfDate is current-only and must not be backfilled with an invented date.",
  },
  displayUncovered: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "summarizeDisplayProvenance",
    definition:
      "Numeric JSX / formatting-call sites in src/components and src/app that are not inside <Metric> and not exempted.",
  },
  computedPremium: {
    module: "src/lib/data/qualityVisibility.ts",
    exportName: "countReproduciblePremiums",
    definition:
      "Deals whose curated computedPremium equals dealValue / preDealValuation rounded to 2 decimal places (scripts/enrich-pre-deal-valuations.ts).",
  },
} as const satisfies Record<string, ModelProvenance>;
