/**
 * In-process online eval log.
 * Spot-checks survive for the life of this server process. Set
 * `LACUNA_EVAL_LOG` to also append JSONL when the filesystem is writable.
 */

import { appendFileSync } from "node:fs";
import type {
  OnlineEvalSummary,
  OnlineEvalTrace,
} from "@/lib/ai/evals/responseTypes";

export type { OnlineEvalSummary, OnlineEvalTrace };

const MAX_TRACES = 200;
const traces: OnlineEvalTrace[] = [];
let sequence = 0;

function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

function appendLog(entry: OnlineEvalTrace): void {
  const path = process.env.LACUNA_EVAL_LOG?.trim();
  if (!path) return;
  try {
    appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Serverless disks are often read-only. The memory trace still stands.
  }
}

/** Record one gated inference call for the online eval panel. */
export function recordOnlineTrace(input: {
  feature: string;
  modelId: string;
  latencyMs: number;
  qualityScore: number;
  qualityLevel: string;
  hallucinationRisk: boolean;
  prompt: string;
  output: string;
}): OnlineEvalTrace {
  sequence += 1;
  const trace: OnlineEvalTrace = {
    id: `trace-${sequence}`,
    feature: input.feature,
    modelId: input.modelId,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    qualityScore: input.qualityScore,
    qualityLevel: input.qualityLevel,
    hallucinationRisk: input.hallucinationRisk,
    promptPreview: preview(input.prompt),
    outputPreview: preview(input.output),
    recordedAt: new Date().toISOString(),
  };
  traces.push(trace);
  if (traces.length > MAX_TRACES) traces.shift();
  appendLog(trace);
  return trace;
}

/** Newest traces first. */
export function listOnlineTraces(): OnlineEvalTrace[] {
  return [...traces].reverse();
}

export function summarizeOnlineTraces(): OnlineEvalSummary {
  const latencies = traces.map((trace) => trace.latencyMs).sort((a, b) =>
    a - b
  );
  const summary: OnlineEvalSummary = {
    count: traces.length,
    spotChecked: traces.filter((trace) => trace.spotCheck).length,
  };
  if (traces.length > 0) {
    summary.hallucinationCount = traces.filter((trace) =>
      trace.hallucinationRisk
    ).length;
  }
  if (latencies.length > 0) {
    const mid = Math.floor((latencies.length - 1) / 2);
    summary.latencyMs = {
      min: latencies[0] ?? 0,
      max: latencies[latencies.length - 1] ?? 0,
      p50: latencies[mid] ?? 0,
    };
  }
  return summary;
}

/** Human spot-check. Returns null when the id is not in this process. */
export function spotCheckTrace(
  id: string,
  verdict: "pass" | "fail",
  note: string,
): OnlineEvalTrace | null {
  const trace = traces.find((item) => item.id === id);
  if (!trace) return null;
  trace.spotCheck = {
    verdict,
    note: note.trim().slice(0, 500),
    at: new Date().toISOString(),
  };
  appendLog(trace);
  return trace;
}

/** Test isolation. */
export function resetOnlineTraces(): void {
  traces.length = 0;
  sequence = 0;
}
