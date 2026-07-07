"use client";

/**
 * Empowerment gap matrix + portfolio crosswalk + LLM analyst.
 * Snapshot is built server-side when passed from /research page.
 */

import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import LlmQualityBadge from "@/components/ui/LlmQualityBadge";
import { CitedSourceFooter } from "@/components/research/CitedSourceFooter";
import { GapDistributionChart } from "@/components/research/GapDistributionChart";
import { GapIndexBar } from "@/components/research/GapIndexBar";
import { ResearchMethodologyDrawer } from "@/components/research/ResearchMethodologyDrawer";
import { ResearchStatTile } from "@/components/research/ResearchStatTile";
import verifiedDataset from "@/data/dataset.verified.json";
import {
  PATIENT_EMPOWERMENT_MODEL,
  PATIENT_EMPOWERMENT_SOURCES,
} from "@/data/patientEmpowermentReport";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import type { LlmQualityReport } from "@/lib/ai/quality";
import {
  buildPatientEmpowermentSnapshot,
  exportEmpowermentCrosswalkCsv,
  type GapDimensionView,
  type PatientEmpowermentSnapshot,
  type PrerequisiteGapRow,
} from "@/lib/research/patientEmpowermentPipeline";
import {
  EMPOWERMENT_DATA_TIER_LABELS,
  EMPOWERMENT_SOURCE_TIER_LABELS,
  type EmpowermentMatchTier,
} from "@/lib/research/patientEmpowermentTaxonomy";

const MATCH_TIER_LABELS: Record<EmpowermentMatchTier, string> = {
  curated: "Curated analyst mapping",
  sector: "Sector overlap",
  keyword: "Description keyword",
};

const SUGGESTED_QUESTIONS = [
  "Where is gap index high but portfolio coverage low?",
  "Which gaps have zero portfolio coverage?",
  "How does genetic testing gap compare to clinical trials?",
  "Which prerequisite has the weakest portfolio crosswalk?",
] as const;

function PrerequisiteCard({ row }: { row: PrerequisiteGapRow }) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/30 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-lacuna-plum">{row.label}</p>
        <span className="text-xs font-semibold text-lacuna-plum tabular-nums">
          Mean gap {row.meanGapIndexPct}/100
        </span>
      </div>
      <GapIndexBar gapIndexPct={row.meanGapIndexPct} />
      <p className="mt-2 text-[11px] text-lacuna-blue">
        {row.metricCount} metrics · {row.linkedCompanyCount} companies ·{" "}
        {row.linkedDealCount} deals
      </p>
    </div>
  );
}

function PriorityRow({ view }: { view: GapDimensionView }) {
  const { metric } = view;
  return (
    <tr className="border-t border-lacuna-lavender/20 hover:bg-lacuna-surface-muted/50">
      <td className="p-2 align-top text-xs font-medium text-lacuna-plum">
        {metric.label}
      </td>
      <td className="p-2 align-top">
        <GapIndexBar gapIndexPct={metric.gapIndexPct} />
      </td>
      <td className="p-2 align-top text-right text-xs font-bold tabular-nums text-amber-900">
        {view.priorityScore}
      </td>
      <td className="p-2 align-top text-right text-xs tabular-nums text-lacuna-blue">
        {view.evidenceCoveragePct}%
        <span className="block text-[10px] text-lacuna-blue/60">evidence</span>
      </td>
      <td className="p-2 align-top text-right text-xs tabular-nums text-lacuna-blue">
        {view.curatedCoveragePct}%
        <span className="block text-[10px] text-lacuna-blue/60">curated</span>
      </td>
    </tr>
  );
}

function DimensionRow({ view }: { view: GapDimensionView }) {
  const { metric } = view;
  return (
    <tr className="border-t border-lacuna-lavender/20 hover:bg-lacuna-surface-muted/50">
      <td className="p-2 align-top">
        <p className="text-xs font-medium text-lacuna-plum">{metric.label}</p>
        <p className="mt-0.5 text-[10px] text-lacuna-blue/70">
          Cited: {metric.citedValue} ·{" "}
          {EMPOWERMENT_DATA_TIER_LABELS[metric.dataTier]}
        </p>
      </td>
      <td className="p-2 align-top">
        <GapIndexBar
          gapIndexPct={metric.gapIndexPct}
          showSeverity
          severity={metric.gapSeverity}
        />
      </td>
      <td className="p-2 align-top text-[11px] text-lacuna-blue">
        {view.linkedCompanies.length > 0
          ? (
            <ul className="space-y-0.5">
              {view.linkedCompanies.slice(0, 3).map((c) => (
                <li key={c.id}>
                  {c.name}{" "}
                  <span className="text-lacuna-blue/60" title={c.matchNote}>
                    ({MATCH_TIER_LABELS[c.matchTier]}
                    {c.sourceTier
                      ? ` · ${EMPOWERMENT_SOURCE_TIER_LABELS[c.sourceTier]}`
                      : ""}
                    )
                  </span>
                  {c.sourceUrl
                    ? (
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-sky-800 underline underline-offset-2"
                      >
                        ↗
                      </a>
                    )
                    : null}
                </li>
              ))}
              {view.linkedCompanies.length > 3
                ? (
                  <li className="text-lacuna-blue/60">
                    +{view.linkedCompanies.length - 3} more
                  </li>
                )
                : null}
            </ul>
          )
          : <span className="text-amber-800">Portfolio gap — no matches</span>}
      </td>
      <td className="p-2 align-top text-right text-[11px] tabular-nums text-lacuna-blue">
        {view.linkedDeals.length}
        <span className="block text-[10px] text-lacuna-blue/60">
          n={view.addressableInSample} addressable
        </span>
        <span className="block text-[10px] text-emerald-700">
          {view.curatedCoveragePct}% curated
        </span>
        <span className="block text-[10px] text-sky-800">
          {view.evidenceCoveragePct}% evidence
        </span>
        <span className="block text-[10px] text-lacuna-blue/80">
          {view.heuristicCoveragePct}% heuristic
        </span>
      </td>
    </tr>
  );
}

