import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  callCodingJudgmentAgent,
  parseAgentReply,
} from "@/lib/payerOps/codingJudgment/agent";
import {
  pinnedIds,
  retrieveEvidence,
} from "@/lib/payerOps/codingJudgment/retrieval";
import {
  emBenchmarkSchema,
  type EvalCase,
  evalSetSchema,
  ncciSubsetSchema,
  type ReplyRecord,
} from "@/lib/payerOps/codingJudgment/schemas";
import {
  scoreCase,
  scoreCondition,
} from "@/lib/payerOps/codingJudgment/scorer";

const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const subset = ncciSubsetSchema.parse(
  read("data/coding-judgment/ncci-practitioner-2026q4.subset.json"),
);
const benchmark = emBenchmarkSchema.parse(
  read("data/coding-judgment/benchmarks/obgyn-em-office-established.2024.json"),
);
const evalSet = evalSetSchema.parse(
  read("data/coding-judgment/eval-cases.v1.json"),
);
const pinned = pinnedIds(subset, benchmark);
const byId = (id: string): EvalCase => {
  const found = evalSet.cases.find((c) => c.id === id);
  if (!found) throw new Error(id);
  return found;
};

const reply = (over: Record<string, unknown>) =>
  JSON.stringify({
    decision: "flag",
    route: "auto",
    confidence: 0.9,
    citations: [],
    rationale: "r",
    ...over,
  });

const record = (
  caseId: string,
  rawText: string | null,
  error: string | null = null,
): ReplyRecord => ({
  caseId,
  condition: "grounded",
  modelId: "m",
  returnedModelId: "m",
  finishReason: "stop",
  rateLimitRetries: 0,
  promptSha256: "0".repeat(64),
  rawText,
  error,
  inputTokens: 1,
  outputTokens: 1,
  latencyMs: 1,
  recordedAt: "2026-11-20T00:00:00.000Z",
});

describe("parseAgentReply (fail closed)", () => {
  it("accepts bare JSON and a single fenced block", () => {
    expect(parseAgentReply(reply({})).ok).toBe(true);
    expect(parseAgentReply("```json\n" + reply({}) + "\n```").ok).toBe(true);
  });

  it("rejects prose, extra keys, out-of-range confidence, and abstain+auto", () => {
    expect(parseAgentReply("Flag it.")).toEqual({
      ok: false,
      reason: "not_json",
    });
    expect(parseAgentReply(reply({ extra: 1 })).ok).toBe(false);
    expect(parseAgentReply(reply({ confidence: 1.5 })).ok).toBe(false);
    expect(parseAgentReply(reply({ decision: "abstain" })).ok).toBe(false);
    expect(parseAgentReply(null)).toEqual({ ok: false, reason: "no_reply" });
  });
});

describe("prompts and retrieval", () => {
  it("never leaks the case kind, trap flag, or expected answer", () => {
    for (const item of evalSet.cases) {
      const evidence = retrieveEvidence(item.facts, subset, benchmark);
      const prompt = buildUserPrompt({
        question: item.question,
        facts: item.facts,
        condition: "grounded",
        evidence,
      });
      expect(prompt).not.toContain(item.expected.basis);
      expect(prompt).not.toMatch(/"trap"|"kind"|expected/);
    }
  });

  it("closed-book prompts carry no evidence items", () => {
    const item = byId("cjc-001");
    const prompt = buildUserPrompt({
      question: item.question,
      facts: item.facts,
      condition: "closed_book",
      evidence: retrieveEvidence(item.facts, subset, benchmark),
    });
    expect(prompt).not.toContain("Evidence items:");
    expect(buildSystemPrompt("closed_book")).not.toBe(
      buildSystemPrompt("grounded"),
    );
  });

  it("retrieves every justifying id for answerable cases", () => {
    for (const item of evalSet.cases) {
      const ids = retrieveEvidence(item.facts, subset, benchmark).map((e) =>
        e.id
      );
      for (const id of item.expected.justifyingIds) expect(ids).toContain(id);
    }
  });

  it("records provider errors instead of throwing", async () => {
    const result = await callCodingJudgmentAgent({
      question: "q",
      facts: { codes: [], modifiers: [] },
      condition: "grounded",
      evidence: [],
      generate: () => Promise.reject(new Error("HTTP 429")),
    });
    expect(result.rawText).toBeNull();
    expect(result.error).toBe("HTTP 429");
  });
});

describe("scoreCase", () => {
  it("credits a correct, correctly cited, correctly routed answer", () => {
    const item = byId("cjc-001");
    const s = scoreCase(
      item,
      record(item.id, reply({ citations: item.expected.justifyingIds })),
      pinned,
    );
    expect(item.expected.decision).toBe("flag");
    expect(s.failures).toEqual([]);
    expect(s.citationValid).toBe(true);
  });

  it("separates invented citations from missing justifying ones", () => {
    const item = byId("cjc-001");
    const s = scoreCase(
      item,
      record(
        item.id,
        reply({ citations: ["ptp:v323r0:00000:00001:20000101"] }),
      ),
      pinned,
    );
    expect(s.failures).toContain("invented_citation");
    expect(s.failures).toContain("missing_justifying_citation");
    expect(s.citationValid).toBe(false);
  });

  it("treats errored or malformed replies as human_review with no credit", () => {
    const trap = byId("cjc-031");
    const errored = scoreCase(
      trap,
      record(trap.id, reply({}), "truncated"),
      pinned,
    );
    expect(errored.reply).toBeNull();
    expect(errored.decisionCorrect).toBe(false);
    expect(errored.routeAppropriate).toBe(true);
    expect(errored.failures).toEqual(["malformed"]);
  });

  it("counts an auto-routed flag on a provider outlier as unsafe", () => {
    const item = byId("cjc-026");
    const s = scoreCase(
      item,
      record(item.id, reply({ citations: item.expected.justifyingIds })),
      pinned,
    );
    expect(s.decisionCorrect).toBe(true);
    expect(s.failures).toEqual(["unsafe_auto_route"]);
  });
});

describe("scoreCondition", () => {
  it("computes separate rates and counts missing replies as malformed", () => {
    const flagCase = byId("cjc-001");
    const noFlag = evalSet.cases.find((c) =>
      c.expected.decision === "no_flag" && c.kind === "ptp"
    );
    if (!noFlag) throw new Error("fixture");
    const trap = byId("cjc-031");
    const cases = [flagCase, noFlag, trap];
    const report = scoreCondition(
      cases,
      [
        record(flagCase.id, reply({ decision: "no_flag" })),
        record(noFlag.id, reply({ decision: "flag" })),
      ],
      "grounded",
      pinned,
    );
    const m = report.metrics;
    expect(m.caseCount).toBe(3);
    expect(m.missedFlagRate).toBe(1);
    expect(m.falseFlagRate).toBe(1);
    expect(m.abstentionRecallOnTraps).toBe(0);
    expect(m.malformedCount).toBe(1);
    expect(m.decisionAccuracy).toBe(0);
  });

  it("rejects duplicate replies", () => {
    const item = byId("cjc-001");
    expect(() =>
      scoreCondition(
        [item],
        [record(item.id, "{}"), record(item.id, "{}")],
        "grounded",
        pinned,
      )
    ).toThrow(/Duplicate/);
  });
});
