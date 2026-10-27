import type { EvidenceAskDraft, EvidencePassage } from "./contracts";
import {
  assessPassageAdmissibility,
  type EvidenceRetrievalScope,
} from "./filters";

export interface VerificationOutcome {
  disposition: EvidenceAskDraft["disposition"];
  answer: string;
  claims: Array<{
    id: string;
    text: string;
    passageIds: string[];
    verification: "resolved" | "unresolved" | "rejected";
    reasons: string[];
  }>;
  limitations: string[];
  conflicts: string[];
  abstentionReason: string | null;
  publicationEligible: boolean;
  representedAsApprovedClaim: boolean;
}

const ABSTENTION =
  "No admissible evidence supports a grounded answer to this question. This is not a clinical, reimbursement-policy, or investment conclusion.";

function numbersClose(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001;
}

function numericTokens(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function valueLabels(value: number): string[] {
  const labels = new Set<string>([String(value), value.toFixed(2)]);
  return [...labels];
}

function answerMentions(answer: string, value: number): boolean {
  return valueLabels(value).some((label) => answer.includes(label));
}

type RecordVerdict = "match" | "contradict" | "insufficient";

function compareRecord(
  claim: NonNullable<EvidenceAskDraft["claims"][number]["record"]>,
  passage: EvidencePassage,
): RecordVerdict {
  const record = passage.record;
  if (!record) return "insufficient";
  if (claim.metric !== record.metric) return "insufficient";

  if (record.value === null) {
    if (claim.value === null || claim.value === undefined) {
      return "insufficient";
    }
    return "contradict";
  }

  if (claim.value === null || claim.value === undefined) {
    return "insufficient";
  }

  const valueMatches = typeof claim.value === "number" &&
      typeof record.value === "number"
    ? numbersClose(claim.value, record.value)
    : String(claim.value) === String(record.value);
  if (!valueMatches) return "contradict";

  if (claim.unit && record.unit && claim.unit !== record.unit) {
    return "contradict";
  }
  if (
    claim.comparator && record.comparator &&
    claim.comparator !== record.comparator
  ) {
    return "contradict";
  }

  const scopes: Array<[unknown, unknown]> = [
    [claim.code, record.code],
    [claim.codeSystem, record.codeSystem],
    [claim.dataYear, record.dataYear ?? passage.dataYear],
    [claim.payer, record.payer ?? passage.payer],
    [claim.setting, record.setting ?? passage.setting],
    [claim.geographyCode, record.geographyCode ?? passage.geography?.code],
  ];
  for (const [claimed, stored] of scopes) {
    if (claimed == null) continue;
    if (stored == null || claimed !== stored) return "contradict";
  }

  return "match";
}

function passageTextHasNumber(
  passages: readonly EvidencePassage[],
  token: string,
): boolean {
  return passages.some((passage) => {
    const haystack = `${passage.text ?? ""} ${passage.title}`;
    if (haystack.includes(token)) return true;
    const asNumber = Number(token);
    if (!Number.isFinite(asNumber)) return false;
    return valueLabels(asNumber).some((label) => haystack.includes(label));
  });
}

function recordSupportsToken(
  record: EvidenceAskDraft["claims"][number]["record"],
  token: string,
): boolean {
  if (!record || record.value == null) return false;
  if (String(record.value) === token) return true;
  if (typeof record.value !== "number") return false;
  const asNumber = Number(token);
  return Number.isFinite(asNumber) && numbersClose(asNumber, record.value);
}

function unsupportedNumericToken(
  text: string,
  passages: readonly EvidencePassage[],
  records: readonly EvidenceAskDraft["claims"][number]["record"][],
): string | undefined {
  return numericTokens(text).find((token) =>
    !passageTextHasNumber(passages, token) &&
    !records.some((record) => recordSupportsToken(record, token))
  );
}

/**
 * Deterministic citation checks. An identifier match is not semantic support.
 * Paraphrases that cannot be checked against a structured record stay unresolved.
 */
export function verifyEvidenceDraft(input: {
  draft: EvidenceAskDraft;
  retrieved: readonly EvidencePassage[];
  scope: EvidenceRetrievalScope;
  lane: EvidenceRetrievalScope["lane"];
}): VerificationOutcome {
  const byId = new Map(
    input.retrieved.map((passage) => [passage.passageId, passage]),
  );
  const limitations: string[] = [];
  const rejectedReasons: string[] = [];
  const surviving: VerificationOutcome["claims"] = [];
  const survivingRecords = new Map<
    string,
    EvidenceAskDraft["claims"][number]["record"]
  >();

  if (input.retrieved.length === 0 || input.draft.disposition === "abstain") {
    return abstain(
      input.retrieved.length === 0
        ? "No admissible passages were retrieved."
        : "The draft abstained because the retrieved passages were not sufficient.",
      limitations,
    );
  }

  for (const claim of input.draft.claims) {
    const reasons: string[] = [];
    const cited: EvidencePassage[] = [];
    let contradicted = false;
    let matched = false;

    if (claim.passageIds.length === 0) {
      rejectedReasons.push(`${claim.id} has no citation.`);
      continue;
    }

    for (const passageId of claim.passageIds) {
      const passage = byId.get(passageId);
      if (!passage) {
        contradicted = true;
        reasons.push(`${passageId} is not in the retrieved set.`);
        continue;
      }
      const admission = assessPassageAdmissibility(passage, input.scope);
      if (!admission.admissible) {
        contradicted = true;
        reasons.push(admission.reason);
        continue;
      }
      cited.push(passage);
      if (!claim.record) continue;
      const verdict = compareRecord(claim.record, passage);
      if (verdict === "contradict") {
        contradicted = true;
        reasons.push(
          `${passageId} contradicts the structured assertion on ${claim.record.metric}.`,
        );
      } else if (verdict === "match") {
        matched = true;
      }
    }

    if (contradicted) {
      rejectedReasons.push(
        `${claim.id} was rejected: ${reasons.join(" ")}`,
      );
      continue;
    }

    if (
      claimsApproval(claim.text) &&
      cited.some((passage) => passage.passageRole !== "approved_claim")
    ) {
      rejectedReasons.push(
        `${claim.id} described evidence as approved when the cited passage is not an approved claim.`,
      );
      continue;
    }

    if (
      assertsMissingAsZero(claim.text) &&
      cited.some((passage) => passage.record?.value === null)
    ) {
      rejectedReasons.push(
        `${claim.id} treated a missing structured value as zero.`,
      );
      continue;
    }

    if (claim.record && claim.record.value != null) {
      if (!matched) {
        rejectedReasons.push(
          `${claim.id} cites a retrieved passage but the structured assertion is not supported.`,
        );
        continue;
      }
      const unsupportedClaimNumber = unsupportedNumericToken(
        claim.text,
        cited,
        [claim.record],
      );
      if (unsupportedClaimNumber) {
        rejectedReasons.push(
          `${claim.id} states ${unsupportedClaimNumber}, which is not the matched record or the cited passage text.`,
        );
        continue;
      }
      surviving.push({
        id: claim.id,
        text: claim.text,
        passageIds: claim.passageIds,
        verification: "resolved",
        reasons: ["Structured record matches a retrieved passage."],
      });
      survivingRecords.set(claim.id, claim.record);
      continue;
    }

    const unsupportedNumber = numericTokens(claim.text).find((token) =>
      !passageTextHasNumber(cited, token)
    );
    if (unsupportedNumber) {
      rejectedReasons.push(
        `${claim.id} contains a number that is not in the cited passage text.`,
      );
      continue;
    }

    surviving.push({
      id: claim.id,
      text: claim.text,
      passageIds: claim.passageIds,
      verification: "unresolved",
      reasons: [
        "Passage identifiers resolve, but the paraphrase is not a deterministic semantic match. Researcher review is required.",
      ],
    });
    survivingRecords.set(claim.id, claim.record);
  }

  if (rejectedReasons.length > 0 || surviving.length === 0) {
    return abstain(
      rejectedReasons[0] ??
        "The draft made factual assertions without a surviving citation.",
      [
        ...limitations,
        "Drafted assertions were withheld because citation checks did not pass.",
      ],
    );
  }

  const conflicts = conflictMessages(
    input.retrieved,
    surviving.map((claim) => ({ record: survivingRecords.get(claim.id) })),
  );
  const unresolved = surviving.some((claim) =>
    claim.verification === "unresolved"
  );
  const citedPassages = surviving.flatMap((claim) =>
    claim.passageIds.flatMap((id) => {
      const passage = byId.get(id);
      return passage ? [passage] : [];
    })
  );
  const allApproved = citedPassages.every((passage) =>
    passage.passageRole === "approved_claim" &&
    (passage.reviewState === "approved" || passage.reviewState === "published")
  );

  if (unresolved) {
    limitations.push(
      "At least one paraphrase could not be deterministically verified and requires researcher review. It is not a verified claim.",
    );
  }
  if (!allApproved) {
    limitations.push(
      "Cited evidence is not a publication-approved Lacuna claim.",
    );
  }

  let disposition = input.draft.disposition;
  if (
    disposition === "answer" &&
    (unresolved || !allApproved || conflicts.length > 0)
  ) {
    disposition = "qualified_answer";
  }

  for (const passage of citedPassages) {
    limitations.push(...passage.limitations);
  }

  if (conflicts.length > 0) {
    const mentioned = conflicts.every((conflict) => {
      const values = conflict.values;
      return values.every((value) => answerMentions(input.draft.answer, value));
    });
    if (!mentioned) {
      return abstain(
        "Retrieved passages disagree, and the draft did not keep each conflicting value explicit.",
        [...limitations, ...conflicts.map((conflict) => conflict.message)],
      );
    }
    disposition = "qualified_answer";
  }

  const unsupportedAnswerNumber = unsupportedNumericToken(
    input.draft.answer,
    input.retrieved,
    [...survivingRecords.values()],
  );
  if (unsupportedAnswerNumber) {
    return abstain(
      `The draft answer states ${unsupportedAnswerNumber}, which is not in the retrieved evidence.`,
      [
        ...limitations,
        "The synthesis was withheld because it introduced a number the retrieved passages do not state.",
      ],
    );
  }

  const publicationEligible = input.lane === "publication" &&
    disposition === "answer" &&
    !unresolved &&
    conflicts.length === 0 &&
    allApproved &&
    surviving.every((claim) => claim.verification === "resolved");

  return {
    disposition,
    answer: input.draft.answer,
    claims: surviving,
    limitations: unique(limitations),
    conflicts: conflicts.map((conflict) => conflict.message),
    abstentionReason: null,
    publicationEligible,
    representedAsApprovedClaim: publicationEligible,
  };
}

function abstain(
  reason: string,
  limitations: string[],
): VerificationOutcome {
  return {
    disposition: "abstain",
    answer: ABSTENTION,
    claims: [],
    limitations: unique([
      ...limitations,
      "No clinical, reimbursement-policy, or investment conclusion is made.",
    ]),
    conflicts: [],
    abstentionReason: reason,
    publicationEligible: false,
    representedAsApprovedClaim: false,
  };
}

function comparableScopeKey(passage: EvidencePassage): string | null {
  const record = passage.record;
  if (!record || typeof record.value !== "number") return null;
  return [
    record.metric,
    String(record.dataYear ?? passage.dataYear ?? ""),
    record.payer ?? passage.payer ?? "",
    record.geographyCode ?? passage.geography?.code ?? "",
    record.setting ?? passage.setting ?? "",
    record.code ?? "",
    record.unit ?? "",
    record.comparator ?? "",
  ].join("|");
}

function conflictMessages(
  retrieved: readonly EvidencePassage[],
  claims: readonly { record?: EvidenceAskDraft["claims"][number]["record"] }[],
): Array<{ message: string; values: number[] }> {
  const byScope = new Map<string, { metric: string; values: number[] }>();
  for (const passage of retrieved) {
    const key = comparableScopeKey(passage);
    const value = passage.record?.value;
    if (!key || typeof value !== "number") continue;
    const metric = passage.record?.metric ?? key;
    const existing = byScope.get(key) ?? { metric, values: [] };
    if (!existing.values.some((item) => numbersClose(item, value))) {
      existing.values.push(value);
    }
    byScope.set(key, existing);
  }

  const messages: Array<{ message: string; values: number[] }> = [];
  const seen = new Set<string>();
  for (const claim of claims) {
    const metric = claim.record?.metric;
    if (!metric) continue;
    for (const [key, group] of byScope) {
      if (!key.startsWith(`${metric}|`) || seen.has(key)) continue;
      if (group.values.length < 2) continue;
      seen.add(key);
      messages.push({
        values: group.values,
        message: `Retrieved passages disagree on ${metric}: ${
          group.values.map((value) => value.toFixed(2)).join(", ")
        }.`,
      });
    }
  }
  return messages;
}

function claimsApproval(text: string): boolean {
  if (/not an approved|not a publication-approved|not approved/i.test(text)) {
    return false;
  }
  return /\bapproved\b/i.test(text);
}

function assertsMissingAsZero(text: string): boolean {
  if (/\$\s*0(?!\.\d)/.test(text)) return true;
  return /(?:^|[^\d.])0(?:\.0+)?(?!\d)/.test(text);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}
