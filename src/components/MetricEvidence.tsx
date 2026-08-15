"use client";

import { type ReactNode, useEffect, useState } from "react";
import { getMetricDeclaration } from "@/lib/lineage";
import type {
  ExcludedRef,
  Lineage,
  LineageSummary,
  TracedSufficient,
} from "@/lib/lineage";
import {
  type ArtifactMetric,
  lineageForMetric,
  type MeasuredMetric,
  type MetricProvenance,
  type WithheldMetric,
} from "@/lib/provenance/metricProvenance";

function formatComputedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLineage(value: unknown): value is Lineage {
  return isRecord(value) &&
    typeof value.metricId === "string" &&
    typeof value.estimator === "string" &&
    Array.isArray(value.inputs) &&
    Array.isArray(value.supporting) &&
    Array.isArray(value.sources) &&
    Array.isArray(value.excluded) &&
    Array.isArray(value.missingness) &&
    typeof value.n === "number" &&
    typeof value.originalInputCount === "number" &&
    typeof value.computedAt === "string";
}

function isLineageSummary(value: unknown): value is LineageSummary {
  return isRecord(value) &&
    typeof value.metricId === "string" &&
    typeof value.estimator === "string" &&
    Array.isArray(value.excluded) &&
    Array.isArray(value.missingness) &&
    typeof value.n === "number" &&
    typeof value.originalInputCount === "number" &&
    typeof value.computedAt === "string";
}

interface MetricDetail {
  readonly estimate?: TracedSufficient;
  readonly summary?: LineageSummary;
}

function parseMetricDetail(value: unknown): MetricDetail | null {
  if (!isRecord(value)) return null;
  const estimate = value.estimate;
  if (isRecord(estimate) && isLineage(estimate.lineage)) {
    return {
      estimate: {
        kind: "sufficient",
        value: typeof estimate.value === "number" ? estimate.value : 0,
        sampleSize: typeof estimate.sampleSize === "number"
          ? estimate.sampleSize
          : estimate.lineage.n,
        disclosedFraction: typeof estimate.disclosedFraction === "number"
          ? estimate.disclosedFraction
          : undefined,
        confidenceInterval: Array.isArray(estimate.confidenceInterval) &&
            estimate.confidenceInterval.length === 2 &&
            typeof estimate.confidenceInterval[0] === "number" &&
            typeof estimate.confidenceInterval[1] === "number"
          ? [estimate.confidenceInterval[0], estimate.confidenceInterval[1]]
          : [0, 0],
        lineage: estimate.lineage,
      },
    };
  }
  if (isLineageSummary(value.lineage)) return { summary: value.lineage };
  return null;
}

function RecordList({
  title,
  records,
  limit = 25,
}: {
  readonly title: string;
  readonly records: readonly { table: string; id: string }[];
  readonly limit?: number;
}) {
  if (records.length === 0) return null;
  const visible = records.slice(0, limit);
  return (
    <section>
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-1 text-xs text-lacuna-text-muted">
        {records.length} records
      </p>
      <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
        {visible.map((ref) => (
          <li key={`${ref.table}:${ref.id}`}>
            {ref.table} · {ref.id}
          </li>
        ))}
      </ul>
      {records.length > visible.length && (
        <p className="mt-1 text-xs text-lacuna-text-muted">
          +{records.length - visible.length} more records
        </p>
      )}
    </section>
  );
}

function ExclusionRollup({
  exclusions,
  expected,
}: {
  readonly exclusions: readonly ExcludedRef[] | LineageSummary["excluded"];
  readonly expected?: number;
}) {
  if (exclusions.length === 0) return null;
  const counts = new Map<string, number>();
  let total = 0;
  for (const entry of exclusions) {
    const count = "count" in entry ? entry.count : 1;
    counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + count);
    total += count;
  }
  return (
    <section>
      <h4 className="font-semibold">Exclusion reasons</h4>
      <p className="mt-1 text-xs text-lacuna-text-muted">
        {total}{" "}
        excluded records{expected === undefined ? "" : ` of ${expected}`}
      </p>
      <ul className="mt-2 text-xs">
        {[...counts.entries()].map(([reason, count]) => (
          <li key={reason}>{reason}: {count}</li>
        ))}
      </ul>
    </section>
  );
}

function Missingness(
  { lineage }: { readonly lineage: Lineage | LineageSummary },
) {
  return lineage.missingness.length > 0
    ? (
      <section>
        <h4 className="font-semibold">Missingness</h4>
        <ul className="mt-2 text-xs">
          {lineage.missingness.map((entry) => (
            <li key={`${entry.field}:${entry.total}`}>
              {entry.field}: {entry.missing}/{entry.total}
            </li>
          ))}
        </ul>
      </section>
    )
    : null;
}

