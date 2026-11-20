/**
 * Integrity checks for recorded coding-judgment runs: replay and resume must
 * not grade or keep replies produced against different inputs, and only
 * failures that provably never reached the provider may be re-issued.
 */
import {
  buildSystemPrompt,
  buildUserPrompt,
  CODING_JUDGMENT_PROMPT_VERSION,
  sha256Text,
} from "@/lib/payerOps/codingJudgment/agent";
import { retrieveEvidence } from "@/lib/payerOps/codingJudgment/retrieval";
import type {
  EmBenchmark,
  EvalCase,
  NcciSubset,
  ReplyRecord,
  RunManifest,
} from "@/lib/payerOps/codingJudgment/schemas";

/**
 * True only for a local credential-proxy rejection of the CONNECT tunnel
 * (HTTP 407). The TLS tunnel to the provider was never opened, so no request
 * reached it. Every other transport error is ambiguous and stays a failure.
 */
export function isPreProviderTransportFailure(error: string | null): boolean {
  return error !== null &&
    error.startsWith("curl transport failed") &&
    /CONNECT tunnel failed, response 407\b/.test(error);
}

export interface CurrentInputHashes {
  evalSetSha256: string;
  ncciSubsetSha256: string;
  emBenchmarkSha256: string;
}

/** Fields of a manifest that disagree with the current inputs and prompts. */
export function manifestMismatches(
  manifest: RunManifest,
  current: CurrentInputHashes,
): string[] {
  const problems: string[] = [];
  for (const field of Object.keys(current) as (keyof CurrentInputHashes)[]) {
    if (manifest[field] !== current[field]) problems.push(field);
  }
  if (manifest.promptVersion !== CODING_JUDGMENT_PROMPT_VERSION) {
    problems.push("promptVersion");
  }
  for (const condition of ["grounded", "closed_book"] as const) {
    if (
      manifest.systemPromptSha256[condition] !==
        sha256Text(buildSystemPrompt(condition))
    ) problems.push(`systemPromptSha256.${condition}`);
  }
  return problems;
}

/** Prompt hash the current inputs would produce for a case and condition. */
export function expectedPromptSha256(
  item: EvalCase,
  condition: ReplyRecord["condition"],
  subset: NcciSubset,
  benchmark: EmBenchmark,
): string {
  const evidence = condition === "grounded"
    ? retrieveEvidence(item.facts, subset, benchmark)
    : [];
  const system = buildSystemPrompt(condition);
  const prompt = buildUserPrompt({
    question: item.question,
    facts: item.facts,
    condition,
    evidence,
  });
  return sha256Text(`${system}\n\n${prompt}`);
}

/** Replies whose recorded prompt differs from what current inputs produce. */
export function stalePromptReplies(
  replies: readonly ReplyRecord[],
  cases: readonly EvalCase[],
  subset: NcciSubset,
  benchmark: EmBenchmark,
): string[] {
  const byId = new Map(cases.map((item) => [item.id, item]));
  return replies.filter((r) => {
    const item = byId.get(r.caseId);
    return item === undefined ||
      r.promptSha256 !==
        expectedPromptSha256(item, r.condition, subset, benchmark);
  }).map((r) => `${r.modelId}|${r.condition}|${r.caseId}`);
}
