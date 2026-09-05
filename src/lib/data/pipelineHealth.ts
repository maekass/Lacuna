/**
 * Honest pipeline-health view from committed artifacts.
 * No fabricated latencies, error counts, or 0.7× record heuristics.
 */

import qualityScores from "@/data/computed-data-quality-scores.json";
import datasetSummary from "@/data/computed-dataset-summary.json";
import type { DatasetPipelineStatus } from "@/lib/data/buildDatasetSummary";
import provenanceBaseline from "../../../scripts/provenance-baseline.json";

export interface PipelineHealthView {
  readonly lastUpdated: string;
  readonly datasetVersion: string;
  readonly datasetAgeDaysLabel: string;
  readonly dealsTotalLabel: string;
  readonly companiesTotalLabel: string;
  readonly companiesAvgScoreLabel: string;
  readonly dealsAvgScoreLabel: string;
  readonly provenanceCoveredLabel: string;
  readonly provenanceTotalLabel: string;
  readonly provenanceCoverageLabel: string;
  readonly secIngestLabel: string;
  readonly secIngestConfigured: boolean;
}

interface QualitySummary {
  readonly summary: {
    readonly companies: { readonly total: number; readonly avgScore: number };
    readonly acquisitions: {
      readonly total: number;
      readonly avgScore: number;
    };
  };
}

interface DatasetSummaryShape {
  readonly provenance: {
    readonly lastUpdated: string;
    readonly datasetVersion: string;
  };
  readonly pipelines: {
    readonly secIngestLastRunAt: string | null;
    readonly secIngestStatus: string | null;
  };
}

interface ProvenanceBaselineShape {
  readonly total: number;
  readonly covered: number;
}

function datasetAgeDays(lastUpdated: string, now = new Date()): number {
  const asOf = new Date(`${lastUpdated}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) return 0;
  const ms = now.getTime() - asOf.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export interface PipelineHealthOverrides {
  readonly pipelines?: DatasetPipelineStatus;
}

/**
 * Build the pipeline-health panel from hash-verified artifacts.
 * `secIngestLastRunAt` is null in static mode — rendered as not configured.
 * DB mode may pass live ingest state from `loadSummaryPipelines`.
 */
export function buildPipelineHealthView(
  now = new Date(),
  overrides: PipelineHealthOverrides = {},
): PipelineHealthView {
  const quality = qualityScores as QualitySummary;
  const summary = datasetSummary as DatasetSummaryShape;
  const provenance = provenanceBaseline as ProvenanceBaselineShape;
  const lastUpdated = summary.provenance.lastUpdated;
  const ageDays = datasetAgeDays(lastUpdated, now);
  const pipelines = overrides.pipelines ?? summary.pipelines;
  const secConfigured = pipelines.secIngestLastRunAt !== null;
  const coveragePct = provenance.total > 0
    ? ((provenance.covered / provenance.total) * 100).toFixed(1)
    : "0.0";

  return {
    lastUpdated,
    datasetVersion: summary.provenance.datasetVersion,
    datasetAgeDaysLabel: `${ageDays} day${
      ageDays === 1 ? "" : "s"
    } since last update`,
    dealsTotalLabel: String(quality.summary.acquisitions.total),
    companiesTotalLabel: String(quality.summary.companies.total),
    companiesAvgScoreLabel: quality.summary.companies.avgScore.toFixed(1),
    dealsAvgScoreLabel: quality.summary.acquisitions.avgScore.toFixed(1),
    provenanceCoveredLabel: String(provenance.covered),
    provenanceTotalLabel: String(provenance.total),
    provenanceCoverageLabel:
      `${provenance.covered} / ${provenance.total} (${coveragePct}%)`,
    secIngestLabel: secConfigured
      ? `${
        pipelines.secIngestStatus ?? "unknown"
      } · last run ${pipelines.secIngestLastRunAt}`
      : "Not configured (static dataset)",
    secIngestConfigured: secConfigured,
  };
}
