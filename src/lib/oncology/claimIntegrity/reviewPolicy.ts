import type {
  ClaimClassification,
  ClaimEvidence,
  ReviewStatus,
} from "@/lib/oncology/claimIntegrity/types";

export interface ReviewActorRef {
  id: string;
  writeCapable: boolean;
}

export class ClaimReviewError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClaimReviewError";
    this.status = status;
  }
}

const EDITABLE: readonly ReviewStatus[] = ["draft", "changes_requested"];

export function assertCanEdit(
  status: ReviewStatus,
): void {
  if (!EDITABLE.includes(status)) {
    throw new ClaimReviewError(
      "Only draft records and records with changes requested can be edited.",
      409,
    );
  }
}

export function assertCanAttachEvidence(status: ReviewStatus): void {
  if (status === "approved" || status === "archived") {
    throw new ClaimReviewError(
      "Approved and archived records cannot gain or lose evidence. Request changes first.",
      409,
    );
  }
}

export function assertWriteActor(actor: ReviewActorRef): void {
  if (!actor.writeCapable) {
    throw new ClaimReviewError(
      "A signed reviewer is required for this action.",
      403,
    );
  }
}

/**
 * Separation of duties: the creator of a record cannot approve it.
 * Existing review actors are distinct user ids (GitHub subject or API key).
 */
export function assertCanApprove(
  actor: ReviewActorRef,
  createdBy: string,
): void {
  assertWriteActor(actor);
  if (actor.id === createdBy) {
    throw new ClaimReviewError(
      "The analyst who created this record cannot approve it.",
      403,
    );
  }
}

export function assertFinalClassification(input: {
  classification: ClaimClassification;
  evidence: readonly ClaimEvidence[];
}): void {
  if (input.classification === "unreviewed") {
    throw new ClaimReviewError(
      "Approval requires a classification other than unreviewed.",
    );
  }
  const asOf = input.evidence.filter((item) =>
    item.relationship !== "subsequent_evidence"
  );
  if (asOf.length === 0) {
    throw new ClaimReviewError(
      "A final classification requires at least one evidence record available for the as-of comparison.",
    );
  }
  if (input.classification === "substantiated") {
    const primary = asOf.some((item) =>
      item.primarySource && item.relationship === "supports" &&
      item.availableByClaimDate
    );
    if (!primary) {
      throw new ClaimReviewError(
        "Substantiated requires a primary source that supports the claim and was available by the claim date.",
      );
    }
  }
}
