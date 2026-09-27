import type {
  ClaimEvidence,
  ClaimIntegrityAnalysis,
  OncologyClaim,
} from "@/lib/oncology/claimIntegrity/types";

/**
 * Transparent comparison rules. This module does not infer intent, misconduct,
 * or investment merit. Every suggestion still requires a human reviewer.
 */

const COMPARATIVE =
  /\b(best[- ]in[- ]class|superior(?:ity)?|outperform(?:s|ed|ing)?|better than)\b/i;
const HEAD_TO_HEAD =
  /\b(head[- ]to[- ]head|active comparator|randomized comparison against)\b/i;
const POST_HOC = /\b(post[- ]hoc|subgroup|exploratory)\b/i;
const PRIMARY_RESULT =
  /\b(primary (?:end\s?point|result|analysis)|met (?:its|the) (?:primary )?endpoint)\b/i;
const MET_ENDPOINT = /\bmet (?:its|the) (?:primary )?endpoint\b/i;
const ENDPOINT_NOT_MET =
  /\b(primary endpoint (?:was )?not met|did not meet (?:the |its )?primary endpoint|failed to meet (?:the |its )?primary endpoint)\b/i;
const REGULATORY_CLAIM =
  /\b(fda[- ]approved|approved by the fda|breakthrough (?:therapy|designation)|regulatory agreement|endorsed by (?:the )?fda)\b/i;
const SPECIALIST = /\bspecialist review\b/i;

function evidenceText(item: ClaimEvidence): string {
  return `${item.title}\n${item.analystSummary}\n${item.quotedExcerpt ?? ""}\n${
    item.limitations ?? ""
  }`;
}

function asOfEvidence(evidence: readonly ClaimEvidence[]): ClaimEvidence[] {
  return evidence.filter((item) => item.relationship !== "subsequent_evidence");
}

function clauseTokens(clause: string): string[] {
  return clause
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 5);
}

/**
 * A compound claim is partially supported when at least one "and" clause has
 * a distinctive token in supporting evidence and another clause does not.
 */
export function compoundClaimPartiallyCovered(
  exactClaim: string,
  supporting: readonly ClaimEvidence[],
): boolean {
  const clauses = exactClaim.split(/\s+and\s+/i).map((part) => part.trim())
    .filter(Boolean);
  if (clauses.length < 2 || supporting.length === 0) return false;
  const corpus = supporting.map(evidenceText).join("\n").toLowerCase();
  const covered = clauses.map((clause) => {
    const tokens = clauseTokens(clause);
    if (tokens.length === 0) return true;
    return tokens.some((token) => corpus.includes(token));
  });
  return covered.some(Boolean) && covered.some((value) => !value);
}

