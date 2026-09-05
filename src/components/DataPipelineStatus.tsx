import DataQualityVisibility from "@/components/DataQualityVisibility";
import Card from "@/components/ui/Card";
import type { DatasetPipelineStatus } from "@/lib/data/buildDatasetSummary";
import { buildPipelineHealthView } from "@/lib/data/pipelineHealth";

/**
 * Pipeline health from committed, hash-verified artifacts, plus the
 * measurement-layer census. Static mode has no live SEC ingest — that
 * absence is rendered, not filled in.
 */
export default function DataPipelineStatus({
  pipelines,
}: {
  pipelines?: DatasetPipelineStatus;
}) {
  const health = buildPipelineHealthView(new Date(), { pipelines });

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Data Pipeline Status
          </h3>
          <p className="text-sm text-lacuna-blue">
            Counts and grades from verified artifacts — no fabricated latency or
            invented completion percentages.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div className="text-2xl font-bold text-blue-700">
              {health.dealsTotalLabel}
            </div>
            <div className="text-xs text-blue-600">Verified deals</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-2xl font-bold text-slate-700">
              {health.companiesTotalLabel}
            </div>
            <div className="text-xs text-slate-600">Company records</div>
          </div>
          <div className="col-span-2 rounded-lg border border-amber-100 bg-amber-50 p-3 sm:col-span-1">
            <div className="text-sm font-semibold text-amber-900">
              {health.datasetAgeDaysLabel}
            </div>
            <div className="text-xs text-amber-800">
              Dataset as of {health.lastUpdated}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-lacuna-lavender/5 p-3">
            <div>
              <div className="font-medium text-lacuna-plum">
                SEC EDGAR ingest
              </div>
              <div className="text-xs text-lacuna-blue">
                {health.secIngestLabel}
              </div>
            </div>
            <span
              className={`rounded border px-2 py-1 text-xs font-medium ${
                health.secIngestConfigured
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {health.secIngestConfigured ? "Configured" : "Not configured"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-lacuna-lavender/5 p-3">
            <div>
              <div className="font-medium text-lacuna-plum">
                Source-quality grades
              </div>
              <div className="text-xs text-lacuna-blue">
                Companies avg {health.companiesAvgScoreLabel} · deals avg{" "}
                {health.dealsAvgScoreLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-lacuna-lavender/5 p-3">
            <div>
              <div className="font-medium text-lacuna-plum">
                Provenance instrumentation
              </div>
              <div className="text-xs text-lacuna-blue">
                {health.provenanceCoverageLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            Dataset version{" "}
            {health.datasetVersion}. Grades and coverage come from{" "}
            <code className="text-[11px]">
              computed-data-quality-scores.json
            </code>{" "}
            and{" "}
            <code className="text-[11px]">provenance-baseline.json</code>,
            hash-verified on every push. SEC ingest uses live{" "}
            <code className="text-[11px]">loadSummaryPipelines</code> when{" "}
            <code className="text-[11px]">LACUNA_DATA_MODE=db</code>
            .
          </p>
        </div>
      </Card>

      <DataQualityVisibility />
    </div>
  );
}
