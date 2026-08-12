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
import { LacunaTooltip } from "@/components/ui/Tooltip";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";

interface MetricProps {
  readonly label?: string;
  readonly provenance: MetricProvenance;
  readonly formatValue?: (value: number) => string;
  readonly className?: string;
  readonly compact?: boolean;
  readonly compactLabel?: string;
  readonly tooltipSummary?: string;
  readonly additionalEvidence?: ReactNode;
}

const defaultFormat = (value: number): string => String(value);

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
}: {
  readonly exclusions: readonly ExcludedRef[] | LineageSummary["excluded"];
}) {
  const counts = new Map<string, number>();
  for (const entry of exclusions) {
    counts.set(
      entry.reason,
      (counts.get(entry.reason) ?? 0) + (
        "count" in entry ? entry.count : 1
      ),
    );
  }
  return (
    <section>
      <h4 className="font-semibold">Exclusion reasons</h4>
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
      <ExclusionRollup exclusions={lineage.excluded} />
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
      <ExclusionRollup exclusions={lineage.excluded} />
      <Missingness lineage={lineage} />
      <p className="text-xs text-lacuna-text-muted">
        Dataset {lineage.datasetVersion ?? "unknown"} · computed{" "}
        {lineage.computedAt}
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
      <ExclusionRollup exclusions={summary.excluded} />
      <Missingness lineage={summary} />
      <p className="text-xs text-lacuna-text-muted">
        Dataset {summary.datasetVersion ?? "unknown"} · computed{" "}
        {summary.computedAt}
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

export default function Metric({
  label,
  provenance,
  formatValue = defaultFormat,
  className,
  compact = false,
  compactLabel,
  tooltipSummary,
  additionalEvidence,
}: MetricProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const isArtifact = provenance.kind === "artifact";
  const loaded = detail?.estimate
    ? { kind: "measured" as const, estimate: detail.estimate }
    : detail?.summary
    ? { kind: "summary" as const, summary: detail.summary }
    : null;
  const display = isArtifact
    ? provenance.estimate.kind === "sufficient"
      ? formatValue(provenance.estimate.value)
      : compact
      ? compactLabel ?? "·"
      : "Insufficient disclosed data"
    : provenance.kind === "measured"
    ? formatValue(provenance.estimate.value)
    : provenance.kind === "withheld"
    ? compact ? compactLabel ?? "·" : "Insufficient disclosed data"
    : provenance.value === null
    ? "Insufficient disclosed data"
    : formatValue(provenance.value);
  const summary = tooltipSummary ??
    (isArtifact
      ? provenance.estimate.kind === "sufficient"
        ? `n=${provenance.estimate.sampleSize} · ${
          provenance.estimate.confidenceInterval[0].toFixed(2)
        }–${provenance.estimate.confidenceInterval[1].toFixed(2)}`
        : `n=${provenance.estimate.sampleSize} · ${provenance.estimate.message}`
      : provenance.kind === "measured"
      ? `n=${provenance.estimate.sampleSize} · ${
        provenance.estimate.confidenceInterval[0].toFixed(2)
      }–${provenance.estimate.confidenceInterval[1].toFixed(2)}`
      : provenance.kind === "withheld"
      ? `n=${provenance.estimate.sampleSize} · ${provenance.estimate.message}`
      : provenance.caveat ?? provenance.model.definition);
  const setLoaded = (next: MetricDetail) => setDetail(next);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <LacunaTooltip
        content={<span>{summary}{label ? ` · ${label}` : ""}</span>}
      >
        <SheetTrigger
          className={`inline-flex items-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-lacuna-lavender ${
            className ?? ""
          }`}
          aria-label={`Why this number: ${label ?? display}`}
        >
          <span>{display}</span>
          <span aria-hidden className="text-xs text-lacuna-plum/70">ⓘ</span>
        </SheetTrigger>
      </LacunaTooltip>
      <SheetContent side="right" className="w-[min(32rem,95vw)]">
        <SheetHeader>
          <SheetTitle>{label ?? "Why this number?"}</SheetTitle>
          <SheetClose aria-label="Close evidence panel">×</SheetClose>
        </SheetHeader>
        <SheetBody>
          {isArtifact
            ? loaded
              ? loaded.kind === "measured"
                ? (
                  <MeasuredEvidence
                    provenance={loaded}
                    additionalEvidence={additionalEvidence}
                  />
                )
                : <SummaryEvidence summary={loaded.summary} />
              : <ArtifactEvidence artifact={provenance} onLoaded={setLoaded} />
            : provenance.kind === "measured"
            ? (
              <MeasuredEvidence
                provenance={provenance}
                additionalEvidence={additionalEvidence}
              />
            )
            : provenance.kind === "withheld"
            ? <WithheldEvidence provenance={provenance} />
            : (
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
            )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