export function analyzeClaimIntegrity(
  claim: Pick<OncologyClaim, "id" | "exactClaim">,
  evidence: readonly ClaimEvidence[],
): ClaimIntegrityAnalysis {
  const supportingEvidenceIds = evidence
    .filter((item) => item.relationship === "supports")
    .map((item) => item.id);
  const contradictoryEvidenceIds = evidence
    .filter((item) => item.relationship === "contradicts")
    .map((item) => item.id);
  const subsequentEvidenceIds = evidence
    .filter((item) => item.relationship === "subsequent_evidence")
    .map((item) => item.id);
  const temporalWarnings = evidence
    .filter((item) => item.relationship === "subsequent_evidence")
    .map((item) =>
      `${item.id} is subsequent evidence and is excluded from the as-of comparison.`
    );
  const missingPublication = evidence.filter((item) => !item.publicationDate);
  for (const item of missingPublication) {
    temporalWarnings.push(
      `${item.id} has no publication date, so availability on the claim date is not established.`,
    );
  }

  const timely = asOfEvidence(evidence);
  const timelySupport = timely.filter((item) =>
    item.relationship === "supports"
  );
  const timelyContradict = timely.filter((item) =>
    item.relationship === "contradicts"
  );
  const timelyContext = timely.filter((item) =>
    item.relationship === "contextualizes"
  );
  const missingEvidence: string[] = [];
  const reasons: string[] = [];

  const base = {
    claimId: claim.id,
    supportingEvidenceIds,
    contradictoryEvidenceIds,
    subsequentEvidenceIds,
    temporalWarnings,
    requiresHumanReview: true as const,
  };

  if (timely.length === 0) {
    missingEvidence.push(
      "At least one source available on or before the evidence cutoff.",
    );
    reasons.push(
      "No evidence is available on or before the evidence cutoff. Later records stay labeled subsequent evidence.",
    );
    return {
      ...base,
      suggestedClassification: "insufficient_public_evidence",
      reasons,
      missingEvidence,
    };
  }

  const primaryTexts = timely
    .filter((item) => item.primarySource)
    .map(evidenceText);
  const allTimelyText = timely.map(evidenceText).join("\n");

  if (
    MET_ENDPOINT.test(claim.exactClaim) &&
    primaryTexts.some((text) => ENDPOINT_NOT_MET.test(text))
  ) {
    reasons.push(
      "The claim says an endpoint was met. Linked primary-source text says the prespecified primary endpoint was not met.",
    );
    return {
      ...base,
      suggestedClassification: "inconsistent_with_source_evidence",
      reasons,
      missingEvidence,
    };
  }

  const claimTreatsExploratoryAsPrimary = POST_HOC.test(claim.exactClaim) &&
    PRIMARY_RESULT.test(claim.exactClaim);
  const evidenceMarksExploratory = primaryTexts.some((text) =>
    POST_HOC.test(text)
  );
  if (
    claimTreatsExploratoryAsPrimary ||
    (PRIMARY_RESULT.test(claim.exactClaim) && evidenceMarksExploratory &&
      !POST_HOC.test(claim.exactClaim))
  ) {
    reasons.push(
      "The claim presents a primary-result characterization while the wording or primary-source text is exploratory, subgroup, or post hoc.",
    );
    return {
      ...base,
      suggestedClassification: "post_hoc_or_subgroup_dependence",
      reasons,
      missingEvidence,
    };
  }

  if (COMPARATIVE.test(claim.exactClaim) && !HEAD_TO_HEAD.test(allTimelyText)) {
    missingEvidence.push(
      "Head-to-head or active-comparator evidence for the comparative wording.",
    );
    reasons.push(
      "Comparative wording is present without head-to-head or active-comparator evidence in the as-of record.",
    );
    return {
      ...base,
      suggestedClassification: "cross_trial_comparison_limitation",
      reasons,
      missingEvidence,
    };
  }

  const hasRegulatorySource = timely.some((item) =>
    item.sourceType === "regulatory_document" &&
    (item.relationship === "supports" || item.relationship === "contextualizes")
  );
  if (REGULATORY_CLAIM.test(claim.exactClaim) && !hasRegulatorySource) {
    missingEvidence.push(
      "A regulatory document that matches the approval, designation, or agreement wording.",
    );
    reasons.push(
      "Regulatory wording is present without a matching regulatory document in the as-of record.",
    );
    return {
      ...base,
      suggestedClassification: "regulatory_characterization_unclear",
      reasons,
      missingEvidence,
    };
  }

  if (timely.some((item) => SPECIALIST.test(item.limitations ?? ""))) {
    reasons.push(
      "Linked evidence records a specialist-review limitation. The suggestion stays with a human specialist.",
    );
    return {
      ...base,
      suggestedClassification: "requires_expert_review",
      reasons,
      missingEvidence,
    };
  }

  if (
    compoundClaimPartiallyCovered(claim.exactClaim, timelySupport) ||
    (timelySupport.length > 0 && timelyContradict.length > 0)
  ) {
    reasons.push(
      "As-of evidence supports only part of the claim, or supporting and contradictory records are both present.",
    );
    return {
      ...base,
      suggestedClassification: "partially_substantiated",
      reasons,
      missingEvidence,
    };
  }

  if (timelySupport.length === 0 && timelyContext.length > 0) {
    missingEvidence.push("A source that supports the claim as stated.");
    reasons.push(
      "As-of records contextualize the claim and do not support it as stated.",
    );
    return {
      ...base,
      suggestedClassification: "material_context_omitted",
      reasons,
      missingEvidence,
    };
  }

  const primarySupport = timelySupport.filter((item) =>
    item.primarySource && item.availableByClaimDate
  );
  if (primarySupport.length === 0) {
    missingEvidence.push(
      "A primary source available by the claim date that supports the claim.",
    );
    reasons.push(
      "Supporting records do not include a primary source available by the claim date.",
    );
    return {
      ...base,
      suggestedClassification: "insufficient_public_evidence",
      reasons,
      missingEvidence,
    };
  }

  reasons.push(
    "Primary-source support is present in the as-of record and no comparison rule fired. A reviewer still has to accept the classification.",
  );
  return {
    ...base,
    suggestedClassification: "substantiated",
    reasons,
    missingEvidence,
  };
}
