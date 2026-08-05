"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import LlmQualityBadge from "@/components/ui/LlmQualityBadge";
import type { LlmQualityReport } from "@/lib/ai/quality";

interface AskResponse {
  answer?: string;
  modelId?: string | null;
  quality?: LlmQualityReport | null;
  error?: string;
}

interface GapAnalystPanelProps {
  /** POST endpoint accepting `{ question }` and returning an `AskResponse`. */
  endpoint: string;
  /** Grounding note shown above the prompt controls. */
  description: ReactNode;
  placeholder: string;
  suggestedQuestions: readonly string[];
  /** Adds the "deterministic summary" hint when no model answered. */
  showDeterministicNote?: boolean;
}

/**
 * LLM gap analyst: suggested prompts, free-text question, and grounded answer
 * for research panels backed by a snapshot `ask` route.
 */
export default function GapAnalystPanel({
  endpoint,
  description,
  placeholder,
  suggestedQuestions,
  showDeterministicNote = false,
}: GapAnalystPanelProps) {
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
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt || undefined }),
      });
      const body = await res.json() as AskResponse;
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setAnswer(body.answer ?? "");
      setModelId(body.modelId ?? null);
      setQuality(body.quality ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }, [endpoint, question]);

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-lacuna-pink/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-lacuna-plum" aria-hidden />
        <h4 className="text-sm font-semibold text-lacuna-plum">
          Gap analyst (LLM)
        </h4>
      </div>
      <p className="mb-3 text-xs text-lacuna-blue/80">{description}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {suggestedQuestions.map((q) => (
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
          placeholder={placeholder}
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
          {showDeterministicNote && !modelId && !quality && (
            <p className="mt-2 text-[10px] text-lacuna-blue/60">
              Deterministic summary (LLM not configured)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
