/**
 * LLM analyst grounded in the space WH trial→transaction pipeline snapshot.
 * Uses Vercel AI Gateway / OpenAI via inference.ts — not a trained model.
 */

import {
  generateInferenceText,
  INSIGHTS_GATEWAY_MODEL,
  INSIGHTS_OPENAI_MODEL,
  isServerInferenceConfigured,
  resolveInferenceModel,
} from "@/lib/ai/inference";
import {
  buildSpaceWhGapPrompt,
  sanitizeLLMOutput,
  SPACE_WH_GAP_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { TrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";
import { pipelineSnapshotForLlm } from "@/lib/research/trialToTransactionPipeline";

export function isSpaceWhGapLlmConfigured(): boolean {
  return isServerInferenceConfigured();
}

export interface SpaceWhGapAnswer {
  answer: string;
  modelId: string | null;
  configured: boolean;
  warnings: string[];
}

const DEFAULT_QUESTION =
  "What are the largest commercial gaps between space-linked women's health research and verified companies or M&A transactions?";

/**
 * Answer a question using only the pipeline snapshot as context.
 * Returns a deterministic fallback narrative when inference is not configured.
 */
export async function answerSpaceWhGapQuestion(
  snapshot: TrialToTransactionSnapshot,
  question?: string,
): Promise<SpaceWhGapAnswer> {
  const q = question?.trim() || DEFAULT_QUESTION;
  const pipelineJson = pipelineSnapshotForLlm(snapshot);

  const resolved = resolveInferenceModel({
    gatewayModel: INSIGHTS_GATEWAY_MODEL,
    openaiModel: INSIGHTS_OPENAI_MODEL,
  });

  if (!resolved) {
    return {
      answer: buildDeterministicGapNarrative(snapshot),
      modelId: null,
      configured: false,
      warnings: ["Server inference not configured — deterministic summary only."],
    };
  }

  try {
    const raw = await generateInferenceText({
      resolved,
      system: SPACE_WH_GAP_SYSTEM_PROMPT,
      prompt: buildSpaceWhGapPrompt({ question: q, pipelineJson }),
      maxOutputTokens: 600,
      temperature: 0.2,
      gatewayTags: ["feature:space-wh-gap"],
    });
    const { clean, warnings } = sanitizeLLMOutput(raw);
    return {
      answer: clean,
      modelId: resolved.modelId,
      configured: true,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Gap analysis failed";
    return {
      answer: `${buildDeterministicGapNarrative(snapshot)} (LLM unavailable: ${message})`,
      modelId: resolved.modelId,
      configured: true,
      warnings: [message],
    };
  }
}

/** Non-LLM fallback so the panel always has a narrative. */
export function buildDeterministicGapNarrative(
  snapshot: TrialToTransactionSnapshot,
): string {
  const { summary, areaMatrix, assets } = snapshot;
  const topGaps = areaMatrix
    .filter((r) => r.commercialGapCount > 0)
    .sort((a, b) => b.commercialGapCount - a.commercialGapCount)
    .slice(0, 3)
    .map((r) => `${r.label} (${r.commercialGapCount} commercial gaps)`)
    .join("; ");

  const stuck = assets
    .filter((a) => a.isCommercialGap)
    .slice(0, 3)
    .map((a) => `${a.asset.name} (furthest: ${a.furthestStage})`)
    .join("; ");

  return (
    `This catalog has ${summary.assetCount} space-linked women's health research assets. ` +
    `${summary.commercialGapCount} have no company or verified M&A link in Lacuna (commercial gaps). ` +
    `Only ${summary.transactionCount} assets touch a verified transaction. ` +
    (topGaps
      ? `Largest area gaps: ${topGaps}. `
      : "") +
    (stuck ? `Examples stuck before company stage: ${stuck}. ` : "") +
    `Pipeline stages are descriptive evidence flags from public citations — not investment advice.`
  );
}
