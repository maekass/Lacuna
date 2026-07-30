/**
 * Lacuna server-side inference — Vercel AI Gateway first, direct OpenAI fallback.
 * Structured outputs via generateObject + Zod; retries, timeouts, and accounting.
 * @see docs/INFERENCE.md
 */

import process from "node:process";
import * as Sentry from "@sentry/nextjs";
import { APICallError } from "@ai-sdk/provider";
import {
  generateObject,
  generateText,
  type LanguageModel,
  TypeValidationError,
} from "ai";
import { openai } from "@ai-sdk/openai";
import type { z } from "zod";
import { getModelPricing, type ModelPricing } from "@/lib/ai/modelCatalog";

/** Gateway slug for optional UI insight narratives. */
export const INSIGHTS_GATEWAY_MODEL = "anthropic/claude-sonnet-4" as const;
export const INSIGHTS_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for space WH gap analyst (Research pipeline Q&A). */
export const SPACE_WH_GAP_GATEWAY_MODEL = "xai/grok-4.3" as const;
export const SPACE_WH_GAP_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for patient empowerment gap analyst. */
export const EMPOWERMENT_GAP_GATEWAY_MODEL = "xai/grok-4.3" as const;
export const EMPOWERMENT_GAP_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for domestic study discovery (Research catalog expansion). */
export const STUDY_DISCOVERY_GATEWAY_MODEL = "xai/grok-4.5" as const;
export const STUDY_DISCOVERY_OPENAI_MODEL = "gpt-4o-mini" as const;

/** Gateway slug for SEC 8-K women's-health classification. */
export const CLASSIFICATION_GATEWAY_MODEL = "openai/gpt-5.4-mini" as const;
export const CLASSIFICATION_OPENAI_MODEL = "gpt-4o-mini" as const;

export const DEFAULT_INFERENCE_TIMEOUT_MS = 45_000;
export const DEFAULT_INFERENCE_MAX_RETRIES = 3;
export const DEFAULT_INFERENCE_RETRY_BASE_MS = 500;

export interface ResolvedInferenceModel {
  model: LanguageModel | string;
  modelId: string;
  viaGateway: boolean;
}

export interface LlmUsageAccounting {
  feature: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  attempts: number;
}

export interface GenerateInferenceBaseParams {
  resolved: ResolvedInferenceModel;
  system: string;
  prompt: string;
  feature: string;
  maxOutputTokens?: number;
  temperature?: number;
  gatewayTags?: string[];
  timeoutMs?: number;
  maxRetries?: number;
  abortSignal?: AbortSignal;
}

export type GenerateInferenceTextParams = GenerateInferenceBaseParams;

export interface GenerateInferenceObjectParams<T extends z.ZodTypeAny>
  extends GenerateInferenceBaseParams {
  schema: T;
  schemaName?: string;
  schemaDescription?: string;
}

export interface InferenceCallResult<T> {
  data: T;
  accounting: LlmUsageAccounting;
}

let lastLlmAccounting: LlmUsageAccounting | null = null;

/** Last completed inference accounting snapshot (for dev headers). */
export function getLastLlmAccounting(): LlmUsageAccounting | null {
  return lastLlmAccounting;
}

export function resetLlmAccounting(): void {
  lastLlmAccounting = null;
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

/** Compose per-call timeout AbortSignal (optionally chained with caller signal). */
export function createInferenceAbortSignal(
  timeoutMs: number,
  parent?: AbortSignal,
): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (parent) {
    if (parent.aborted) controller.abort();
    else {
      parent.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }
  controller.signal.addEventListener(
    "abort",
    () => clearTimeout(timer),
    { once: true },
  );
  return controller.signal;
}

/** Whether an inference error should be retried (429 / 5xx / schema validation). */
export function isRetryableInferenceError(error: unknown): boolean {
  if (TypeValidationError.isInstance(error)) return true;
  if (APICallError.isInstance(error)) {
    if (error.isRetryable) return true;
    const code = error.statusCode;
    return code === 429 || (code !== undefined && code >= 500 && code < 600);
  }
  if (error instanceof Error && error.name === "AbortError") return false;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, baseMs: number): number {
  const exp = baseMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseMs);
  return exp + jitter;
}

/** Applied when a model is absent from the synced catalog. */
export const FALLBACK_MODEL_PRICING: ModelPricing = {
  inputPerMillionTokens: 0.5,
  outputPerMillionTokens: 1.5,
};

/**
 * Rough USD estimate — illustrative only, not billing truth. Prices come from
 * the gateway snapshot refreshed by `npm run ai:models:sync`, so they track
 * provider changes instead of drifting.
 */
export function estimateLlmCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  if (modelId.toLowerCase() === "mock") return 0;
  const pricing = getModelPricing(modelId) ?? FALLBACK_MODEL_PRICING;
  return (inputTokens / 1e6) * pricing.inputPerMillionTokens +
    (outputTokens / 1e6) * pricing.outputPerMillionTokens;
}

