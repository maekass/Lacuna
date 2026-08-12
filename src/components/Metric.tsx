"use client";

import { useState } from "react";
import { getMetricDeclaration } from "@/lib/lineage";
import type { Lineage, LineageSummary } from "@/lib/lineage";
import type { MetricProvenance } from "@/lib/provenance/metricProvenance";
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
}

const defaultFormat = (value: number): string => String(value);

function lineageSummary(
  provenance: Extract<MetricProvenance, { kind: "measured" | "withheld" }>,
): Lineage | LineageSummary {
  return provenance.kind === "measured"
    ? provenance.estimate.lineage
    : provenance.summary;
}

function EvidenceBody({
  provenance,
}: {
  provenance: Extract<MetricProvenance, { kind: "measured" | "withheld" }>;
}) {
  const lineage = lineageSummary(provenance);
  const declaration = getMetricDeclaration(lineage.metricId);
  const isFull = provenance.kind === "measured";
  const full = isFull ? lineage as Lineage : null;

  return (
    <div className="space-y-5 text-sm text-lacuna-text-primary">
      <section>
        <h4 className="font-semibold">{declaration.label}</h4>
        <p className="mt-1 text-lacuna-text-secondary">
          {declaration.definition}
        </p>
        <p className="mt-2 text-xs text-lacuna-text-muted">
          Estimator: {lineage.estimator} · n={lineage.n}
          {!isFull && provenance.estimate.minRequired
            ? ` · required n=${provenance.estimate.minRequired}`
            : ""}
        </p>
      </section>

      {provenance.kind === "withheld" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <h4 className="font-semibold">Why this number is withheld</h4>
          <p className="mt-1">{provenance.estimate.message}</p>
        </section>
      )}

      {full && (
        <>
          <section>
            <h4 className="font-semibold">Contributing records</h4>
            <p className="mt-1 text-xs text-lacuna-text-muted">
              {full.inputs.length} records produced this estimate.
            </p>
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
              {full.inputs.map((ref) => (
                <li key={`${ref.table}:${ref.id}`}>
                  {ref.table} · {ref.id}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="font-semibold">Supporting records</h4>
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
              {full.supporting.map((ref) => (
                <li key={`${ref.table}:${ref.id}`}>
                  {ref.table} · {ref.id}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="font-semibold">Sources</h4>
            <ul className="mt-2 max-h-40 overflow-y-auto text-xs">
              {full.sources.map((source) => (
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
          </section>
          <section>
            <h4 className="font-semibold">Exclusions and missingness</h4>
            <ul className="mt-2 text-xs">
              {full.excluded.map((entry) => (
                <li key={`${entry.ref.table}:${entry.ref.id}:${entry.reason}`}>
                  {entry.ref.id}: {entry.reason}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {!full && lineage.excluded.length > 0 && (
        <section>
          <h4 className="font-semibold">Exclusion reasons</h4>
          <ul className="mt-2 text-xs">
            {(lineage.excluded as readonly { reason: string; count: number }[])
              .map((entry) => (
                <li key={entry.reason}>
                  {entry.reason}: {entry.count}
                </li>
              ))}
          </ul>
        </section>
      )}

      {lineage.missingness.length > 0 && (
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
      )}

      <p className="text-xs text-lacuna-text-muted">
        Dataset {lineage.datasetVersion ?? "unknown"} · computed{" "}
        {lineage.computedAt}
      </p>
    </div>
  );
}

export default function Metric({
  label,
  provenance,
  formatValue = defaultFormat,
  className,
}: MetricProps) {
  const [open, setOpen] = useState(false);
  const isRecordBacked = provenance.kind === "measured" ||
    provenance.kind === "withheld";
  const value = isRecordBacked
    ? provenance.kind === "measured"
      ? formatValue(provenance.estimate.value)
      : "Insufficient disclosed data"
    : provenance.value === null
    ? "Insufficient disclosed data"
    : formatValue(provenance.value);
  const summary = isRecordBacked
    ? provenance.kind === "measured"
      ? `n=${provenance.estimate.sampleSize} · ${
        provenance.estimate.confidenceInterval[0].toFixed(2)
      }–${provenance.estimate.confidenceInterval[1].toFixed(2)}`
      : `n=${provenance.estimate.sampleSize} · ${provenance.estimate.message}`
    : provenance.caveat ?? provenance.model.definition;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <LacunaTooltip
        content={
          <span>
            {summary}
            {label ? ` · ${label}` : ""}
          </span>
        }
      >
        <SheetTrigger
          className={`inline-flex items-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-lacuna-lavender ${
            className ?? ""
          }`}
          aria-label={`Why this number: ${label ?? value}`}
        >
          <span>{value}</span>
          <span aria-hidden className="text-xs text-lacuna-plum/70">ⓘ</span>
        </SheetTrigger>
      </LacunaTooltip>
      <SheetContent side="right" className="w-[min(32rem,95vw)]">
        <SheetHeader>
          <SheetTitle>{label ?? "Why this number?"}</SheetTitle>
          <SheetClose aria-label="Close evidence panel">×</SheetClose>
        </SheetHeader>
        <SheetBody>
          {isRecordBacked
            ? <EvidenceBody provenance={provenance} />
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
