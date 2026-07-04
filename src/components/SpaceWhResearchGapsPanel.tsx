"use client";

/**
 * Gap matrix + pipeline chips + LLM analyst for space-linked women's health research.
 */

import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import { SPACE_WH_RESEARCH_MODEL } from "@/data/spaceWhResearchAssets";
import verifiedDataset from "@/data/dataset.verified.json";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  buildTrialToTransactionSnapshot,
  type PipelineAssetView,
} from "@/lib/research/trialToTransactionPipeline";
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  SPACE_WH_PROVENANCE_LABELS,
  type TrialToTransactionStage,
} from "@/lib/research/spaceWhTaxonomy";

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-pink/10 p-3">
      <p className="text-xl font-bold text-lacuna-plum">{value}</p>
      <p className="mt-1 text-xs text-lacuna-blue">{label}</p>
    </div>
  );
}

function StageChip({
  stage,
  reached,
}: {
  stage: TrialToTransactionStage;
  reached: boolean;
}) {
  return (
    <span
      title={PIPELINE_STAGE_LABELS[stage]}
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        reached
          ? "bg-lacuna-plum/15 text-lacuna-plum"
          : "bg-lacuna-surface-subtle text-lacuna-blue/50 line-through decoration-lacuna-blue/30"
      }`}
    >
      {stage.replace(/_/g, " ")}
    </span>
  );
}

function FunnelBar({
  stage,
  count,
  max,
}: {
  stage: TrialToTransactionStage;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 8 : 0) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-lacuna-blue">
        {PIPELINE_STAGE_LABELS[stage]}
      </span>
      <div className="h-5 flex-1 rounded bg-lacuna-pink/10">
        <div
          className="h-full rounded bg-lacuna-plum/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-semibold text-lacuna-plum">
        {count}
      </span>
    </div>
  );
}

function AssetRow({ view }: { view: PipelineAssetView }) {
  const reached = new Set(view.stagesReached);
  return (
    <div className="rounded-lg border border-lacuna-lavender/25 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-lacuna-plum">
            {view.asset.name}
          </p>
          <p className="mt-0.5 text-[11px] text-lacuna-blue/80">
            {SPACE_WH_PROVENANCE_LABELS[view.asset.provenanceTag]}
          </p>
        </div>
        {view.isCommercialGap && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Commercial gap
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {PIPELINE_STAGE_ORDER.map((stage) => (
          <StageChip
            key={stage}
            stage={stage}
            reached={reached.has(stage)}
          />
        ))}
      </div>
      {view.linkedCompanies.length > 0 && (
        <p className="mt-2 text-[11px] text-lacuna-blue">
          Linked: {view.linkedCompanies.map((c) => c.name).join(", ")}
        </p>
      )}
      {view.linkedAcquisitions.length > 0 && (
        <p className="mt-1 text-[11px] text-lacuna-blue">
          Deals:{" "}
          {view.linkedAcquisitions
            .map((d) => `${d.acquirerName} ← ${d.targetName}`)
            .join("; ")}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-lacuna-blue/70">
        {view.asset.gapNotes[0]}
      </p>
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  "What are the largest commercial gaps?",
  "Which assets reached space validation but not a company?",
  "How does fertility research compare to osteoporosis?",
] as const;

export default function SpaceWhResearchGapsPanel() {
  const snapshot = useMemo(
    () =>
      buildTrialToTransactionSnapshot(
        verifiedDataset as VerifiedDataset,
      ),
    [],
  );

  const maxStageCount = Math.max(
    ...PIPELINE_STAGE_ORDER.map((s) => snapshot.summary.stageCounts[s]),
    1,
  );

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (q?: string) => {
    const prompt = (q ?? question).trim();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/space-wh-pipeline/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt || undefined,
        }),
      });
      const data = await res.json() as {
        answer?: string;
        modelId?: string | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setAnswer(data.answer ?? "");
      setModelId(data.modelId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }, [question]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm">
        <ModelProvenanceHint model={SPACE_WH_RESEARCH_MODEL}>
          <div className="mb-4 max-w-3xl cursor-help">
            <h3 className="text-sm font-semibold text-lacuna-plum">
              Space → trial → transaction gaps
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
              {snapshot.disclaimer}
            </p>
          </div>
        </ModelProvenanceHint>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox
            value={String(snapshot.summary.assetCount)}
            label="Research assets"
          />
          <StatBox
            value={String(snapshot.summary.commercialGapCount)}
            label="Commercial gaps"
          />
          <StatBox
            value={String(snapshot.summary.transactionCount)}
            label="Touch verified deals"
          />
          <StatBox
            value={String(
              snapshot.summary.provenanceCounts.space_physiology_only ?? 0,
            )}
            label="Physiology-only"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
              Pipeline funnel (furthest stage)
            </h4>
            <div className="space-y-2">
              {PIPELINE_STAGE_ORDER.map((stage) => (
                <FunnelBar
                  key={stage}
                  stage={stage}
                  count={snapshot.summary.stageCounts[stage]}
                  max={maxStageCount}
                />
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
              Gap matrix (assets reaching stage)
            </h4>
            <table className="w-full min-w-[480px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-lacuna-lavender/30 text-lacuna-text-secondary">
                  <th className="py-1.5 pr-2 font-medium">Area</th>
                  {PIPELINE_STAGE_ORDER.map((s) => (
                    <th key={s} className="px-1 py-1.5 text-center font-medium">
                      {s.split("_")[0]}
                    </th>
                  ))}
                  <th className="py-1.5 pl-2 font-medium">Gaps</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.areaMatrix.map((row) => (
                  <tr
                    key={row.area}
                    className="border-b border-lacuna-lavender/15"
                  >
                    <td className="py-1.5 pr-2 text-lacuna-plum">
                      {row.label}
                    </td>
                    {PIPELINE_STAGE_ORDER.map((stage) => {
                      const n = row.stageReachCounts[stage];
                      return (
                        <td
                          key={stage}
                          className={`px-1 py-1.5 text-center ${
                            n === 0
                              ? "bg-amber-50/80 text-amber-800/60"
                              : "text-lacuna-plum font-medium"
                          }`}
                        >
                          {n}
                        </td>
                      );
                    })}
                    <td className="py-1.5 pl-2 font-semibold text-amber-800">
                      {row.commercialGapCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {snapshot.assets.map((view) => (
          <AssetRow key={view.asset.id} view={view} />
        ))}
      </div>

      <div className="rounded-xl border border-lacuna-lavender/40 bg-lacuna-pink/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lacuna-plum" aria-hidden />
          <h4 className="text-sm font-semibold text-lacuna-plum">
            Gap analyst (LLM)
          </h4>
        </div>
        <p className="mb-3 text-xs text-lacuna-blue/80">
          Grounded only in the pipeline JSON above. Uses Vercel AI Gateway
          model <code className="text-lacuna-plum">xai/grok-4.3</code> when
          configured; otherwise a deterministic summary.
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
            placeholder="Ask about gaps, stages, or assets…"
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
            {modelId && (
              <p className="mt-2 text-[10px] text-lacuna-blue/60">
                Model: {modelId}
              </p>
            )}
            {!modelId && (
              <p className="mt-2 text-[10px] text-lacuna-blue/60">
                Deterministic summary (LLM not configured)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