function recordLlmAccounting(accounting: LlmUsageAccounting): void {
  lastLlmAccounting = accounting;
  Sentry.addBreadcrumb({
    category: "llm",
    message: `${accounting.feature} ${accounting.modelId}`,
    data: {
      inputTokens: accounting.inputTokens,
      outputTokens: accounting.outputTokens,
      estimatedCostUsd: accounting.estimatedCostUsd,
      latencyMs: accounting.latencyMs,
      attempts: accounting.attempts,
    },
    level: "info",
  });
}

/** Dev-only `x-lacuna-llm-cost` header value. */
export function formatLlmCostHeader(accounting: LlmUsageAccounting): string {
  return [
    `input=${accounting.inputTokens}`,
    `output=${accounting.outputTokens}`,
    `usd=${accounting.estimatedCostUsd.toFixed(6)}`,
    `model=${accounting.modelId}`,
    `feature=${accounting.feature}`,
    `latencyMs=${accounting.latencyMs}`,
    `attempts=${accounting.attempts}`,
  ].join(";");
}

async function withInferenceRetry<T>(
  params: GenerateInferenceBaseParams,
  run: (attempt: number, signal: AbortSignal) => Promise<{
    data: T;
    inputTokens: number;
    outputTokens: number;
  }>,
): Promise<InferenceCallResult<T>> {
  const maxRetries = params.maxRetries ?? DEFAULT_INFERENCE_MAX_RETRIES;
  const timeoutMs = params.timeoutMs ?? DEFAULT_INFERENCE_TIMEOUT_MS;
  const baseMs = DEFAULT_INFERENCE_RETRY_BASE_MS;
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const signal = createInferenceAbortSignal(timeoutMs, params.abortSignal);
    try {
      const { data, inputTokens, outputTokens } = await run(attempt, signal);
      const accounting: LlmUsageAccounting = {
        feature: params.feature,
        modelId: params.resolved.modelId,
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateLlmCostUsd(
          params.resolved.modelId,
          inputTokens,
          outputTokens,
        ),
        latencyMs: Date.now() - started,
        attempts: attempt + 1,
      };
      recordLlmAccounting(accounting);
      return { data, accounting };
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries || !isRetryableInferenceError(error)) {
        throw error;
      }
      await sleep(retryDelayMs(attempt, baseMs));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Inference failed after retries");
}

function providerOptions(
  resolved: ResolvedInferenceModel,
  gatewayTags?: string[],
): { gateway: { tags: string[] } } | undefined {
  if (!resolved.viaGateway || !gatewayTags?.length) return undefined;
  return { gateway: { tags: gatewayTags } };
}

function readUsage(
  usage: {
    inputTokens?: number | { total?: number };
    outputTokens?: number | { total?: number };
  } | undefined,
): { inputTokens: number; outputTokens: number } {
  const inTok = typeof usage?.inputTokens === "number"
    ? usage.inputTokens
    : usage?.inputTokens?.total ?? 0;
  const outTok = typeof usage?.outputTokens === "number"
    ? usage.outputTokens
    : usage?.outputTokens?.total ?? 0;
  return { inputTokens: inTok, outputTokens: outTok };
}

/** Generate plain-text completion through the unified inference layer. */
export async function generateInferenceText(
  params: GenerateInferenceTextParams,
): Promise<string> {
  const { data } = await withInferenceRetry(
    params,
    async (_attempt, signal) => {
      const { text, usage } = await generateText({
        model: params.resolved.model,
        system: params.system,
        prompt: params.prompt,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
        temperature: params.temperature ?? 0.2,
        abortSignal: signal,
        maxRetries: 0,
        providerOptions: providerOptions(params.resolved, params.gatewayTags),
      });
      const tokens = readUsage(usage);
      return { data: text.trim(), ...tokens };
    },
  );
  return data;
}

/** Generate Zod-validated structured output — retries on 429/5xx and schema failures. */
export function generateInferenceObject<T extends z.ZodTypeAny>(
  params: GenerateInferenceObjectParams<T>,
): Promise<InferenceCallResult<z.infer<T>>> {
  return withInferenceRetry(params, async (_attempt, signal) => {
    const { object, usage } = await generateObject({
      model: params.resolved.model,
      schema: params.schema,
      schemaName: params.schemaName,
      schemaDescription: params.schemaDescription,
      system: params.system,
      prompt: params.prompt,
      maxOutputTokens: params.maxOutputTokens ?? 1024,
      temperature: params.temperature ?? 0.2,
      abortSignal: signal,
      maxRetries: 0,
      providerOptions: providerOptions(params.resolved, params.gatewayTags),
    });
    const tokens = readUsage(usage);
    return { data: object as z.infer<T>, ...tokens };
  });
}
