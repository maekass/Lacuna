/**
 * Deterministic routing guard for the Coding Judgment Check agent.
 *
 * The model proposes a decision and a route. This guard decides the final
 * route. It allows `auto` only when a pinned NCCI row settles the claim, the
 * service date is inside the pinned window, the rule outcome is one that can
 * be applied mechanically, and the model's decision matches the rule. Anything
 * else goes to a person.
 *
 * Contract:
 * - Inputs are claim facts, claim intake (payer, request type), the question
 *   text, retrieved evidence, the deterministic rule result, the parsed model
 *   reply, and the pinned scope. The guard never sees the case kind, the
 *   expected label, or any other part of an answer key.
 * - The guard can only lower autonomy. It never turns a model's
 *   `human_review` into `auto`.
 * - Fail closed: invalid intake, inconsistent evidence, or any thrown error
 *   routes to human review with a reason code.
 *
 * Written in iteration 2, after the iteration-1 run showed the failures it
 * targets. See docs/CODING_JUDGMENT_ITERATION_2.md.
 */
import type { ParsedReply } from "@/lib/payerOps/codingJudgment/agent";
import {
  evaluateMueUnits,
  evaluatePtpPair,
  type MueOutcome,
  ptpAbsenceId,
  type PtpOutcome,
} from "@/lib/payerOps/codingJudgment/ncci";
import type { EvidenceItem } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  type CaseFacts,
  type ClaimIntake,
  claimIntakeSchema,
  type CodingRoute,
  type EvalCondition,
  type NcciSubset,
} from "@/lib/payerOps/codingJudgment/schemas";

export const ROUTING_GUARD_VERSION = "cjc-guard-v1.0.0";

/** Result of applying the pinned NCCI rows to the claim facts. */
export type RuleResult =
  | {
    type: "ptp";
    codes: [string, string];
    dateOfService: string;
    outcome: PtpOutcome;
    /** Pinned row ids the outcome rests on; empty when none is pinned. */
    decidingRowIds: string[];
  }
  | {
    type: "mue";
    code: string;
    units: number;
    dateOfService: string;
    outcome: MueOutcome;
    decidingRowIds: string[];
  }
  | {
    type: "not_applicable";
    reason: "no_codes" | "unsupported_claim_shape" | "service_date_missing";
  };

/**
 * Apply pinned NCCI rows to claim facts. The rule type comes from the shape
 * of the facts only: two codes and no units is a PTP pair; one code with
 * units is an MUE check. Anything else is not a rule question.
 */
export function evaluateRuleForFacts(
  facts: CaseFacts,
  subset: NcciSubset,
): RuleResult {
  if (facts.codes.length === 0) {
    return { type: "not_applicable", reason: "no_codes" };
  }
  const isPtp = facts.codes.length === 2 && facts.units === undefined;
  const isMue = facts.codes.length === 1 && facts.units !== undefined;
  if (!isPtp && !isMue) {
    return { type: "not_applicable", reason: "unsupported_claim_shape" };
  }
  const dateOfService = facts.dateOfService;
  if (!dateOfService) {
    return { type: "not_applicable", reason: "service_date_missing" };
  }
  if (isPtp) {
    const [a, b] = facts.codes;
    const outcome = evaluatePtpPair(
      subset.ptpEdits,
      a,
      b,
      dateOfService,
      facts.modifiers,
    );
    let decidingRowIds: string[];
    if (outcome.kind === "no_edit") {
      const absenceId = ptpAbsenceId(subset.ptpVersion, a, b);
      decidingRowIds = subset.ptpPairAbsences.some((row) =>
          row.id === absenceId
        )
        ? [absenceId]
        : [];
    } else if (outcome.kind === "inactive") {
      decidingRowIds = outcome.edits.map((edit) => edit.id).sort();
    } else {
      decidingRowIds = [outcome.active.id];
    }
    return {
      type: "ptp",
      codes: [a, b],
      dateOfService,
      outcome,
      decidingRowIds,
    };
  }
  const code = facts.codes[0];
  const units = facts.units as number;
  const outcome = evaluateMueUnits(subset.mueEdits, code, units);
  return {
    type: "mue",
    code,
    units,
    dateOfService,
    outcome,
    decidingRowIds: outcome.kind === "no_mue_row" ? [] : [outcome.edit.id],
  };
}

