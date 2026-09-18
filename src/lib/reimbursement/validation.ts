import {
  type EvidenceLedger,
  evidenceLedgerSchema,
  type EvidenceStatus,
  type ReimbursementClaim,
  type ReimbursementSource,
} from "./schema";

const reviewRequiredStatuses = new Set<EvidenceStatus>([
  "specialist_reviewed",
  "approved",
  "published",
]);

const approvalRequiredStatuses = new Set<EvidenceStatus>([
  "approved",
  "published",
]);

const authoritativeSourceTypes = new Set([
  "primary",
  "peer_reviewed",
  "secondary",
]);

export interface LedgerValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface LedgerValidationResult {
  ok: boolean;
  issues: LedgerValidationIssue[];
  ledger?: EvidenceLedger;
}

function duplicateIds(rows: readonly { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.id)) duplicates.add(row.id);
    seen.add(row.id);
  }
  return [...duplicates];
}

function hasAuthoritativeSource(
  claim: ReimbursementClaim,
  sourcesById: Map<string, ReimbursementSource>,
): boolean {
  return claim.sourceIds.some((sourceId) => {
    const source = sourcesById.get(sourceId);
    return source ? authoritativeSourceTypes.has(source.sourceType) : false;
  });
}

export function validateClaimForApproval(
  claim: ReimbursementClaim,
  sourcesById: Map<string, ReimbursementSource>,
): string[] {
  const errors: string[] = [];

  if (!claim.statement.trim()) errors.push("Claim statement is required.");
  if (claim.sourceIds.length === 0) {
    errors.push("At least one source is required.");
  }

  const unknownSources = claim.sourceIds.filter(
    (sourceId) => !sourcesById.has(sourceId),
  );
  if (unknownSources.length) {
    errors.push(`Unknown source IDs: ${unknownSources.join(", ")}.`);
  }

  if (!hasAuthoritativeSource(claim, sourcesById)) {
    errors.push(
      "Approval requires at least one non-discovery source (primary, peer-reviewed, or secondary).",
    );
  }

  if (
    (claim.kind === "modeled_estimate" ||
      claim.economicUnit === "modeled_exposure") &&
    !claim.assumptions?.length
  ) {
    errors.push("Modeled estimates require explicit assumptions.");
  }

  return errors;
}

export function isClaimPublishable(
  claim: ReimbursementClaim,
  ledger: EvidenceLedger,
): boolean {
  if (!approvalRequiredStatuses.has(claim.status)) return false;

  const sourcesById = new Map(
    ledger.sources.map((source) => [source.id, source]),
  );
  if (validateClaimForApproval(claim, sourcesById).length > 0) return false;

  const reviews = ledger.reviews.filter((review) =>
    review.claimId === claim.id
  );
  const hasSpecialistReview = reviews.some(
    (review) =>
      review.reviewerRole === "coding_reimbursement_specialist" &&
      review.toStatus === "specialist_reviewed" &&
      review.decision === "approve",
  );
  const hasPolicyApproval = reviews.some(
    (review) =>
      (review.reviewerRole === "policy_reviewer" ||
        review.reviewerRole === "admin") &&
      (review.toStatus === "approved" || review.toStatus === "published") &&
      review.decision === "approve",
  );

  return hasSpecialistReview && hasPolicyApproval;
}

/**
 * Runtime + referential-integrity gate for JSON/imported ledgers.
 * This function never mutates the input.
 */
export function validateEvidenceLedger(input: unknown): LedgerValidationResult {
  const parsed = evidenceLedgerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "schema",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const ledger = parsed.data;
  const issues: LedgerValidationIssue[] = [];

  const collections: Array<[string, readonly { id: string }[]]> = [
    ["issues", ledger.issues],
    ["claims", ledger.claims],
    ["sources", ledger.sources],
    ["codeRates", ledger.codeRates],
    ["reviews", ledger.reviews],
  ];
  for (const [collectionName, rows] of collections) {
    for (const duplicate of duplicateIds(rows)) {
      issues.push({
        code: "duplicate_id",
        path: collectionName,
        message: `Duplicate ${collectionName} id: ${duplicate}`,
      });
    }
  }

  const issueById = new Map(ledger.issues.map((issue) => [issue.id, issue]));
  const claimById = new Map(ledger.claims.map((claim) => [claim.id, claim]));
  const sourceById = new Map(
    ledger.sources.map((source) => [source.id, source]),
  );

  for (const claim of ledger.claims) {
    if (!issueById.has(claim.issueId)) {
      issues.push({
        code: "unknown_issue",
        path: `claims.${claim.id}.issueId`,
        message: `Claim references unknown issue ${claim.issueId}.`,
      });
    }

    for (const sourceId of claim.sourceIds) {
      if (!sourceById.has(sourceId)) {
        issues.push({
          code: "unknown_source",
          path: `claims.${claim.id}.sourceIds`,
          message: `Claim references unknown source ${sourceId}.`,
        });
      }
    }

    if (reviewRequiredStatuses.has(claim.status)) {
      const hasSpecialistReview = ledger.reviews.some(
        (review) =>
          review.claimId === claim.id &&
          review.reviewerRole === "coding_reimbursement_specialist" &&
          review.toStatus === "specialist_reviewed" &&
          review.decision === "approve",
      );
      if (!hasSpecialistReview) {
        issues.push({
          code: "missing_specialist_review",
          path: `claims.${claim.id}.status`,
          message: `${claim.status} requires a recorded specialist review.`,
        });
      }
    }

    if (approvalRequiredStatuses.has(claim.status)) {
      for (const message of validateClaimForApproval(claim, sourceById)) {
        issues.push({
          code: "approval_gate",
          path: `claims.${claim.id}`,
          message,
        });
      }

      const hasPolicyApproval = ledger.reviews.some(
        (review) =>
          review.claimId === claim.id &&
          (review.reviewerRole === "policy_reviewer" ||
            review.reviewerRole === "admin") &&
          (review.toStatus === "approved" || review.toStatus === "published") &&
          review.decision === "approve",
      );
      if (!hasPolicyApproval) {
        issues.push({
          code: "missing_policy_approval",
          path: `claims.${claim.id}.status`,
          message: `${claim.status} requires a recorded policy/admin approval.`,
        });
      }
    }
  }

  for (const issue of ledger.issues) {
    for (const claimId of issue.claimIds) {
      const claim = claimById.get(claimId);
      if (!claim) {
        issues.push({
          code: "unknown_claim",
          path: `issues.${issue.id}.claimIds`,
          message: `Issue references unknown claim ${claimId}.`,
        });
      } else if (claim.issueId !== issue.id) {
        issues.push({
          code: "claim_issue_mismatch",
          path: `issues.${issue.id}.claimIds`,
          message:
            `Claim ${claimId} belongs to issue ${claim.issueId}, not ${issue.id}.`,
        });
      }
    }
  }

  for (const rate of ledger.codeRates) {
    if (!sourceById.has(rate.sourceId)) {
      issues.push({
        code: "unknown_rate_source",
        path: `codeRates.${rate.id}.sourceId`,
        message:
          `Code-rate observation references unknown source ${rate.sourceId}.`,
      });
    }
  }

  for (const review of ledger.reviews) {
    if (!claimById.has(review.claimId)) {
      issues.push({
        code: "unknown_review_claim",
        path: `reviews.${review.id}.claimId`,
        message: `Review references unknown claim ${review.claimId}.`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    ledger,
  };
}
