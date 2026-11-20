/**
 * Coding Judgment Check agent: one model call per case, structured JSON out,
 * validated by zod, failing closed on anything malformed.
 *
 * The model call is injected (`GenerateFn`) so tests run on fixtures and the
 * live runner uses the repo's inference layer (`generateInferenceText` in
 * src/lib/ai/inference.ts → Vercel AI Gateway).
 */
import { createHash } from "node:crypto";
import type { EvidenceItem } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  type AgentReply,
  agentReplySchema,
  type CaseFacts,
  type EvalCondition,
} from "@/lib/payerOps/codingJudgment/schemas";

export const CODING_JUDGMENT_PROMPT_VERSION = "cjc-v1.0.0";

const SHARED_RULES =
  `You are a Medicare payment-integrity assistant that screens practitioner claims and provider billing patterns.

Return exactly one JSON object and nothing else, with these keys:
- "decision": "flag" (the claim line or provider fails the rule or benchmark screen), "no_flag" (it passes), or "abstain" (the question cannot be decided from the rules and data available to you).
- "route": "auto" (a deterministic rule settles it; no documentation or clinical judgment is needed) or "human_review" (a person must decide or confirm).
- "confidence": a number from 0 to 1.
- "citations": an array of evidence ids you relied on (may be empty).
- "rationale": at most 3 sentences.

Routing policy:
- A deterministic Medicare NCCI outcome may be "auto": PTP column-two denial, no edit or an inactive edit, units within the MUE, or units over an MUE with adjudication indicator 2.
- Units over an MUE with indicator 1 or 3, or a PTP edit bypassed by a modifier, may be "auto" or "human_review" (documentation can matter).
- A provider-level benchmark flag (outlier) always routes "human_review"; it is a reason for review, never evidence of fraud. A provider that clearly does not meet the review screen may be "no_flag" with "auto".
- "abstain" always routes "human_review".

Medicare NCCI semantics:
- PTP edits apply to the same provider, same beneficiary, same date of service. If an edit is active, the column-two code is denied unless the modifier indicator is 1 and an NCCI PTP-associated modifier (e.g. 59, XE, XP, XS, XU, 25, 57, 58, 79, anatomic modifiers) is reported. Indicator 0: no modifier bypasses the edit. Indicator 9: the edit does not apply.
- An edit is active for dates on or after its effective date and on or before its deletion date (the last active date). Effective date equal to deletion date means it never applied.
- MUE: units of service for a code on one date (indicators 2 and 3) or one claim line (indicator 1) above the MUE value exceed the edit; units equal to the value do not.

Evidence id formats: "ncci:practitioner:2026Q4"; "ptp:v323r0:<column1>:<column2>:<effectiveYYYYMMDD>"; "ptp-absent:v323r0:<codeA>:<codeB>" (codes in ascending order); "mue:2026Q4:<code>"; "coverage:2026Q4:<code>"; "bench:<year>:<specialty>:<codeFamily>"; "profile:<year>:<specialty>:<hex>". Cite only ids you are confident exist.`;

/** System prompt for each condition. Only the evidence instruction differs. */
export function buildSystemPrompt(condition: EvalCondition): string {
  const evidence = condition === "grounded"
    ? `Evidence: the user message includes evidence items retrieved deterministically from the pinned CMS Medicare NCCI practitioner files (version v323r0, effective 2026-10-01 through 2026-12-31) and, for provider questions, an aggregate specialty peer benchmark. Decide only from those items and the case facts. If they do not settle the question, abstain.`
    : `Evidence: no evidence items are provided. Use what you know about Medicare NCCI practitioner edits (version v323r0, effective 2026-10-01 through 2026-12-31). If you cannot settle the question, abstain.`;
  return `${SHARED_RULES}\n\n${evidence}`;
}

/** Deterministic user prompt. Case kind and expected answer are never included. */
export function buildUserPrompt(input: {
  question: string;
  facts: CaseFacts;
  condition: EvalCondition;
  evidence: readonly EvidenceItem[];
}): string {
  const lines = [
    `Case: ${input.question}`,
    "",
    `Structured facts: ${JSON.stringify(input.facts)}`,
  ];
  if (input.condition === "grounded") {
    lines.push(
      "",
      "Evidence items:",
      ...input.evidence.map((item) => JSON.stringify(item)),
    );
  }
  return lines.join("\n");
}

export function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Set when the provider answered but the reply must fail closed (e.g. truncated). */
  error?: string | null;
  /** Model id reported by the provider for this response, when available. */
  returnedModelId?: string | null;
  finishReason?: string | null;
  rateLimitRetries?: number;
}

export type GenerateFn = (
  system: string,
  prompt: string,
) => Promise<GenerateResult>;

export type ParsedReply =
  | { ok: true; reply: AgentReply }
  | { ok: false; reason: string };

/**
 * Parse a raw model reply. Accepts a bare JSON object or one fenced ```json
 * block; anything else, extra keys, out-of-range values, or abstain routed
 * "auto" is malformed. Fail closed: callers treat malformed as human review.
 */
export function parseAgentReply(raw: string | null): ParsedReply {
  if (raw === null) return { ok: false, reason: "no_reply" };
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenced) text = fenced[1].trim();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not_json" };
  }
  const parsed = agentReplySchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `schema: ${parsed.error.issues[0]?.path.join(".") ?? "?"} ${
        parsed.error.issues[0]?.message ?? ""
      }`.trim(),
    };
  }
  if (parsed.data.decision === "abstain" && parsed.data.route === "auto") {
    return { ok: false, reason: "contract: abstain must route human_review" };
  }
  return { ok: true, reply: parsed.data };
}

export interface AgentCallResult {
  system: string;
  prompt: string;
  promptSha256: string;
  rawText: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  returnedModelId: string | null;
  finishReason: string | null;
  rateLimitRetries: number;
}

/** Call the model once for a case. Provider errors are recorded, not thrown. */
export async function callCodingJudgmentAgent(input: {
  question: string;
  facts: CaseFacts;
  condition: EvalCondition;
  evidence: readonly EvidenceItem[];
  generate: GenerateFn;
}): Promise<AgentCallResult> {
  const system = buildSystemPrompt(input.condition);
  const prompt = buildUserPrompt(input);
  const promptSha256 = sha256Text(`${system}\n\n${prompt}`);
  const started = Date.now();
  try {
    const result = await input.generate(system, prompt);
    return {
      system,
      prompt,
      promptSha256,
      rawText: result.text,
      error: result.error ?? null,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: Date.now() - started,
      returnedModelId: result.returnedModelId ?? null,
      finishReason: result.finishReason ?? null,
      rateLimitRetries: result.rateLimitRetries ?? 0,
    };
  } catch (error) {
    return {
      system,
      prompt,
      promptSha256,
      rawText: null,
      error: error instanceof Error ? error.message.slice(0, 300) : "error",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - started,
      returnedModelId: null,
      finishReason: null,
      rateLimitRetries: 0,
    };
  }
}
