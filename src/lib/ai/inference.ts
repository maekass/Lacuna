/**
 * Lacuna server-side inference — Vercel AI Gateway first, direct OpenAI fallback.
 * @see docs/INFERENCE.md
 */

import process from "node:process";
import { generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";

/** Gateway slug for optional UI insight narratives. */
export const INSIGHTS_GATEWAY_MODEL = "anthropic/claude-sonnet-4" as const;
export const INSIGHTS_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for space WH gap analyst (Research pipeline Q&A). */
export const SPACE_WH_GAP_GATEWAY_MODEL = "xai/grok-4.3" as const;
export const SPACE_WH_GAP_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for patient empowerment gap analyst. */
export const EMPOWERMENT_GAP_GATEWAY_MODEL = "xai/grok-4.3" as const;
export const EMPOWERMENT_GAP_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for SEC 8-K women's-health classification. */
export const CLASSIFICATION_GATEWAY_MODEL = "openai/gpt-5.4-mini" as const;
export const CLASSIFICATION_OPENAI_MODEL = "gpt-4o-mini" as const;

export interface ResolvedInferenceModel {
  model: LanguageModel | string;
  modelId: string;
  viaGateway: boolean;
}

/** True when Vercel AI Gateway auth (OIDC or API key) is configured. */
export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

/** True when any server-side LLM path is available (gateway preferred). */
export function isServerInferenceConfigured(): boolean {
  return hasAiGatewayAuth() || Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function resolveInferenceModel(options: {
  gatewayModel: string;
  openaiModel: string;
  override?: LanguageModel;
}): ResolvedInferenceModel | null {
  if (options.override) {
    return { model: options.override, modelId: "mock", viaGateway: false };
  }
  if (hasAiGatewayAuth()) {
    return {
      model: options.gatewayModel,
      modelId: options.gatewayModel,
      viaGateway: true,
    };
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return {
      model: openai(options.openaiModel),
      modelId: options.openaiModel,
      viaGateway: false,
    };
  }
  return null;
}

export function gatewayProviderOptions(
  tags: string[],
): Record<string, unknown> | undefined {
  if (!hasAiGatewayAuth()) return undefined;
  return {
    gateway: { tags },
  };
}

export interface GenerateInferenceTextParams {
  resolved: ResolvedInferenceModel;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  gatewayTags?: string[];
}

/** Generate plain-text completion through the unified inference layer. */
export async function generateInferenceText(
  params: GenerateInferenceTextParams,
): Promise<string> {
  const { text } = await generateText({
    model: params.resolved.model,
    system: params.system,
    prompt: params.prompt,
    maxOutputTokens: params.maxOutputTokens ?? 1024,
    temperature: params.temperature ?? 0.2,
    ...(params.resolved.viaGateway && params.gatewayTags?.length
      ? { providerOptions: { gateway: { tags: params.gatewayTags } } }
      : {}),
  });
  return text.trim();
}
