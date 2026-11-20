import { describe, expect, it } from "vitest";
import {
  assertFreeModelId,
  createOpenRouterFreeGenerate,
} from "@/lib/payerOps/codingJudgment/openrouter";

const MODEL = "vendor/model-x:free";

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const ok = (over: Record<string, unknown> = {}) => ({
  model: MODEL,
  choices: [{ message: { content: '{"a":1}' }, finish_reason: "stop" }],
  usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0 },
  ...over,
});

function fakeFetch(responses: Response[]) {
  const bodies: unknown[] = [];
  const impl = (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    return Promise.resolve(next);
  };
  return { impl: impl as typeof fetch, bodies };
}

const options = (fetchImpl: typeof fetch) => ({
  model: MODEL,
  apiKey: "placeholder",
  fetchImpl,
  temperature: 0,
  maxTokens: 100,
  sleep: () => Promise.resolve(),
});

describe("OpenRouter free client", () => {
  it("refuses paid model ids", () => {
    expect(() => assertFreeModelId("vendor/model-x")).toThrow(/non-free/);
    expect(() => assertFreeModelId(MODEL)).not.toThrow();
  });

  it("sends one pinned model with no fallback list", async () => {
    const { impl, bodies } = fakeFetch([jsonResponse(200, ok())]);
    const result = await createOpenRouterFreeGenerate(options(impl))("s", "p");
    expect(result).toMatchObject({
      text: '{"a":1}',
      error: null,
      returnedModelId: MODEL,
    });
    expect(bodies[0]).toMatchObject({
      model: MODEL,
      temperature: 0,
      max_tokens: 100,
    });
    expect(bodies[0]).not.toHaveProperty("models");
  });

  it("backs off on 429 and records the retry count", async () => {
    const { impl } = fakeFetch([
      jsonResponse(429, { error: { message: "rate" } }, { "retry-after": "1" }),
      jsonResponse(200, ok()),
    ]);
    const result = await createOpenRouterFreeGenerate(options(impl))("s", "p");
    expect(result.rateLimitRetries).toBe(1);
    expect(result.error).toBeNull();
  });

  it("records truncation, model substitution, and non-zero cost as errors", async () => {
    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [
        {
          choices: [{ message: { content: '{"a"' }, finish_reason: "length" }],
        },
        /truncated/,
      ],
      [{ model: "vendor/other:free" }, /model_mismatch/],
      [
        { usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.01 } },
        /nonzero_cost/,
      ],
    ];
    for (const [over, pattern] of cases) {
      const { impl } = fakeFetch([jsonResponse(200, ok(over))]);
      const result = await createOpenRouterFreeGenerate(options(impl))(
        "s",
        "p",
      );
      expect(result.error).toMatch(pattern);
    }
  });

  it("throws on non-retryable HTTP errors", async () => {
    const { impl } = fakeFetch([
      jsonResponse(402, { error: { message: "pay" } }),
    ]);
    await expect(createOpenRouterFreeGenerate(options(impl))("s", "p")).rejects
      .toThrow(/402/);
  });
});