/** Machine-readable reasons a case was sent to a person. */
export const GUARD_REASON_CODES = [
  "unexpected_input",
  "intake_invalid",
  "malformed_reply",
  "closed_book_reply",
  "payer_not_medicare_ffs",
  "documentation_question",
  "intent_question",
  "request_type_unknown",
  "question_text_screen",
  "provider_profile",
  "provider_below_volume_minimum",
  "provider_flagged_for_review",
  "not_a_rule_question",
  "service_date_missing",
  "service_date_outside_window",
  "code_not_in_pinned_files",
  "no_pinned_rule_row",
  "evidence_mismatch",
  "rule_outcome_needs_review",
  "model_abstained",
  "model_requested_review",
  "model_disagrees_with_rule",
  "citation_not_pinned",
  "citation_missing_rule_row",
] as const;
export type GuardReasonCode = (typeof GUARD_REASON_CODES)[number];

/** One plain-language sentence per reason, for the reviewer. */
export const GUARD_REASON_TEXT: Record<GuardReasonCode, string> = {
  unexpected_input:
    "Sent to a person because the guard hit unexpected input and fails closed.",
  intake_invalid:
    "Sent to a person because the claim's payer or request type is missing or invalid.",
  malformed_reply:
    "Sent to a person because the model's reply was missing, cut off, or not in the required format.",
  closed_book_reply:
    "Sent to a person because the model answered without the pinned rule rows.",
  payer_not_medicare_ffs:
    "Sent to a person because the pinned rules cover Medicare fee-for-service only, and this claim is for another payer.",
  documentation_question:
    "Sent to a person because the question depends on the medical record, which the agent cannot see.",
  intent_question:
    "Sent to a person because the question is about intent or wrongdoing, which coding data cannot show.",
  request_type_unknown: "Sent to a person because the request type is unknown.",
  question_text_screen:
    "Sent to a person because the question mentions documentation, intent, or a non-Medicare payer.",
  provider_profile:
    "Sent to a person because provider billing patterns are never actioned automatically.",
  provider_below_volume_minimum:
    "Sent to a person because the provider is below the volume minimum, so the peer benchmark does not rate them.",
  provider_flagged_for_review:
    "Sent to a person because the provider's billing pattern is unusual compared with peers, which is a reason to review and not evidence of wrongdoing.",
  not_a_rule_question:
    "Sent to a person because the claim facts are not a single code-pair or units check.",
  service_date_missing:
    "Sent to a person because the claim has no service date.",
  service_date_outside_window:
    "Sent to a person because the service date is outside the quarter the pinned rules cover.",
  code_not_in_pinned_files:
    "Sent to a person because a billed code does not appear in the pinned CMS file, and a missing row is not a clearance.",
  no_pinned_rule_row:
    "Sent to a person because no pinned rule row settles this claim.",
  evidence_mismatch:
    "Sent to a person because the retrieved evidence does not match the rule result.",
  rule_outcome_needs_review:
    "Sent to a person because this rule outcome depends on a modifier or a clinical limit that needs documentation.",
  model_abstained: "Sent to a person because the model abstained.",
  model_requested_review:
    "Sent to a person because the model asked for review.",
  model_disagrees_with_rule:
    "Sent to a person because the model's decision does not match the pinned rule.",
  citation_not_pinned:
    "Sent to a person because the model cited a rule row that does not exist in the pinned data.",
  citation_missing_rule_row:
    "Sent to a person because the model did not cite the rule row that decides the claim.",
};

/** Scope of the pinned data, taken from the NCCI subset and benchmark. */
export interface PinnedScope {
  ids: ReadonlySet<string>;
  /** ISO dates, inclusive. */
  effectiveFrom: string;
  effectiveThrough: string;
}

/**
 * Everything the guard may read. Deliberately has no case id, kind, label,
 * tags, or expected answer.
 */
export interface RoutingGuardInput {
  intake: ClaimIntake;
  question: string;
  facts: CaseFacts;
  evidence: readonly EvidenceItem[];
  rule: RuleResult;
  reply: ParsedReply;
  condition: EvalCondition;
  pinned: PinnedScope;
}

