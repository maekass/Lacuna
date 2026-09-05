"use client";

import Metric from "@/components/Metric";
import Card from "@/components/ui/Card";
import { getQualityVisibility } from "@/lib/data/qualityVisibilityProvider";
import { QUALITY_VISIBILITY_MODELS } from "@/lib/data/qualityVisibility";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function GradeStrip({
  grades,
}: {
  grades: { A: number; B: number; C: number; D: number; F: number };
}) {
  const cells = [
    ["A", grades.A, "bg-emerald-50 text-emerald-800"],
    ["B", grades.B, "bg-sky-50 text-sky-800"],
    ["C", grades.C, "bg-amber-50 text-amber-800"],
    ["D", grades.D, "bg-orange-50 text-orange-800"],
    ["F", grades.F, "bg-red-50 text-red-800"],
  ] as const;
  return (
    <div className="flex flex-wrap gap-1">
      {cells.map(([label, count, className]) => (
        <span
          key={label}
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}
        >
          {`${label} ${count}`}
        </span>
      ))}
    </div>
  );
}

/** Measurement-layer census — quality grades, withheld metrics, vintage, display debt. */
export default function DataQualityVisibility({
  compact = false,
}: {
  compact?: boolean;
}) {
  const census = getQualityVisibility();
  const { quality, metrics, vintage, premiums, displayProvenance } = census;
  const metricClass = "align-baseline font-semibold text-lacuna-plum";

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-lacuna-plum">
          Measurement layer
        </h3>
        <p className="text-sm text-lacuna-blue">
          Quality grades, gated-metric publication, vintage gaps, and display
          provenance — read from computed artifacts, not a hardcoded pipeline
          panel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <div className="text-2xl font-bold text-emerald-700">
            <Metric
              label="Published gated metrics"
              className="text-2xl font-bold text-emerald-700"
              provenance={{
                kind: "assumption",
                value: metrics.published,
                model: QUALITY_VISIBILITY_MODELS.publishedMetrics,
                caveat:
                  `${metrics.publishedWithFullProvenance}/${metrics.published} carry unit + definition + n + bootstrap CI + lineage.`,
              }}
            />
          </div>
          <div className="text-xs text-emerald-700">
            {`Published (${metrics.publishedWithFullProvenance}/${metrics.published} fully provenanced)`}
          </div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <div className="text-2xl font-bold text-amber-800">
            <Metric
              label="Withheld metrics"
              className="text-2xl font-bold text-amber-800"
              provenance={{
                kind: "assumption",
                value: metrics.withheld,
                model: QUALITY_VISIBILITY_MODELS.withheldMetrics,
                caveat: `${
                  pct(metrics.withheldRate)
                } of ${metrics.registered} registered metrics.`,
              }}
              formatValue={(value) => `${value}`}
            />
          </div>
          <div className="text-xs text-amber-800">
            {`Withheld of ${metrics.registered} (${pct(metrics.withheldRate)})`}
          </div>
        </div>
        <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
          <div className="text-2xl font-bold text-orange-800">
            <Metric
              label="Primary numbers missing as-of"
              className="text-2xl font-bold text-orange-800"
              provenance={{
                kind: "assumption",
                value: vintage.missingDedicatedAsOfRate,
                model: QUALITY_VISIBILITY_MODELS.vintageMissingRate,
              }}
              formatValue={(rate) => pct(rate)}
            />
          </div>
          <div className="text-xs text-orange-800">
            {`Missing dedicated as-of (${vintage.missingDedicatedAsOf}/${vintage.primaryNumbers})`}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-2xl font-bold text-slate-700">
            <Metric
              label="Uncovered numeric sites"
              className="text-2xl font-bold text-slate-700"
              provenance={{
                kind: "assumption",
                value: displayProvenance.uncovered,
                model: QUALITY_VISIBILITY_MODELS.displayUncovered,
                caveat: `${
                  pct(displayProvenance.uncoveredRate)
                } of ${displayProvenance.total} sites.`,
              }}
            />
          </div>
          <div className="text-xs text-slate-600">
            {`Uncovered display sites of ${displayProvenance.total}`}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-lacuna-lavender/30 bg-lacuna-lavender/5 p-3">
          <p className="text-xs font-medium text-lacuna-blue">
            Company source quality
          </p>
          <p className={`${metricClass} mt-1`}>
            avg{" "}
            <Metric
              label="Average company quality score"
              className={metricClass}
              provenance={{
                kind: "assumption",
                value: quality.companies.avgScore,
                model: QUALITY_VISIBILITY_MODELS.companyAvgScore,
              }}
              formatValue={(score) => score.toFixed(1)}
            />
          </p>
          <div className="mt-2">
            <GradeStrip grades={quality.companies.grades} />
          </div>
        </div>
        <div className="rounded-lg border border-lacuna-lavender/30 bg-lacuna-lavender/5 p-3">
          <p className="text-xs font-medium text-lacuna-blue">
            Deal source quality
          </p>
          <p className={`${metricClass} mt-1`}>
            avg{" "}
            <Metric
              label="Average deal quality score"
              className={metricClass}
              provenance={{
                kind: "assumption",
                value: quality.acquisitions.avgScore,
                model: QUALITY_VISIBILITY_MODELS.dealAvgScore,
              }}
              formatValue={(score) => score.toFixed(1)}
            />
          </p>
          <div className="mt-2">
            <GradeStrip grades={quality.acquisitions.grades} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-lacuna-blue">
        <Metric
          label="Reproducible computedPremium rows"
          className={metricClass}
          provenance={{
            kind: "assumption",
            value: premiums.reproducible,
            model: QUALITY_VISIBILITY_MODELS.computedPremium,
            caveat:
              `${premiums.reproducible}/${premiums.computed} curated premiums equal dealValue / preDealValuation.`,
          }}
        />
        {`/${premiums.computed} computedPremium rows exactly reproducible · Deal values use announcement date only (${vintage.dealValues.withEventDate}/${vintage.dealValues.total}) — not a value vintage. · Pre-deal valuations with date: ${vintage.preDealValuations.withDedicatedAsOf}/${vintage.preDealValuations.total}.`}
      </p>

      {compact
        ? null
        : (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Most uncovered numeric render files
            </p>
            <ul className="space-y-1 text-[11px] text-slate-600">
              {displayProvenance.topUncoveredFiles.map((row) => (
                <li key={row.file} className="flex justify-between gap-3">
                  <span className="truncate">{row.file}</span>
                  <span className="shrink-0 font-medium">{`${row.count}`}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      <p className="mt-4 text-[11px] text-slate-500">
        {`Artifact ${census.datasetVersion ?? "unknown"} · hash ${
          census.datasetHash.slice(0, 12)
        } · ${census.generatedAt}${
          quality.lowGradeCompanies.length + quality.lowGradeDeals.length > 0
            ? ` · ${quality.lowGradeCompanies.length} companies and ${quality.lowGradeDeals.length} deals graded D/F`
            : ""
        }`}
      </p>
    </Card>
  );
}
