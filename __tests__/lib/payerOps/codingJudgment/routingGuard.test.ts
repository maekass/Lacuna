import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type ParsedReply } from "@/lib/payerOps/codingJudgment/agent";
import { scoreWithGuard } from "@/lib/payerOps/codingJudgment/guardedScore";
import {
  loadRecordedRun,
  V1_INPUT_PATHS,
} from "@/lib/payerOps/codingJudgment/recordedRun";
import {
  pinnedIds,
  retrieveEvidence,
} from "@/lib/payerOps/codingJudgment/retrieval";
import {
  applyRoutingGuard,
  evaluateRuleForFacts,
  GUARD_REASON_CODES,
  GUARD_REASON_TEXT,
  type GuardReasonCode,
  type RoutingGuardInput,
} from "@/lib/payerOps/codingJudgment/routingGuard";
import {
  type AgentReply,
  type CaseFacts,
  emBenchmarkSchema,
  type EvalCase,
  evalSetSchema,
  ncciSubsetSchema,
} from "@/lib/payerOps/codingJudgment/schemas";

const json = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const subset = ncciSubsetSchema.parse(json(V1_INPUT_PATHS.subset));
const benchmark = emBenchmarkSchema.parse(json(V1_INPUT_PATHS.benchmark));
const v1 = evalSetSchema.parse(json(V1_INPUT_PATHS.evalSet));
const ids = pinnedIds(subset, benchmark);
const pinned = {
  ids,
  effectiveFrom: subset.effectiveFrom,
  effectiveThrough: subset.effectiveThrough,
};
const caseById = (id: string): EvalCase => {
  const found = v1.cases.find((c) => c.id === id);
  if (!found) throw new Error(id);
  return found;
};

const ok = (reply: Partial<AgentReply>): ParsedReply => ({
  ok: true,
  reply: {
    decision: "flag",
    route: "auto",
    confidence: 0.9,
    citations: [],
    rationale: "test",
    ...reply,
  },
});

/** Guard input for facts, with a reply that cites the deciding row. */
function inputFor(
  facts: CaseFacts,
  overrides: Partial<RoutingGuardInput> = {},
  reply: Partial<AgentReply> = {},
): RoutingGuardInput {
  const rule = evaluateRuleForFacts(facts, subset);
  const citations = rule.type === "not_applicable" ? [] : rule.decidingRowIds;
  const decision = rule.type === "ptp"
    ? (rule.outcome.kind === "denied_column2" ? "flag" : "no_flag")
    : rule.type === "mue" && rule.outcome.kind === "exceeds_limit"
    ? "flag"
    : "no_flag";
  return {
    intake: { payer: "medicare_ffs", requestType: "claim_edit_check" },
    question: "Should this claim line be flagged under the pinned rules?",
    facts,
    evidence: retrieveEvidence(facts, subset, benchmark),
    rule,
    reply: ok({ decision, citations, ...reply }),
    condition: "grounded",
    pinned,
    ...overrides,
  };
}

const factsOf = (id: string): CaseFacts => caseById(id).facts;

describe("applyRoutingGuard: auto-eligible outcomes", () => {
  it.each([
    ["cjc-001", "PTP denial"],
    ["cjc-013", "no PTP edit (pinned absence row)"],
    ["cjc-012", "inactive (deleted) PTP edit"],
    ["cjc-019", "MUE within limit"],
    ["cjc-018", "over an MAI 2 MUE"],
  ])("%s %s goes out automatically", (id) => {
    const decision = applyRoutingGuard(inputFor(factsOf(id)));
    expect(decision.reasons).toEqual([]);
    expect(decision.route).toBe("auto");
    expect(decision.reasonText).toMatch(/^Decided automatically/);
  });
});

/** One test per reason code: the code fires and the route is human review. */
const reasonCases: Record<GuardReasonCode, () => RoutingGuardInput> = {
  unexpected_input: () => {
    const base = inputFor(factsOf("cjc-001"));
    const broken = new Proxy(base.facts, {
      get() {
        throw new Error("boom");
      },
    });
    return { ...base, facts: broken };
  },
  intake_invalid: () =>
    inputFor(factsOf("cjc-001"), {
      intake: JSON.parse(
        '{"payer":"medicare","requestType":"claim_edit_check"}',
      ),
    }),
  malformed_reply: () =>
    inputFor(factsOf("cjc-001"), { reply: { ok: false, reason: "not_json" } }),
  closed_book_reply: () =>
    inputFor(factsOf("cjc-001"), { condition: "closed_book" }),
  payer_not_medicare_ffs: () =>
    inputFor(factsOf("cjc-001"), {
      intake: { payer: "medicaid", requestType: "claim_edit_check" },
    }),
  documentation_question: () =>
    inputFor(factsOf("cjc-001"), {
      intake: { payer: "medicare_ffs", requestType: "documentation_review" },
    }),
  intent_question: () =>
    inputFor(factsOf("cjc-001"), {
      intake: { payer: "medicare_ffs", requestType: "intent_question" },
    }),
  request_type_unknown: () =>
    inputFor(factsOf("cjc-001"), {
      intake: { payer: "medicare_ffs", requestType: "unknown" },
    }),
  question_text_screen: () =>
    inputFor(factsOf("cjc-001"), {
      question: "Does the medical record support billing both codes?",
    }),
  provider_profile: () => inputFor(factsOf("cjc-028")),
  provider_below_volume_minimum: () => inputFor(factsOf("cjc-029")),
  provider_flagged_for_review: () => inputFor(factsOf("cjc-026")),
  not_a_rule_question: () =>
    inputFor({ codes: ["99215"], modifiers: [], dateOfService: "2026-11-10" }),
  service_date_missing: () =>
    inputFor({ codes: ["57454", "57452"], modifiers: [] }),
  service_date_outside_window: () => inputFor(factsOf("cjc-033")),
  code_not_in_pinned_files: () => inputFor(factsOf("cjc-032")),
  no_pinned_rule_row: () => inputFor(factsOf("cjc-032")),
  evidence_mismatch: () => {
    const base = inputFor(factsOf("cjc-001"));
    return {
      ...base,
      evidence: base.evidence.filter((e) => e.type !== "ptp_edit"),
    };
  },
  rule_outcome_needs_review: () => inputFor(factsOf("cjc-004")),
  model_abstained: () =>
    inputFor(factsOf("cjc-001"), {}, {
      decision: "abstain",
      route: "human_review",
    }),
  model_requested_review: () =>
    inputFor(factsOf("cjc-001"), {}, { route: "human_review" }),
  model_disagrees_with_rule: () =>
    inputFor(factsOf("cjc-001"), {}, { decision: "no_flag" }),
  citation_not_pinned: () => {
    const base = inputFor(factsOf("cjc-001"));
    const rule = base.rule.type === "ptp" ? base.rule.decidingRowIds : [];
    return inputFor(factsOf("cjc-001"), {}, {
      citations: [...rule, "ptp:v323r0:99213:36415:20200101"],
    });
  },
  citation_missing_rule_row: () =>
    inputFor(factsOf("cjc-001"), {}, {
      citations: ["ncci:practitioner:2026Q4"],
    }),
};

