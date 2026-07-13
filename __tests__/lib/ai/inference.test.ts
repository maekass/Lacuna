import { describe, expect, it } from "vitest";
import { APICallError } from "@ai-sdk/provider";
import { TypeValidationError } from "ai";
import {
  estimateLlmCostUsd,
  formatLlmCostHeader,
  isRetryableInferenceError,
} from "@/lib/ai/inference";
import { runClassificationEval } from "@/lib/ai/evals/classificationEval";

describe("inference helpers", () => {
  it("retries on 429 and 5xx APICallError", () => {
    expect(
      isRetryableInferenceError(
        new APICallError({
          message: "rate limit",
          url: "https://example.com",
          requestBodyValues: {},
          statusCode: 429,
          isRetryable: true,
        }),
      ),
    ).toBe(true);
    expect(
      isRetryableInferenceError(
        new APICallError({
          message: "server",
          url: "https://example.com",
          requestBodyValues: {},
          statusCode: 503,
        }),
      ),
    ).toBe(true);
  });

  it("retries on TypeValidationError (malformed structured output)", () => {
    expect(
      isRetryableInferenceError(
        new TypeValidationError({
          value: {},
          cause: new Error("invalid"),
        }),
      ),
    ).toBe(true);
  });

  it("formats dev cost header", () => {
    const header = formatLlmCostHeader({
      feature: "sec-deal-classification",
      modelId: "mock",
      inputTokens: 100,
      outputTokens: 50,
      estimatedCostUsd: 0,
      latencyMs: 12,
      attempts: 1,
    });
    expect(header).toContain("input=100");
    expect(header).toContain("feature=sec-deal-classification");
  });

  it("estimates non-zero cost for gpt-4o-mini", () => {
    const usd = estimateLlmCostUsd("gpt-4o-mini", 1000, 500);
    expect(usd).toBeGreaterThan(0);
  });
});

describe("classification golden eval", () => {
  it("meets precision/recall thresholds with per-fixture mocks", async () => {
    const report = await runClassificationEval();
    expect(report.pass).toBe(true);
    expect(report.metrics.precision).toBe(1);
    expect(report.metrics.recall).toBe(1);
    expect(report.mismatches).toHaveLength(0);
  });
});
