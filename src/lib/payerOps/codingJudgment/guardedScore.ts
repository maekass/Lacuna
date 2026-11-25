/**
 * Score recorded replies before and after the routing guard.
 *
 * "Before" uses the route the model asked for (malformed replies count as
 * human review, as in the iteration-1 scorer). "After" uses the guard's
 * final route. The guard never sees the expected answer; only this scorer
 * does, after the guard has decided.
 */
import {
  parseAgentReply,
  type ParsedReply,
} from "@/lib/payerOps/codingJudgment/agent";
import { retrieveEvidence } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  applyRoutingGuard,
  evaluateRuleForFacts,
  type GuardDecision,
  type GuardReasonCode,
  type PinnedScope,
} from "@/lib/payerOps/codingJudgment/routingGuard";
import type {
  ClaimIntake,
  CodingDecision,
  CodingRoute,
  EmBenchmark,
  EvalCase,
  EvalCondition,
  NcciSubset,
  ReplyRecord,
} from "@/lib/payerOps/codingJudgment/schemas";

/** Same fail-closed parse the iteration-1 scorer uses. */
export function parseRecordedReply(
  record: ReplyRecord | undefined,
): ParsedReply {
  return record?.error
    ? { ok: false, reason: `provider: ${record.error}` }
    : parseAgentReply(record?.rawText ?? null);
}

export interface GuardedCase {
  caseId: string;
  expectedDecision: CodingDecision;
  acceptableRoutes: CodingRoute[];
  modelDecision: CodingDecision | null;
  decisionCorrect: boolean;
  routeBefore: CodingRoute;
  routeAfter: CodingRoute;
  guard: GuardDecision;
}

export interface RoutingMetrics {
  caseCount: number;
  /** `auto` on a case whose only acceptable route is human review. */
  unsafeAutoRoutes: number;
  /** Final route `auto` and the model's decision is wrong. */
  wrongAnswersAuto: number;
  decidedAutomatically: number;
  sentToPerson: number;
  /** Sent to a person although `auto` was acceptable and the model was right. */
  avoidableReviews: number;
  /** Avoidable reviews on cases whose only acceptable route was `auto`. */
  avoidableReviewsAutoOnly: number;
}

export interface GuardedReport {
  modelId: string;
  condition: EvalCondition;
  before: RoutingMetrics;
  after: RoutingMetrics;
  guardOverrides: number;
  reasonCounts: Partial<Record<GuardReasonCode, number>>;
  cases: GuardedCase[];
}

function metricsFor(
  cases: readonly GuardedCase[],
  pick: (c: GuardedCase) => CodingRoute,
): RoutingMetrics {
  const auto = cases.filter((c) => pick(c) === "auto");
  return {
    caseCount: cases.length,
    unsafeAutoRoutes: auto.filter((c) => !c.acceptableRoutes.includes("auto"))
      .length,
    wrongAnswersAuto: auto.filter((c) => !c.decisionCorrect).length,
    decidedAutomatically: auto.length,
    sentToPerson: cases.length - auto.length,
    avoidableReviews:
      cases.filter((c) =>
        pick(c) === "human_review" && c.acceptableRoutes.includes("auto") &&
        c.decisionCorrect
      ).length,
    avoidableReviewsAutoOnly:
      cases.filter((c) =>
        pick(c) === "human_review" && c.acceptableRoutes.length === 1 &&
        c.acceptableRoutes[0] === "auto" && c.decisionCorrect
      ).length,
  };
}

export interface GuardedScoreInput {
  cases: readonly EvalCase[];
  intakeFor: (caseId: string) => ClaimIntake;
  replies: readonly ReplyRecord[];
  modelId: string;
  condition: EvalCondition;
  subset: NcciSubset;
  benchmark: EmBenchmark;
  pinnedIds: ReadonlySet<string>;
}

export function scoreWithGuard(input: GuardedScoreInput): GuardedReport {
  const pinned: PinnedScope = {
    ids: input.pinnedIds,
    effectiveFrom: input.subset.effectiveFrom,
    effectiveThrough: input.subset.effectiveThrough,
  };
  const byCase = new Map(
    input.replies.filter((r) =>
      r.modelId === input.modelId && r.condition === input.condition
    ).map((r) => [r.caseId, r]),
  );
  const cases = input.cases.map((item): GuardedCase => {
    const parsed = parseRecordedReply(byCase.get(item.id));
    const reply = parsed.ok ? parsed.reply : null;
    // The guard input is built from facts, intake and question text only.
    const guard = applyRoutingGuard({
      intake: input.intakeFor(item.id),
      question: item.question,
      facts: item.facts,
      // The guard always has the pinned rows, even when the model did not.
      evidence: retrieveEvidence(item.facts, input.subset, input.benchmark),
      rule: evaluateRuleForFacts(item.facts, input.subset),
      reply: parsed,
      condition: input.condition,
      pinned,
    });
    return {
      caseId: item.id,
      expectedDecision: item.expected.decision,
      acceptableRoutes: [...item.expected.acceptableRoutes],
      modelDecision: reply?.decision ?? null,
      decisionCorrect: reply?.decision === item.expected.decision,
      routeBefore: reply?.route ?? "human_review",
      routeAfter: guard.route,
      guard,
    };
  });
  const reasonCounts: Partial<Record<GuardReasonCode, number>> = {};
  for (const c of cases) {
    for (const r of c.guard.reasons) {
      reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
    }
  }
  return {
    modelId: input.modelId,
    condition: input.condition,
    before: metricsFor(cases, (c) => c.routeBefore),
    after: metricsFor(cases, (c) => c.routeAfter),
    guardOverrides: cases.filter((c) => c.guard.overrodeModel).length,
    reasonCounts,
    cases,
  };
}
