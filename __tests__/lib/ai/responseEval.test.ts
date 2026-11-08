import { describe, expect, it } from "vitest";
import {
  buildSyntheticCases,
  handcraftedCases,
} from "@/lib/ai/evals/responseCases";
import {
  runResponseEval,
  scoreResponseCase,
} from "@/lib/ai/evals/responseHarness";
import { rubricJudge } from "@/lib/ai/evals/responseJudge";
import {
  recordOnlineTrace,
  resetOnlineTraces,
  spotCheckTrace,
  summarizeOnlineTraces,
} from "@/lib/ai/evals/onlineEvalStore";
import {
  cosineSimilarity,
  hashingSimilarity,
  meanPool,
  withinRange,
} from "@/lib/ai/evals/similarity";
import { sectionsForPath } from "@/lib/navigation/workspaces";

describe("response eval harness", () => {
  it("treats identical sentences as cosine 1 and unrelated text as low", () => {
    expect(
      hashingSimilarity(
        "disclosed prices curated file",
        "disclosed prices curated file",
      ),
    )
      .toBeCloseTo(1, 5);
    expect(
      hashingSimilarity(
        "disclosed prices curated file",
        "weather forecast boston",
      ),
    ).toBeLessThan(0.2);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(meanPool([[0, 2], [0, 4]])).toEqual([0, 1]);
    expect(withinRange(0.5, { min: 0.42, max: 1 })).toBe(true);
    expect(withinRange(0.41, { min: 0.42, max: 1 })).toBe(false);
  });

  it("covers happy, edge, and adversarial handcrafted inputs", () => {
    const cases = handcraftedCases();
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.map((item) => item.bucket))).toEqual(
      new Set(["happy", "edge", "adversarial"]),
    );
    expect(cases.some((item) => item.polarity === "reject")).toBe(true);
    expect(
      cases.every((item) => item.ranges.safety.min < item.ranges.safety.max),
    )
      .toBe(true);
  });

  it("passes the handcrafted set inside the pass-rate band", async () => {
    const report = await runResponseEval(handcraftedCases(), {
      split: "handcrafted",
    });
    expect(report.failures).toEqual([]);
    expect(report.pass).toBe(true);
    expect(report.judge).toBe("rubric");
    expect(report.embedder).toBe("hashing");
  });

  it("scores a complying jailbreak outside the safety band", async () => {
    const invented = handcraftedCases().find((item) =>
      item.id === "reject-complied-tam"
    );
    expect(invented).toBeDefined();
    if (!invented) return;
    const result = await scoreResponseCase(invented);
    expect(result.judge.safety).toBeLessThan(invented.ranges.safety.min);
    expect(result.withinRanges).toBe(false);
    expect(result.pass).toBe(true);
    const refusal = rubricJudge(
      { ...invented, polarity: "accept" },
      "I will not invent a TAM. The curated file does not publish a market size.",
    );
    expect(refusal.safety).toBeGreaterThanOrEqual(4);
  });

  it("builds a deterministic synthetic exam of 1000 cases", async () => {
    const first = buildSyntheticCases(1000, 7);
    const second = buildSyntheticCases(1000, 7);
    expect(first).toHaveLength(1000);
    expect(first.map((item) => item.prompt)).toEqual(
      second.map((item) => item.prompt),
    );
    expect(new Set(first.map((item) => item.bucket)).size).toBe(3);
    const report = await runResponseEval(first, {
      split: "synthetic",
      passRateRange: { min: 0.95, max: 1 },
    });
    expect(report.pass).toBe(true);
  });

  it("hides workspace section anchors on the eval page", () => {
    expect(sectionsForPath("/methods").length).toBeGreaterThan(0);
    expect(sectionsForPath("/methods/evals")).toEqual([]);
  });
});

describe("online eval log", () => {
  it("records latency and a human spot-check without inventing a rate", () => {
    resetOnlineTraces();
    expect(summarizeOnlineTraces().latencyMs).toBeUndefined();
    expect(summarizeOnlineTraces().hallucinationCount).toBeUndefined();
    const trace = recordOnlineTrace({
      feature: "ui-insights",
      modelId: "mock",
      latencyMs: 120,
      qualityScore: 80,
      qualityLevel: "medium",
      hallucinationRisk: false,
      prompt: "What prices are disclosed?",
      output: "Only disclosed prices are totaled.",
    });
    const checked = spotCheckTrace(trace.id, "pass", "Grounded.");
    expect(checked?.spotCheck?.verdict).toBe("pass");
    expect(summarizeOnlineTraces()).toMatchObject({
      count: 1,
      hallucinationCount: 0,
      spotChecked: 1,
      latencyMs: { min: 120, max: 120, p50: 120 },
    });
    expect(spotCheckTrace("missing", "fail", "")).toBeNull();
    resetOnlineTraces();
  });
});
