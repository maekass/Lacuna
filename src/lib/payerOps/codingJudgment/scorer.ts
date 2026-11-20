/**
 * Deterministic scorer for the Coding Judgment Check.
 *
 * Scoring conventions (also in docs/CODING_JUDGMENT_CHECK.md):
 * - Malformed replies (no reply, non-JSON, schema or contract violation) get
 *   no credit on any decision metric and are routed human_review for the
 *   routing metric (fail closed).
 * - "Answerable" cases are those whose expected decision is flag or no_flag;
 *   "traps" are those whose expected decision is abstain.
 * - A citation is valid for a case when every cited id exists in the pinned
 *   data and the cited set includes every justifying id.
 */
import { parseAgentReply } from "@/lib/payerOps/codingJudgment/agent";
import type {
  AgentReply,
  CodingRoute,
  EvalCase,
  EvalCondition,
  ReplyRecord,
} from "@/lib/payerOps/codingJudgment/schemas";

export type FailureType =
  | "malformed"
  | "wrong_decision"
  | "false_flag"
  | "missed_flag"
  | "unwarranted_abstention"
  | "missed_abstention"
  | "invented_citation"
  | "missing_justifying_citation"
  | "unsafe_auto_route"
  | "over_escalation";

export interface CaseScore {
  caseId: string;
  kind: EvalCase["kind"];
  trap: boolean;
  expectedDecision: EvalCase["expected"]["decision"];
  acceptableRoutes: CodingRoute[];
  reply: AgentReply | null;
  malformedReason: string | null;
  decisionCorrect: boolean;
  routeAppropriate: boolean;
  citationValid: boolean | null;
  inventedCitations: string[];
  failures: FailureType[];
}

export interface ConditionMetrics {
  condition: EvalCondition;
  modelId: string | null;
  caseCount: number;
  answerableCount: number;
  trapCount: number;
  decisionAccuracy: number | null;
  answerableDecisionAccuracy: number | null;
  falseFlagRate: number | null;
  missedFlagRate: number | null;
  abstentionRecallOnTraps: number | null;
  abstentionRateOnAnswerable: number | null;
  citationValidity: number | null;
  citationValidityDenominator: number;
  citedIdExistenceRate: number | null;
  inventedCitationCount: number;
  routingAppropriateness: number | null;
  unsafeAutoRouteCount: number;
  overEscalationCount: number;
  malformedCount: number;
  providerErrorCount: number;
  meanConfidenceCorrect: number | null;
  meanConfidenceIncorrect: number | null;
  counts: Record<string, { n: number; correct: number }>;
}