export interface GuardDecision {
  guardVersion: typeof ROUTING_GUARD_VERSION;
  route: CodingRoute;
  /** Route the model asked for; null when the reply was malformed. */
  modelRoute: CodingRoute | null;
  /** True when the model asked for `auto` and the guard sent it to a person. */
  overrodeModel: boolean;
  /** Empty exactly when `route` is `auto`. Ordered by GUARD_REASON_CODES. */
  reasons: GuardReasonCode[];
  /** One plain-language sentence for the reviewer. */
  reasonText: string;
  /** Decision the pinned rule gives, when it gives one. */
  ruleDecision: "flag" | "no_flag" | null;
  /** Pinned row ids the rule outcome rests on. */
  decidingRowIds: string[];
}

/**
 * Question-text backstop. Can only add review, never remove it. Catches
 * documentation, intent, and non-Medicare payer wording when intake is wrong.
 */
const QUESTION_SCREEN =
  /\b(fraud\w*|abus\w*|intent\w*|deliberate\w*|upcod\w*|kickback\w*|documentation|documented|medical record\w*|chart notes?|medically necessary|medical necessity|commercial|medicare advantage|medicaid|part c)\b/i;

export function questionTextScreen(question: string): boolean {
  return QUESTION_SCREEN.test(question);
}

/** Rule outcomes the guard lets go out automatically, with their decision. */
function autoEligibleDecision(rule: RuleResult): "flag" | "no_flag" | null {
  if (rule.type === "ptp") {
    switch (rule.outcome.kind) {
      case "denied_column2":
        return "flag";
      case "no_edit":
      case "inactive":
        return "no_flag";
      case "bypassed_by_modifier":
        return null;
    }
  }
  if (rule.type === "mue") {
    if (rule.outcome.kind === "within_limit") return "no_flag";
    if (
      rule.outcome.kind === "exceeds_limit" &&
      rule.outcome.edit.adjudicationIndicator === "2"
    ) return "flag";
  }
  return null;
}

function ruleDecisionOf(rule: RuleResult): "flag" | "no_flag" | null {
  if (rule.type === "ptp") {
    return rule.outcome.kind === "denied_column2" ? "flag" : "no_flag";
  }
  if (rule.type === "mue") {
    if (rule.outcome.kind === "no_mue_row") return null;
    return rule.outcome.kind === "exceeds_limit" ? "flag" : "no_flag";
  }
  return null;
}

function finish(
  reasons: Set<GuardReasonCode>,
  modelRoute: CodingRoute | null,
  rule: RuleResult | null,
): GuardDecision {
  const ordered = GUARD_REASON_CODES.filter((code) => reasons.has(code));
  const route: CodingRoute = ordered.length === 0 ? "auto" : "human_review";
  const decidingRowIds = rule && rule.type !== "not_applicable"
    ? [...rule.decidingRowIds]
    : [];
  return {
    guardVersion: ROUTING_GUARD_VERSION,
    route,
    modelRoute,
    overrodeModel: modelRoute === "auto" && route === "human_review",
    reasons: ordered,
    reasonText: route === "auto"
      ? `Decided automatically because pinned rule row ${
        decidingRowIds.join(", ")
      } settles this claim and the model agreed.`
      : GUARD_REASON_TEXT[ordered[0]],
    ruleDecision: rule ? ruleDecisionOf(rule) : null,
    decidingRowIds,
  };
}

function profileChecks(
  facts: CaseFacts,
  evidence: readonly EvidenceItem[],
  reasons: Set<GuardReasonCode>,
): void {
  if (facts.profileId === undefined) return;
  reasons.add("provider_profile");
  const item = evidence.find((e) =>
    e.type === "provider_profile" && e.id === facts.profileId
  );
  if (!item) {
    reasons.add("no_pinned_rule_row");
    return;
  }
  if (item.data.meetsVolumeThreshold !== true) {
    reasons.add("provider_below_volume_minimum");
  }
  if (item.data.outlierForReview !== false) {
    // Anything other than an explicit "not flagged" is treated as flagged.
    if (item.data.meetsVolumeThreshold === true) {
      reasons.add("provider_flagged_for_review");
    }
  }
}

