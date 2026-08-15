"use client";

import { type ReactNode, useState } from "react";
import MetricEvidence, { type MetricDetail } from "@/components/MetricEvidence";
import {
  lineageForMetric,
  type MetricProvenance,
} from "@/lib/provenance/metricProvenance";
import { LacunaTooltip } from "@/components/ui/Tooltip";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
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
  const provenanceClass = provenance.kind === "artifact"
    ? provenance.estimate.kind === "sufficient" ? "measured" : "withheld"
    : provenance.kind;
  const metricId = provenance.kind === "artifact"
    ? provenance.metricId
    : provenance.kind === "measured"
    ? lineageForMetric(provenance).metricId
    : provenance.kind === "withheld"
    ? lineageForMetric(provenance).metricId
    : undefined;
  const modelModule = provenance.kind === "proxy" ||
      provenance.kind === "assumption"
    ? provenance.model.module
    : undefined;
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
          data-provenance-class={provenanceClass}
          {...(metricId ? { "data-metric-id": metricId } : {})}
          {...(modelModule ? { "data-provenance-model": modelModule } : {})}
        >
          <span>{display}</span>
          <span aria-hidden className="text-xs text-lacuna-plum/70">ⓘ</span>
        </SheetTrigger>
      </LacunaTooltip>
      <SheetContent side="right" className="w-[min(32rem,95vw)]">
        <SheetHeader>
          <SheetTitle>{label ?? "Why this number?"}</SheetTitle>
          <SheetDescription>
            Evidence and provenance for this metric.
          </SheetDescription>
          <SheetClose aria-label="Close evidence panel">×</SheetClose>
        </SheetHeader>
        <SheetBody>
          <MetricEvidence
            provenance={provenance}
            additionalEvidence={additionalEvidence}
            loaded={detail}
            onLoaded={setLoaded}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
