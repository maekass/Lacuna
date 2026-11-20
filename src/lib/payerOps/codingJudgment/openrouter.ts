/**
 * Zero-spend OpenRouter client for the Coding Judgment Check recorded run.
 *
 * Used only because the Vercel AI Gateway account returned a billing block
 * when the run was recorded; the gateway path in src/lib/ai/inference.ts
 * stays the default. Contract:
 * - only pinned `:free` model ids are accepted; no `models` fallback list is
 *   sent, and a reply served by a different model is recorded as an error;
 * - temperature and max tokens are fixed by the caller;
 * - HTTP 429 / 5xx are retried with exponential backoff (honoring
 *   Retry-After) up to a fixed budget; content is never retried;
 * - truncation (finish_reason "length"), empty content, and non-zero reported
 *   cost are recorded as errors so the scorer fails them closed.
 */
import type {
  GenerateFn,
  GenerateResult,
} from "@/lib/payerOps/codingJudgment/agent";

export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterFreeOptions {
  model: string;
  apiKey: string;
  fetchImpl: typeof fetch;
  temperature: number;
  maxTokens: number;
  /** Retries for 429 / 5xx only. */
  maxRateLimitRetries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export function assertFreeModelId(model: string): void {
  if (!/^[a-z0-9._-]+\/[a-z0-9._-]+:free$/i.test(model)) {
    throw new Error(`Refusing non-free OpenRouter model id: ${model}`);
  }
}

function stripFree(model: string): string {
  return model.replace(/:free$/, "");
}

interface ChatChoice {
  message?: { content?: unknown };
  finish_reason?: unknown;
}

interface ChatBody {
  model?: unknown;
  choices?: ChatChoice[];
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    cost?: unknown;
  };
  error?: { message?: unknown; code?: unknown };
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Build a GenerateFn bound to one pinned free model. */
export function createOpenRouterFreeGenerate(
  options: OpenRouterFreeOptions,
): GenerateFn {
  assertFreeModelId(options.model);
  const maxRetries = options.maxRateLimitRetries ?? 5;
  const baseDelay = options.baseDelayMs ?? 4000;
  const sleep = options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  return async (system, prompt): Promise<GenerateResult> => {
    const body = JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    let retries = 0;
    for (;;) {
      const response = await options.fetchImpl(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json",
          "x-title": "Lacuna coding judgment check",
        },
        body,
      });
      if (
        (response.status === 429 || response.status >= 500) &&
        retries < maxRetries
      ) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelay * 2 ** retries;
        retries++;
        await sleep(Math.min(wait, 120_000));
        continue;
      }
      const text = await response.text();
      let parsed: ChatBody;
      try {
        parsed = JSON.parse(text) as ChatBody;
      } catch {
        throw new Error(`OpenRouter HTTP ${response.status}: non-JSON body`);
      }
      if (!response.ok || parsed.error) {
        const message = typeof parsed.error?.message === "string"
          ? parsed.error.message
          : "error";
        throw new Error(
          `OpenRouter HTTP ${response.status}: ${message.slice(0, 200)}`,
        );
      }
      const choice = parsed.choices?.[0];
      const content = typeof choice?.message?.content === "string"
        ? choice.message.content
        : "";
      const finishReason = typeof choice?.finish_reason === "string"
        ? choice.finish_reason
        : null;
      const returnedModelId = typeof parsed.model === "string"
        ? parsed.model
        : null;
      const costUsd = num(parsed.usage?.cost);
      let error: string | null = null;
      if (returnedModelId === null) error = "missing_returned_model";
      else if (stripFree(returnedModelId) !== stripFree(options.model)) {
        error = `model_mismatch: ${returnedModelId}`;
      } else if (finishReason === "length") error = "truncated";
      else if (content.trim() === "") error = "empty_content";
      else if (costUsd > 0) error = `nonzero_cost: ${costUsd}`;
      return {
        text: content,
        inputTokens: num(parsed.usage?.prompt_tokens),
        outputTokens: num(parsed.usage?.completion_tokens),
        error,
        returnedModelId,
        finishReason,
        rateLimitRetries: retries,
      };
    }
  };
}