function ruleChecks(
  input: RoutingGuardInput,
  reasons: Set<GuardReasonCode>,
): void {
  const { rule, evidence, pinned, facts } = input;
  if (rule.type === "not_applicable") {
    reasons.add(
      rule.reason === "service_date_missing"
        ? "service_date_missing"
        : "not_a_rule_question",
    );
    return;
  }
  if (
    rule.dateOfService < pinned.effectiveFrom ||
    rule.dateOfService > pinned.effectiveThrough
  ) {
    reasons.add("service_date_outside_window");
  }
  const ruleCodes = rule.type === "ptp" ? rule.codes : [rule.code];
  const sameCodes = ruleCodes.length === facts.codes.length &&
    ruleCodes.every((code, i) => code === facts.codes[i]);
  if (!sameCodes) reasons.add("evidence_mismatch");
  for (const code of ruleCodes) {
    const coverage = evidence.find((e) =>
      e.type === "code_coverage" && e.data.code === code
    );
    const inFile = rule.type === "ptp"
      ? coverage?.data.appearsInFullPtpFile
      : coverage?.data.appearsInFullMueFile;
    if (inFile !== true) reasons.add("code_not_in_pinned_files");
  }
  if (rule.decidingRowIds.length === 0) {
    reasons.add("no_pinned_rule_row");
  }
  const evidenceIds = new Set(evidence.map((e) => e.id));
  for (const id of rule.decidingRowIds) {
    if (!pinned.ids.has(id) || !evidenceIds.has(id)) {
      reasons.add("evidence_mismatch");
    }
  }
  if (rule.decidingRowIds.length > 0 && autoEligibleDecision(rule) === null) {
    reasons.add("rule_outcome_needs_review");
  }
}

/** Decide the final route. Pure and deterministic; never throws. */
export function applyRoutingGuard(input: RoutingGuardInput): GuardDecision {
  const reasons = new Set<GuardReasonCode>();
  let modelRoute: CodingRoute | null = null;
  let rule: RuleResult | null = null;
  try {
    const reply = input.reply.ok ? input.reply.reply : null;
    modelRoute = reply?.route ?? null;
    rule = input.rule;
    if (!reply) reasons.add("malformed_reply");
    if (input.condition !== "grounded") reasons.add("closed_book_reply");

    const intake = claimIntakeSchema.safeParse(input.intake);
    if (!intake.success) {
      reasons.add("intake_invalid");
    } else {
      if (intake.data.payer !== "medicare_ffs") {
        reasons.add("payer_not_medicare_ffs");
      }
      switch (intake.data.requestType) {
        case "claim_edit_check":
          break;
        case "documentation_review":
          reasons.add("documentation_question");
          break;
        case "intent_question":
          reasons.add("intent_question");
          break;
        case "provider_profile_review":
          reasons.add("provider_profile");
          break;
        case "unknown":
          reasons.add("request_type_unknown");
          break;
      }
    }
    if (questionTextScreen(input.question)) reasons.add("question_text_screen");
    if (!input.evidence.some((e) => e.type === "ncci_version")) {
      reasons.add("evidence_mismatch");
    }

    profileChecks(input.facts, input.evidence, reasons);
    ruleChecks(input, reasons);

    if (reply) {
      if (reply.decision === "abstain") reasons.add("model_abstained");
      if (reply.route === "human_review") reasons.add("model_requested_review");
      const expectedByRule = ruleDecisionOf(input.rule);
      if (
        reply.decision !== "abstain" && expectedByRule !== null &&
        reply.decision !== expectedByRule
      ) reasons.add("model_disagrees_with_rule");
      if (reply.citations.some((id) => !input.pinned.ids.has(id))) {
        reasons.add("citation_not_pinned");
      }
      if (input.rule.type !== "not_applicable") {
        const cited = new Set(reply.citations);
        if (!input.rule.decidingRowIds.every((id) => cited.has(id))) {
          reasons.add("citation_missing_rule_row");
        }
      }
    }
  } catch {
    reasons.add("unexpected_input");
  }
  return finish(reasons, modelRoute, rule);
}