describe("applyRoutingGuard: every reason code routes to a person", () => {
  it("covers every reason code", () => {
    expect(Object.keys(reasonCases).sort()).toEqual(
      [...GUARD_REASON_CODES].sort(),
    );
  });
  it.each([...GUARD_REASON_CODES])("%s", (code) => {
    const decision = applyRoutingGuard(reasonCases[code]());
    expect(decision.reasons).toContain(code);
    expect(decision.route).toBe("human_review");
    expect(decision.reasonText).toBe(GUARD_REASON_TEXT[decision.reasons[0]]);
    expect(decision.reasonText.split(/\.\s/).length).toBe(1);
  });
  it("never upgrades a model's human_review to auto", () => {
    for (const item of v1.cases) {
      const decision = applyRoutingGuard(
        inputFor(item.facts, {}, { route: "human_review" }),
      );
      expect(decision.route).toBe("human_review");
      expect(decision.overrodeModel).toBe(false);
    }
  });
});

describe("named regressions from iteration 1", () => {
  const run = loadRecordedRun(
    "data/coding-judgment/runs/2026-11-20-openrouter-free",
  );
  const grounded = run.manifest.modelIds.map((modelId) =>
    scoreWithGuard({
      cases: run.cases,
      intakeFor: run.intakeFor,
      replies: run.replies,
      modelId,
      condition: "grounded",
      subset: run.subset,
      benchmark: run.benchmark,
      pinnedIds: run.pinnedIds,
    })
  );
  it.each(
    [
      ["cjc-029", "provider_below_volume_minimum"],
      ["cjc-032", "code_not_in_pinned_files"],
    ] as const,
  )("%s: recorded auto-clear is overridden (%s)", (caseId, reason) => {
    for (const report of grounded) {
      const c = report.cases.find((x) => x.caseId === caseId);
      expect(c?.routeBefore).toBe("auto");
      expect(c?.routeAfter).toBe("human_review");
      expect(c?.guard.overrodeModel).toBe(true);
      expect(c?.guard.reasons).toContain(reason);
    }
  });
});

describe("the guard cannot see the answer key", () => {
  it("input type has no case id, kind, label, trap flag or tags", () => {
    const input = inputFor(factsOf("cjc-001"));
    expect(Object.keys(input).sort()).toEqual([
      "condition",
      "evidence",
      "facts",
      "intake",
      "pinned",
      "question",
      "reply",
      "rule",
    ]);
    // @ts-expect-error the guard input has no expected-answer field
    applyRoutingGuard({ ...input, expected: caseById("cjc-001").expected });
  });

  it("gives identical results when kind, labels, tags and ids are scrambled", () => {
    const run = loadRecordedRun(
      "data/coding-judgment/runs/2026-11-20-openrouter-free",
    );
    const scrambled = run.cases.map((c, i): EvalCase => ({
      ...c,
      id: c.id,
      kind: (["ptp", "mue", "profile", "trap"] as const)[i % 4],
      trap: i % 2 === 0,
      tags: ["scrambled"],
      expected: {
        decision: "abstain",
        acceptableRoutes: ["auto"],
        justifyingIds: [],
        basis: "scrambled",
      },
    }));
    for (const modelId of run.manifest.modelIds) {
      for (const condition of run.manifest.conditions) {
        const args = {
          intakeFor: run.intakeFor,
          replies: run.replies,
          modelId,
          condition,
          subset: run.subset,
          benchmark: run.benchmark,
          pinnedIds: run.pinnedIds,
        };
        const real = scoreWithGuard({ ...args, cases: run.cases });
        const fake = scoreWithGuard({ ...args, cases: scrambled });
        expect(fake.cases.map((c) => c.guard)).toEqual(
          real.cases.map((c) => c.guard),
        );
      }
    }
  });
});