export interface ConditionReport {
  metrics: ConditionMetrics;
  cases: CaseScore[];
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Score one case against one recorded reply. */
export function scoreCase(
  item: EvalCase,
  record: ReplyRecord | undefined,
  pinned: ReadonlySet<string>,
): CaseScore {
  // Fail closed: provider errors (incl. truncation, model mismatch) are malformed.
  const parsed = record?.error
    ? { ok: false as const, reason: `provider: ${record.error}` }
    : parseAgentReply(record?.rawText ?? null);
  const reply = parsed.ok ? parsed.reply : null;
  const expected = item.expected;
  const failures: FailureType[] = [];
  if (!reply) failures.push("malformed");

  const decision = reply?.decision ?? null;
  const decisionCorrect = decision === expected.decision;
  if (reply && !decisionCorrect) {
    failures.push("wrong_decision");
    if (expected.decision === "no_flag" && decision === "flag") {
      failures.push("false_flag");
    }
    if (expected.decision === "flag" && decision === "no_flag") {
      failures.push("missed_flag");
    }
    if (expected.decision !== "abstain" && decision === "abstain") {
      failures.push("unwarranted_abstention");
    }
    if (expected.decision === "abstain" && decision !== "abstain") {
      failures.push("missed_abstention");
    }
  }

  // Fail closed: a malformed reply is treated as routed to human review.
  const route: CodingRoute = reply?.route ?? "human_review";
  const routeAppropriate = expected.acceptableRoutes.includes(route);
  if (!routeAppropriate) {
    failures.push(route === "auto" ? "unsafe_auto_route" : "over_escalation");
  }

  const cited = reply?.citations ?? [];
  const inventedCitations = cited.filter((id) => !pinned.has(id));
  if (inventedCitations.length > 0) failures.push("invented_citation");

  let citationValid: boolean | null = null;
  if (reply && expected.decision !== "abstain" && decision !== "abstain") {
    const hasJustifying = expected.justifyingIds.every((id) =>
      cited.includes(id)
    );
    citationValid = inventedCitations.length === 0 && hasJustifying;
    if (!hasJustifying) failures.push("missing_justifying_citation");
  }

  return {
    caseId: item.id,
    kind: item.kind,
    trap: item.trap,
    expectedDecision: expected.decision,
    acceptableRoutes: expected.acceptableRoutes,
    reply,
    malformedReason: parsed.ok ? null : parsed.reason,
    decisionCorrect,
    routeAppropriate,
    citationValid,
    inventedCitations,
    failures,
  };
}

/** Score every case for one condition. Missing records count as malformed. */
export function scoreCondition(
  cases: readonly EvalCase[],
  records: readonly ReplyRecord[],
  condition: EvalCondition,
  pinned: ReadonlySet<string>,
  modelId: string | null = null,
): ConditionReport {
  const byCase = new Map<string, ReplyRecord>();
  for (const record of records) {
    if (record.condition !== condition) continue;
    if (modelId !== null && record.modelId !== modelId) continue;
    if (byCase.has(record.caseId)) {
      throw new Error(
        `Duplicate reply for ${record.caseId} (${condition}, ${record.modelId})`,
      );
    }
    if (!cases.some((item) => item.id === record.caseId)) {
      throw new Error(`Reply for unknown case ${record.caseId}`);
    }
    byCase.set(record.caseId, record);
  }
  const scored = cases.map((item) =>
    scoreCase(item, byCase.get(item.id), pinned)
  );

  const answerable = scored.filter((s) => s.expectedDecision !== "abstain");
  const traps = scored.filter((s) => s.expectedDecision === "abstain");
  const expectNoFlag = scored.filter((s) => s.expectedDecision === "no_flag");
  const expectFlag = scored.filter((s) => s.expectedDecision === "flag");
  const citationCases = scored.filter((s) => s.citationValid !== null);
  const allCited = scored.flatMap((s) => s.reply?.citations ?? []);
  const invented = scored.flatMap((s) => s.inventedCitations);

  const counts: Record<string, { n: number; correct: number }> = {};
  for (const s of scored) {
    const key = s.kind;
    counts[key] ??= { n: 0, correct: 0 };
    counts[key].n++;
    if (s.decisionCorrect) counts[key].correct++;
  }

  return {
    metrics: {
      condition,
      modelId,
      caseCount: scored.length,
      answerableCount: answerable.length,
      trapCount: traps.length,
      decisionAccuracy: ratio(
        scored.filter((s) => s.decisionCorrect).length,
        scored.length,
      ),
      answerableDecisionAccuracy: ratio(
        answerable.filter((s) => s.decisionCorrect).length,
        answerable.length,
      ),
      falseFlagRate: ratio(
        expectNoFlag.filter((s) => s.reply?.decision === "flag").length,
        expectNoFlag.length,
      ),
      missedFlagRate: ratio(
        expectFlag.filter((s) => s.reply?.decision === "no_flag").length,
        expectFlag.length,
      ),
      abstentionRecallOnTraps: ratio(
        traps.filter((s) => s.reply?.decision === "abstain").length,
        traps.length,
      ),
      abstentionRateOnAnswerable: ratio(
        answerable.filter((s) => s.reply?.decision === "abstain").length,
        answerable.length,
      ),
      citationValidity: ratio(
        citationCases.filter((s) => s.citationValid).length,
        citationCases.length,
      ),
      citationValidityDenominator: citationCases.length,
      citedIdExistenceRate: ratio(
        allCited.length - invented.length,
        allCited.length,
      ),
      inventedCitationCount: invented.length,
      routingAppropriateness: ratio(
        scored.filter((s) => s.routeAppropriate).length,
        scored.length,
      ),
      unsafeAutoRouteCount:
        scored.filter((s) => s.failures.includes("unsafe_auto_route")).length,
      overEscalationCount:
        scored.filter((s) => s.failures.includes("over_escalation")).length,
      malformedCount: scored.filter((s) => s.reply === null).length,
      providerErrorCount: cases.filter((item) => {
        const record = byCase.get(item.id);
        return record !== undefined && record.error !== null;
      }).length,
      meanConfidenceCorrect: mean(
        scored.filter((s) => s.reply && s.decisionCorrect).map((s) =>
          s.reply?.confidence ?? 0
        ),
      ),
      meanConfidenceIncorrect: mean(
        scored.filter((s) => s.reply && !s.decisionCorrect).map((s) =>
          s.reply?.confidence ?? 0
        ),
      ),
      counts,
    },
    cases: scored,
  };
}
