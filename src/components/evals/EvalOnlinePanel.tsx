"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import InsufficientDataEmpty from "@/components/ui/InsufficientDataEmpty";
import type {
  OnlineEvalSummary,
  OnlineEvalTrace,
} from "@/lib/ai/evals/responseTypes";

interface EvalPayload {
  inferenceConfigured: boolean;
  logPathConfigured: boolean;
  summary: OnlineEvalSummary;
  traces: OnlineEvalTrace[];
}

/** Live traces and human spot-checks for the current server process. */
export default function EvalOnlinePanel() {
  const [payload, setPayload] = useState<EvalPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/ai/evals");
    if (!response.ok) {
      setError("The eval log could not be loaded.");
      return;
    }
    setPayload(await response.json() as EvalPayload);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/ai/evals").then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        setError("The eval log could not be loaded.");
        return;
      }
      setPayload(await response.json() as EvalPayload);
    }).catch(() => {
      if (active) setError("The eval log could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, []);

  async function spotCheck(id: string, verdict: "pass" | "fail") {
    setPendingId(id);
    const response = await fetch("/api/ai/evals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, verdict, note }),
    });
    setPendingId(null);
    if (!response.ok) {
      setError("That spot-check was not saved.");
      return;
    }
    setNote("");
    await load();
  }

  return (
    <Card>
      <p className="lacuna-kicker text-[10px] text-lacuna-blue/70">
        Online · this server process
      </p>
      <h2 className="mt-1 text-lg font-semibold text-lacuna-plum">
        Production traces
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
        Gated inference calls land here with latency and the quality-gate
        hallucination flag. Spot-checks stay in memory
        {payload?.logPathConfigured
          ? " and append to LACUNA_EVAL_LOG."
          : ". Set LACUNA_EVAL_LOG to append a JSONL file on a writable disk."}
      </p>

      {error ? <p className="mt-3 text-sm text-lacuna-plum">{error}</p> : null}

      {payload && payload.summary.count === 0
        ? (
          <div className="mt-4">
            <InsufficientDataEmpty
              title="No inference traces yet"
              description={payload.inferenceConfigured
                ? "A gated narrative has not run in this process. Latency, hallucination flags, and spot-checks appear after one does."
                : "Server inference is not configured, so this process has no live model traces to score."}
            />
          </div>
        )
        : null}

      {payload && payload.summary.count > 0
        ? (
          <>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-lacuna-lavender/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-lacuna-blue/70">
                  Traces
                </dt>
                <dd className="text-sm font-medium text-lacuna-plum">
                  {payload.summary.count}
                </dd>
              </div>
              <div className="rounded-lg border border-lacuna-lavender/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-lacuna-blue/70">
                  Hallucination flags
                </dt>
                <dd className="text-sm font-medium text-lacuna-plum">
                  {payload.summary.hallucinationCount ?? "insufficient data"}
                </dd>
              </div>
              <div className="rounded-lg border border-lacuna-lavender/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-lacuna-blue/70">
                  Latency
                </dt>
                <dd className="text-sm font-medium text-lacuna-plum">
                  {payload.summary.latencyMs
                    ? `${payload.summary.latencyMs.min}–${payload.summary.latencyMs.max} ms`
                    : "insufficient data"}
                </dd>
              </div>
            </dl>
            <label className="mt-4 block text-xs text-lacuna-blue">
              Spot-check note
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 w-full rounded-lg border border-lacuna-lavender/40 px-3 py-2 text-sm text-lacuna-plum"
              />
            </label>
            <ul className="mt-4 space-y-3">
              {payload.traces.map((trace) => (
                <li
                  key={trace.id}
                  className="rounded-lg border border-lacuna-lavender/30 px-3 py-3"
                >
                  <p className="text-xs text-lacuna-blue/70">
                    {trace.feature} · {trace.modelId} · {trace.latencyMs} ms
                    {trace.hallucinationRisk ? " · hallucination flag" : ""}
                  </p>
                  <p className="mt-1 text-sm text-lacuna-plum">
                    {trace.outputPreview || "No output preview"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pendingId === trace.id}
                      onClick={() => void spotCheck(trace.id, "pass")}
                      className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum"
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === trace.id}
                      onClick={() => void spotCheck(trace.id, "fail")}
                      className="rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum"
                    >
                      Fail
                    </button>
                    {trace.spotCheck
                      ? (
                        <span className="self-center text-xs text-lacuna-blue">
                          Marked {trace.spotCheck.verdict}
                        </span>
                      )
                      : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
        : null}
    </Card>
  );
}
