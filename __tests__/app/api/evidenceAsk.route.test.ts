import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryRateLimitBuckets } from "@/lib/api/rateLimit";
import { CMS_PASSAGE_IDS } from "@/lib/ai/rag/corpus";
import { setEvidenceGeneratorForTests } from "@/lib/ai/rag/answer";

const ENV_KEYS = [
  "VERCEL_ENV",
  "LACUNA_REVIEW_UI_PUBLIC",
  "LACUNA_REVIEW_API_KEY",
  "CRON_SECRET",
] as const;

describe("POST /api/research/evidence/ask", () => {
  const previous = new Map<string, string | undefined>();

  beforeEach(() => {
    resetInMemoryRateLimitBuckets();
    setEvidenceGeneratorForTests(undefined);
    for (const key of ENV_KEYS) previous.set(key, process.env[key]);
  });

  afterEach(() => {
    setEvidenceGeneratorForTests(undefined);
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function post(body: string, headers?: HeadersInit) {
    return import("@/app/api/research/evidence/ask/route").then(({ POST }) =>
      POST(new Request("http://localhost/api/research/evidence/ask", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body,
      }))
    );
  }

  it("rejects malformed and oversized bodies", async () => {
    const malformed = await post("{");
    expect(malformed.status).toBe(400);

    const oversized = await post(JSON.stringify({
      question: "x".repeat(9_000),
      asOfDate: "2026-10-24",
    }));
    expect(oversized.status).toBe(413);
  });

  it("rejects unauthorized production requests", async () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.LACUNA_REVIEW_UI_PUBLIC;
    delete process.env.LACUNA_REVIEW_API_KEY;
    delete process.env.CRON_SECRET;
    const response = await post(JSON.stringify({
      question: "What is the conversion factor?",
      asOfDate: "2026-10-24",
    }));
    expect(response.status).toBe(401);
  });

  it("rate limits repeated requests", async () => {
    setEvidenceGeneratorForTests(async () => ({
      modelId: "mock",
      estimatedCostUsd: 0,
      draft: {
        disposition: "abstain",
        answer: "",
        claims: [],
        limitations: [],
        conflicts: [],
      },
    }));
    const payload = JSON.stringify({
      question: "zeta-gate-701",
      asOfDate: "2026-10-24",
      lane: "publication",
    });
    let limited = 0;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const response = await post(payload);
      if (response.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
  });

  it("returns a checked research-draft answer", async () => {
    setEvidenceGeneratorForTests(async () => ({
      modelId: "mock",
      estimatedCostUsd: 0,
      draft: {
        disposition: "qualified_answer",
        answer:
          "The cited CMS fact sheet states a CY 2026 qualifying APM conversion factor of $33.57.",
        claims: [{
          id: "cf",
          text: "The CY 2026 qualifying APM conversion factor is $33.57.",
          passageIds: [CMS_PASSAGE_IDS.cy2026QualifyingCf],
          record: {
            metric: "pfs_conversion_factor_qualifying_apm",
            value: 33.57,
            comparator: "eq",
            unit: "conversion_factor_usd",
            dataYear: 2026,
            payer: "Medicare",
            geographyCode: "US",
          },
        }],
        limitations: [],
        conflicts: [],
      },
    }));
    const response = await post(JSON.stringify({
      question: "What is the CY 2026 qualifying APM conversion factor?",
      asOfDate: "2026-10-24",
      lane: "research_draft",
      payer: "Medicare",
      geographyCode: "US",
      dataYear: 2026,
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.disposition).toBe("qualified_answer");
    expect(body.representedAsApprovedClaim).toBe(false);
    expect(body.requestId).toEqual(expect.any(String));
    expect(body.retrievalConfigHash).toEqual(expect.any(String));
  });
});
