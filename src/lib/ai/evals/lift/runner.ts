/**
 * Runs one eval cell (arm × prompt version) against a draft generator.
 *
 * The retrieval arm goes through `runEvidenceAsk` — the same retrieval,
 * prompt builder, citation verifier, and quality gate the
 * `/api/research/evidence/ask` route uses — with the verified-dataset corpus
 * and an injected generator. The no-retrieval arm sends the question alone
 * through the same generator and output schema. Nothing here invents a
 * response: a failed call is recorded with `error` set.
 */
import {
  type EvidenceDraftGeneration,
  type EvidenceDraftGenerator,
} from "@/lib/ai/rag/answer";
import { runEvidenceAsk } from "@/lib/ai/rag/answer";
import type {
  EvidenceAskResponse,
  EvidencePassage,
} from "@/lib/ai/rag/contracts";
import { buildClosedBookUserPrompt, LIFT_PROMPTS } from "./prompts";
import {
  LIFT_AS_OF_DATE,
  LIFT_RESPONSE_SCHEMA,
  LIFT_TOP_K,
  type LiftArm,
  type LiftEvalItem,
  type LiftPromptVersion,
  type LiftResponseRecord,
} from "./types";

export interface RunLiftCellInput {
  items: readonly LiftEvalItem[];
  arm: LiftArm;
  promptVersion: LiftPromptVersion;
  corpus: readonly EvidencePassage[];
  generate: EvidenceDraftGenerator;
  concurrency?: number;
  /** Marks records from the unit-test fake model. */
  fake?: boolean;
  onRecord?: (record: LiftResponseRecord) => void;
}

interface Captured {
  generation?: EvidenceDraftGeneration;
  error?: string;
}

/**
 * Error name, HTTP status, and a short provider message for diagnostics.
 * Provider messages do not carry credentials; the length cap keeps records
 * small.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "inference_error";
  const status = (error as { statusCode?: unknown }).statusCode;
  const message = error.message.replace(/\s+/g, " ").trim().slice(0, 160);
  return [
    error.name || "Error",
    typeof status === "number" ? `status=${status}` : "",
    message,
  ].filter(Boolean).join(" ");
}

function capture(
  generate: EvidenceDraftGenerator,
  sink: Captured,
): EvidenceDraftGenerator {
  return async (input) => {
    try {
      const generation = await generate(input);
      sink.generation = generation;
      return generation;
    } catch (error) {
      sink.error = describeError(error);
      throw error;
    }
  };
}

function usageOf(captured: Captured): LiftResponseRecord["usage"] {
  return {
    inputTokens: captured.generation?.inputTokens ?? 0,
    outputTokens: captured.generation?.outputTokens ?? 0,
  };
}

async function runRetrieval(
  item: LiftEvalItem,
  input: RunLiftCellInput,
): Promise<LiftResponseRecord> {
  const template = LIFT_PROMPTS[input.promptVersion];
  const captured: Captured = {};
  const started = Date.now();
  const result = await runEvidenceAsk({
    request: {
      question: item.question,
      asOfDate: LIFT_AS_OF_DATE,
      lane: "research_draft",
      topK: LIFT_TOP_K,
    },
    corpus: input.corpus,
    generate: capture(input.generate, captured),
    requestId: `${item.id}:${input.arm}:${input.promptVersion}`,
    prompt: { version: template.label, system: template.retrievalSystem },
  });
  const body = result.body as EvidenceAskResponse;
  return {
    schema: LIFT_RESPONSE_SCHEMA,
    itemId: item.id,
    arm: "retrieval",
    promptVersion: input.promptVersion,
    modelId: captured.generation?.modelId ?? body.modelId ?? "none",
    disposition: body.disposition,
    answer: body.answer,
    claimTexts: body.claims.map((claim) => claim.text),
    citedIds: body.citations.map((citation) => citation.passageId),
    retrievedIds: [...body.retrievedPassageIds],
    usage: usageOf(captured),
    latencyMs: Date.now() - started,
    ...(captured.error || result.status !== 200
      ? { error: captured.error ?? `status_${result.status}` }
      : {}),
    ...(input.fake ? { fake: true } : {}),
  };
}

async function runClosedBook(
  item: LiftEvalItem,
  input: RunLiftCellInput,
): Promise<LiftResponseRecord> {
  const template = LIFT_PROMPTS[input.promptVersion];
  const captured: Captured = {};
  const started = Date.now();
  const base = {
    schema: LIFT_RESPONSE_SCHEMA,
    itemId: item.id,
    arm: "no_retrieval" as const,
    promptVersion: input.promptVersion,
    retrievedIds: [],
    ...(input.fake ? { fake: true } : {}),
  };
  try {
    const generation = await capture(input.generate, captured)({
      system: template.closedBookSystem,
      prompt: buildClosedBookUserPrompt({
        question: item.question,
        asOfDate: LIFT_AS_OF_DATE,
      }),
    });
    return {
      ...base,
      modelId: generation.modelId,
      disposition: generation.draft.disposition,
      answer: generation.draft.answer,
      claimTexts: generation.draft.claims.map((claim) => claim.text),
      citedIds: [
        ...new Set(
          generation.draft.claims.flatMap((claim) => claim.passageIds),
        ),
      ],
      usage: usageOf(captured),
      latencyMs: Date.now() - started,
    };
  } catch {
    return {
      ...base,
      modelId: "none",
      disposition: "abstain",
      answer: "",
      claimTexts: [],
      citedIds: [],
      usage: usageOf(captured),
      latencyMs: Date.now() - started,
      error: captured.error ?? "inference_error",
    };
  }
}

/** One pass over the items for one arm and prompt version. */
export async function runLiftCell(
  input: RunLiftCellInput,
): Promise<LiftResponseRecord[]> {
  const concurrency = Math.max(1, input.concurrency ?? 1);
  const records: LiftResponseRecord[] = new Array(input.items.length);
  let next = 0;
  const worker = async () => {
    while (next < input.items.length) {
      const index = next++;
      const item = input.items[index];
      const record = input.arm === "retrieval"
        ? await runRetrieval(item, input)
        : await runClosedBook(item, input);
      records[index] = record;
      input.onRecord?.(record);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return records;
}
