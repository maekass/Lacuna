import { describe, expect, it } from "vitest";
import { APICallError } from "@ai-sdk/provider";
import { TypeValidationError } from "ai";
import {
  estimateLlmCostUsd,
  formatLlmCostHeader,
  INSIGHTS_GATEWAY_MODEL,
  INSIGHTS_OPENAI_MODEL,
  isRetryableInferenceError,
  resolveInferenceModel,
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

  it("falls insights back to gpt-4o-mini without a gateway credential", () => {
    const previousGateway = process.env.AI_GATEWAY_API_KEY;
    const previousOidc = process.env.VERCEL_OIDC_TOKEN;
    const previousOpenAi = process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.OPENAI_API_KEY = "sk-test";
    try {
      const resolved = resolveInferenceModel({
        gatewayModel: INSIGHTS_GATEWAY_MODEL,
        openaiModel: INSIGHTS_OPENAI_MODEL,
      });
      expect(INSIGHTS_OPENAI_MODEL).toBe("gpt-4o-mini");
      expect(resolved?.viaGateway).toBe(false);
      expect(resolved?.modelId).toBe("gpt-4o-mini");
      expect(typeof resolved?.model).toBe("object");
    } finally {
      if (previousGateway === undefined) delete process.env.AI_GATEWAY_API_KEY;
      else process.env.AI_GATEWAY_API_KEY = previousGateway;
      if (previousOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
      else process.env.VERCEL_OIDC_TOKEN = previousOidc;
      if (previousOpenAi === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAi;
    }
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