interface PatientEmpowermentPanelProps {
  snapshot?: PatientEmpowermentSnapshot;
}

export default function PatientEmpowermentPanel({
  snapshot: snapshotProp,
}: PatientEmpowermentPanelProps) {
  const fallbackSnapshot = useMemo(
    () => buildPatientEmpowermentSnapshot(verifiedDataset as VerifiedDataset),
    [],
  );
  const data = snapshotProp ?? fallbackSnapshot;
  const {
    headline,
    summary,
    prerequisiteMatrix,
    phaseSummary,
    dimensions,
    gapDistribution,
  } = data;

  const topGaps = useMemo(
    () => data.priorityRankings.slice(0, 5),
    [data.priorityRankings],
  );

  const topByIndex = useMemo(
    () =>
      [...dimensions].sort(
        (a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct,
      ).slice(0, 5),
    [dimensions],
  );

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [quality, setQuality] = useState<LlmQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (q?: string) => {
    const prompt = (q ?? question).trim();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/patient-empowerment/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt || undefined }),
      });
      const body = await res.json() as {
        answer?: string;
        modelId?: string | null;
        quality?: LlmQualityReport | null;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setAnswer(body.answer ?? "");
      setModelId(body.modelId ?? null);
      setQuality(body.quality ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }, [question]);

  const downloadCsv = useCallback(() => {
    const csv = exportEmpowermentCrosswalkCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "patient-empowerment-crosswalk.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const copyJson = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(data.summary, null, 2));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
        <ModelProvenanceHint model={PATIENT_EMPOWERMENT_MODEL}>
          <div className="mb-2 max-w-3xl cursor-help">
            <h3 className="text-sm font-semibold text-lacuna-plum">
              Patient empowerment baseline (breast cancer, 2022)
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
              Lacuna crosswalks cited HLTH/Outcomes4Me gaps to the verified
              portfolio — we do not measure live patient empowerment.
            </p>
          </div>
        </ModelProvenanceHint>

        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950">
          <span className="font-medium">Data freshness:</span>{" "}
          {headline.stalenessNote}
        </div>

        <ResearchMethodologyDrawer title="Methodology: gap index & crosswalk">
          <p className="mb-2">
            <strong>Gap index (0–100):</strong>{" "}
            higher = more patients underserved. Example: 45% records access →
            index 55 (asset_inverted).
          </p>
          <p className="mb-2">
            <strong>Priority score:</strong>{" "}
            gap index × (1 − curated analyst coverage %). Surfaces high patient
            need with thin reviewed mappings.
          </p>
          <p className="mb-2">
            <strong>Weighted burden index:</strong>{" "}
            phase × prerequisite × severity weights — overweight
            treatment/survivorship and critical gaps.
          </p>
          <p className="mb-2">
            <strong>Detail table coverage:</strong>{" "}
            curated % = analyst-reviewed links; evidence % = curated links with
            a public source URL; heuristic % = sector/keyword matches excluding
            curated.
          </p>
          <p>
            See{" "}
            <a
              href="https://github.com/maekass/Lacuna/blob/main/docs/PATIENT_EMPOWERMENT.md"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/PATIENT_EMPOWERMENT.md
            </a>{" "}
            and{" "}
            <code className="text-lacuna-plum">
              GET /api/research/patient-empowerment
            </code>.
          </p>
        </ResearchMethodologyDrawer>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <ResearchStatTile
            value={`${summary.medianGapIndexPct}/100`}
            label="Median gap index"
          />
          <ResearchStatTile
            value={`${summary.weightedBurdenIndexPct}/100`}
            label="Weighted burden index"
          />
          <ResearchStatTile
            value={`${summary.meanHighSeverityGapIndexPct}/100`}
            label="Mean high+ severity"
          />
          <ResearchStatTile
            value={String(summary.criticalMetricCount)}
            label={`Critical gaps (≥60)`}
          />
          <ResearchStatTile
            value={`${summary.maxGapIndexPct}`}
            label="Max gap index"
          />
          <ResearchStatTile
            value={String(summary.curatedLinkCount)}
            label="Curated links"
          />
          <ResearchStatTile
            value={String(summary.evidenceBackedLinkCount)}
            label="Evidence-backed links"
          />
        </div>

        <p className="mt-2 text-[10px] text-lacuna-blue/60">
          Unweighted mean {summary.meanGapIndexPct}/100 across{" "}
          {summary.metricCount} dimensions · mean evidence coverage{" "}
          {summary.meanEvidenceCoveragePct}% · n={headline.surveyRespondents
            .toLocaleString()} survey · max gap: {summary.maxGapMetricLabel}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-lg border border-lacuna-border bg-white px-3 py-1.5 text-[11px] font-medium text-lacuna-plum hover:bg-lacuna-surface-muted"
          >
            Export crosswalk CSV
          </button>
          <button
            type="button"
            onClick={() => void copyJson()}
            className="rounded-lg border border-lacuna-border bg-white px-3 py-1.5 text-[11px] font-medium text-lacuna-plum hover:bg-lacuna-surface-muted"
          >
            Copy summary JSON
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {prerequisiteMatrix.map((row) => (
            <PrerequisiteCard key={row.prerequisiteId} row={row} />
          ))}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-lacuna-text-secondary mb-2">
            Care-phase mean gap index
          </p>
          <div className="space-y-2">
            {phaseSummary.map((phase) => (
              <div
                key={phase.phase}
                className="flex items-center gap-3 text-xs"
              >
                <span className="w-36 shrink-0 text-lacuna-blue">
                  {phase.label}
                </span>
                <div className="flex-1">
                  <GapIndexBar gapIndexPct={phase.meanGapIndexPct} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <GapDistributionChart
            distribution={gapDistribution}
            metrics={dimensions}
          />
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-amber-200/60 bg-amber-50/30">
          <p className="px-2 pt-2 text-xs font-semibold text-amber-950">
            Priority ranking (gap × thin coverage)
          </p>
          <table className="w-full min-w-[480px] text-left">
            <thead className="text-[11px] text-lacuna-text-muted">
              <tr>
                <th className="p-2 font-medium">Dimension</th>
                <th className="p-2 font-medium">Gap index</th>
                <th className="p-2 font-medium text-right">Priority</th>
                <th className="p-2 font-medium text-right">Evidence</th>
                <th className="p-2 font-medium text-right">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {topGaps.map((view) => (
                <PriorityRow key={view.metric.id} view={view} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-lacuna-lavender/25">
          <p className="px-2 pt-2 text-xs font-semibold text-lacuna-plum">
            Top gaps by index (portfolio detail)
          </p>
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-lacuna-surface-muted text-[11px] text-lacuna-text-muted">
              <tr>
                <th className="p-2 font-medium">Gap dimension</th>
                <th className="p-2 font-medium">Gap index</th>
                <th className="p-2 font-medium">Portfolio affinity</th>
                <th className="p-2 font-medium text-right">Deals</th>
              </tr>
            </thead>
            <tbody>
              {topByIndex.map((view) => (
                <DimensionRow key={view.metric.id} view={view} />
              ))}
            </tbody>
          </table>
        </div>

        <details className="mt-4 rounded-lg border border-lacuna-lavender/25 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-lacuna-plum">
            All {dimensions.length} dimensions
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <tbody>
                {dimensions.map((view) => (
                  <DimensionRow key={view.metric.id} view={view} />
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="mt-4 text-[11px] italic text-lacuna-blue/70" role="note">
          {data.disclaimer}
        </p>

        <CitedSourceFooter sources={[...PATIENT_EMPOWERMENT_SOURCES]} />
      </div>

      <div className="rounded-xl border border-lacuna-lavender/40 bg-lacuna-pink/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lacuna-plum" aria-hidden />
          <h4 className="text-sm font-semibold text-lacuna-plum">
            Gap analyst (LLM)
          </h4>
        </div>
        <p className="mb-3 text-xs text-lacuna-blue/80">
          Grounded only in the empowerment snapshot JSON. Deterministic summary
          when inference is not configured.
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuestion(q);
                void ask(q);
              }}
              className="rounded-full border border-lacuna-lavender/40 bg-white px-3 py-1 text-[11px] text-lacuna-blue hover:border-lacuna-plum/40"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
            placeholder="Ask about gaps, prerequisites, or portfolio coverage…"
            className="flex-1 rounded-lg border border-lacuna-lavender/40 bg-white px-3 py-2 text-sm text-lacuna-plum placeholder:text-lacuna-blue/40"
            maxLength={500}
          />
          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lacuna-plum px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ask
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {answer && (
          <div className="mt-3 rounded-lg border border-lacuna-lavender/30 bg-white p-3">
            <p className="text-sm leading-relaxed text-lacuna-blue">{answer}</p>
            <LlmQualityBadge quality={quality} modelId={modelId} />
          </div>
        )}
      </div>
    </div>
  );
}