function MeasuredEvidence({
  provenance,
  additionalEvidence,
}: {
  readonly provenance: MeasuredMetric;
  readonly additionalEvidence?: ReactNode;
}) {
  const lineage = lineageForMetric(provenance);
  const declaration = getMetricDeclaration(lineage.metricId);
  return (
    <div className="space-y-5 text-sm text-lacuna-text-primary">
      <section>
        <h4 className="font-semibold">{declaration.label}</h4>
        <p className="mt-1 text-lacuna-text-secondary">
          {declaration.definition}
        </p>
        <p className="mt-2 text-xs text-lacuna-text-muted">
          Estimator: {lineage.estimator} · n={lineage.n}
        </p>
      </section>
      {additionalEvidence}
      <RecordList title="Contributing records" records={lineage.inputs} />
      <RecordList title="Supporting records" records={lineage.supporting} />
      {lineage.sources.length > 0 && (
        <section>
          <h4 className="font-semibold">Sources</h4>
          <ul className="mt-2 max-h-40 overflow-y-auto text-xs">
            {lineage.sources.slice(0, 25).map((source) => (
              <li key={`${source.kind}:${source.rawCitation}`}>
                {source.url
                  ? (
                    <a className="underline" href={source.url}>
                      {source.rawCitation}
                    </a>
                  )
                  : source.rawCitation}
              </li>
            ))}
          </ul>
          {lineage.sources.length > 25 && (
            <p className="mt-1 text-xs text-lacuna-text-muted">
              +{lineage.sources.length - 25} more sources
            </p>
          )}
        </section>
      )}
      <ExclusionRollup
        exclusions={lineage.excluded}
        expected={lineage.originalInputCount - lineage.n}
      />
      <Missingness lineage={lineage} />
    </div>
  );
}

function WithheldEvidence(
  { provenance }: { readonly provenance: WithheldMetric },
) {
  const lineage = lineageForMetric(provenance);
  const declaration = getMetricDeclaration(lineage.metricId);
  return (
    <div className="space-y-5 text-sm text-lacuna-text-primary">
      <section>
        <h4 className="font-semibold">{declaration.label}</h4>
        <p className="mt-1 text-lacuna-text-secondary">
          {declaration.definition}
        </p>
        <p className="mt-2 text-xs text-lacuna-text-muted">
          Estimator: {lineage.estimator} · n={lineage.n} · required n=
          {provenance.estimate.minRequired}
        </p>
      </section>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <h4 className="font-semibold">Why this number is withheld</h4>
        <p className="mt-1">{provenance.estimate.message}</p>
      </section>
      <ExclusionRollup
        exclusions={lineage.excluded}
        expected={lineage.originalInputCount - lineage.n}
      />
      <Missingness lineage={lineage} />
      <p className="text-xs text-lacuna-text-muted">
        Dataset {lineage.datasetVersion ?? "unknown"} · computed{" "}
        <time dateTime={lineage.computedAt} title={lineage.computedAt}>
          {formatComputedAt(lineage.computedAt)}
        </time>
      </p>
    </div>
  );
}

function SummaryEvidence({ summary }: { readonly summary: LineageSummary }) {
  const declaration = getMetricDeclaration(summary.metricId);
  return (
    <div className="space-y-5 text-sm text-lacuna-text-primary">
      <section>
        <h4 className="font-semibold">{declaration.label}</h4>
        <p className="mt-1 text-lacuna-text-secondary">
          {declaration.definition}
        </p>
        <p className="mt-2 text-xs text-lacuna-text-muted">
          Estimator: {summary.estimator} · n={summary.n}
        </p>
      </section>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <h4 className="font-semibold">Why this number is withheld</h4>
        <p className="mt-1">
          {summary.suppression ?? "Insufficient disclosed data"}
        </p>
      </section>
      <ExclusionRollup
        exclusions={summary.excluded}
        expected={summary.originalInputCount - summary.n}
      />
      <Missingness lineage={summary} />
      <p className="text-xs text-lacuna-text-muted">
        Dataset {summary.datasetVersion ?? "unknown"} · computed{" "}
        <time dateTime={summary.computedAt} title={summary.computedAt}>
          {formatComputedAt(summary.computedAt)}
        </time>
      </p>
    </div>
  );
}

function ArtifactEvidence({
  artifact,
  onLoaded,
}: {
  readonly artifact: ArtifactMetric;
  readonly onLoaded: (detail: MetricDetail) => void;
}) {
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/metrics/${encodeURIComponent(artifact.metricId)}`)
      .then((response) => response.json() as Promise<unknown>)
      .then((value) => {
        const detail = parseMetricDetail(value);
        if (active && detail) onLoaded(detail);
        else if (active) setError(true);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [artifact.metricId, onLoaded]);
  return error
    ? <p className="text-sm text-red-700">Evidence could not be loaded.</p>
    : <p className="text-sm text-lacuna-text-muted">Loading evidence…</p>;
}

export default function MetricEvidence({
  provenance,
  additionalEvidence,
  loaded,
  onLoaded,
}: {
  readonly provenance: MetricProvenance;
  readonly additionalEvidence?: ReactNode;
  readonly loaded: MetricDetail | null;
  readonly onLoaded: (detail: MetricDetail) => void;
}) {
  if (provenance.kind === "artifact") {
    if (!loaded) {
      return <ArtifactEvidence artifact={provenance} onLoaded={onLoaded} />;
    }
    return loaded.estimate
      ? (
        <MeasuredEvidence
          provenance={{ kind: "measured", estimate: loaded.estimate }}
          additionalEvidence={additionalEvidence}
        />
      )
      : loaded.summary
      ? <SummaryEvidence summary={loaded.summary} />
      : null;
  }
  if (provenance.kind === "measured") {
    return (
      <MeasuredEvidence
        provenance={provenance}
        additionalEvidence={additionalEvidence}
      />
    );
  }
  if (provenance.kind === "withheld") {
    return <WithheldEvidence provenance={provenance} />;
  }
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold">
        {provenance.kind === "proxy" ? "Proxy value" : "Assumption"}
      </p>
      <p>{provenance.model.definition}</p>
      {provenance.caveat && (
        <p className="text-amber-800">{provenance.caveat}</p>
      )}
      <p className="text-xs text-lacuna-text-muted">
        Source module: {provenance.model.module}
      </p>
    </div>
  );
}

export type { MetricDetail };
