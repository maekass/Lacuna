import { isWriteCapableReviewActor } from "@/lib/infra/reviewAuth";
import type { ReviewActor } from "@/lib/infra/reviewSession";
import { analyzeClaimIntegrity } from "@/lib/oncology/claimIntegrity/analysis";
import {
  addAiDraft,
  addAudit,
  addEvidence,
  addReview,
  type ClaimFilter,
  evidenceFor,
  getClaim,
  listClaims,
  removeEvidence,
  saveClaim,
  toClaimRecord,
} from "@/lib/oncology/claimIntegrity/memoryStore";
import {
  assertCanApprove,
  assertCanAttachEvidence,
  assertCanEdit,
  assertFinalClassification,
  assertWriteActor,
  ClaimReviewError,
} from "@/lib/oncology/claimIntegrity/reviewPolicy";
import type {
  ClaimAiDraft,
  ClaimClassification,
  ClaimRecord,
  ConfidenceLevel,
  OncologyClaim,
} from "@/lib/oncology/claimIntegrity/types";
import {
  assertClassification,
  assertConfidence,
  type ClaimDraftInput,
  type EvidenceDraftInput,
  validateClaimDraft,
  validateEvidenceDraft,
} from "@/lib/oncology/claimIntegrity/validation";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function actorRef(actor: ReviewActor) {
  return {
    id: actor.id,
    writeCapable: isWriteCapableReviewActor(actor),
  };
}

function touch(claim: OncologyClaim): OncologyClaim {
  return { ...claim, updatedAt: nowIso() };
}

export function createOncologyClaim(
  actor: ReviewActor,
  input: ClaimDraftInput,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const draft = validateClaimDraft(input);
  const timestamp = nowIso();
  const claim: OncologyClaim = {
    id: newId(),
    ...draft,
    classification: "unreviewed",
    reviewStatus: "draft",
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  saveClaim(claim);
  addAudit({
    id: newId(),
    claimId: claim.id,
    actorId: actor.id,
    action: "created",
    newValue: { exactClaim: claim.exactClaim },
    createdAt: timestamp,
  });
  return toClaimRecord(claim);
}

export function updateOncologyClaim(
  actor: ReviewActor,
  id: string,
  input: ClaimDraftInput,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const current = requireClaim(id);
  assertCanEdit(current.reviewStatus);
  const draft = validateClaimDraft({
    ...input,
    exactClaim: input.exactClaim ?? current.exactClaim,
  });
  const next = touch({
    ...current,
    ...draft,
    exactClaim: draft.exactClaim,
    classification: "unreviewed",
    classificationRationale: undefined,
    confidence: undefined,
    reviewerId: undefined,
    reviewedAt: undefined,
  });
  saveClaim(next);
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "edited",
    previousValue: { exactClaim: current.exactClaim },
    newValue: { exactClaim: next.exactClaim },
    createdAt: next.updatedAt,
  });
  return toClaimRecord(next);
}

export function attachClaimEvidence(
  actor: ReviewActor,
  claimId: string,
  input: EvidenceDraftInput,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const claim = requireClaim(claimId);
  assertCanAttachEvidence(claim.reviewStatus);
  const draft = validateEvidenceDraft(input, claim);
  const item = {
    id: newId(),
    claimId,
    ...draft,
    accessedAt: nowIso(),
    createdBy: actor.id,
    createdAt: nowIso(),
  };
  addEvidence(item);
  addAudit({
    id: newId(),
    claimId,
    actorId: actor.id,
    action: "evidence_added",
    newValue: { evidenceId: item.id, relationship: item.relationship },
    createdAt: item.createdAt,
  });
  const next = touch(claim);
  saveClaim(next);
  return toClaimRecord(next);
}

export function detachClaimEvidence(
  actor: ReviewActor,
  claimId: string,
  evidenceId: string,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const claim = requireClaim(claimId);
  assertCanAttachEvidence(claim.reviewStatus);
  const removed = removeEvidence(claimId, evidenceId);
  if (!removed) {
    throw new ClaimReviewError("Evidence record was not found.", 404);
  }
  addAudit({
    id: newId(),
    claimId,
    actorId: actor.id,
    action: "evidence_removed",
    previousValue: { evidenceId },
    createdAt: nowIso(),
  });
  const next = touch(claim);
  saveClaim(next);
  return toClaimRecord(next);
}

export function readClaim(id: string): ClaimRecord {
  return toClaimRecord(requireClaim(id));
}

export function searchClaims(filter: ClaimFilter): OncologyClaim[] {
  return listClaims(filter);
}

export function compareClaim(id: string) {
  const claim = requireClaim(id);
  return analyzeClaimIntegrity(claim, evidenceFor(id));
}

export function submitClaim(actor: ReviewActor, id: string): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const claim = requireClaim(id);
  if (
    claim.reviewStatus !== "draft" &&
    claim.reviewStatus !== "changes_requested"
  ) {
    throw new ClaimReviewError(
      "This record is not waiting to be submitted.",
      409,
    );
  }
  const timestamp = nowIso();
  const next = touch({ ...claim, reviewStatus: "pending_review" });
  saveClaim(next);
  addReview({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    decision: "submitted",
    createdAt: timestamp,
  });
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "submitted",
    previousValue: { reviewStatus: claim.reviewStatus },
    newValue: { reviewStatus: "pending_review" },
    createdAt: timestamp,
  });
  return toClaimRecord(next);
}

export function requestClaimChanges(
  actor: ReviewActor,
  id: string,
  rationale: string,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const note = rationale.trim();
  if (!note) throw new ClaimReviewError("Reviewer rationale is required.");
  const claim = requireClaim(id);
  if (claim.reviewStatus !== "pending_review") {
    throw new ClaimReviewError(
      "Changes can be requested while a record is pending review.",
      409,
    );
  }
  const timestamp = nowIso();
  const next = touch({ ...claim, reviewStatus: "changes_requested" });
  saveClaim(next);
  addReview({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    decision: "changes_requested",
    rationale: note,
    createdAt: timestamp,
  });
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "changes_requested",
    newValue: { rationale: note },
    createdAt: timestamp,
  });
  return toClaimRecord(next);
}

export function approveClaim(
  actor: ReviewActor,
  id: string,
  input: {
    classification: string;
    rationale: string;
    confidence?: string;
  },
): ClaimRecord {
  const claim = requireClaim(id);
  assertCanApprove(actorRef(actor), claim.createdBy);
  if (claim.reviewStatus !== "pending_review") {
    throw new ClaimReviewError(
      "Approval is available when the record is pending review.",
      409,
    );
  }
  const rationale = input.rationale?.trim() ?? "";
  if (!rationale) throw new ClaimReviewError("Reviewer rationale is required.");
  const classification = assertClassification(input.classification);
  const confidence: ConfidenceLevel | undefined = input.confidence
    ? assertConfidence(input.confidence)
    : undefined;
  const evidence = evidenceFor(id);
  assertFinalClassification({ classification, evidence });
  const timestamp = nowIso();
  const next = touch({
    ...claim,
    classification,
    classificationRationale: rationale,
    confidence,
    reviewStatus: "approved",
    reviewerId: actor.id,
    reviewedAt: timestamp,
  });
  saveClaim(next);
  addReview({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    decision: "approved",
    rationale,
    classification,
    createdAt: timestamp,
  });
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "classification_changed",
    previousValue: { classification: claim.classification },
    newValue: { classification },
    createdAt: timestamp,
  });
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "approved",
    newValue: { classification, reviewerId: actor.id },
    createdAt: timestamp,
  });
  return toClaimRecord(next);
}

export function archiveClaim(
  actor: ReviewActor,
  id: string,
  rationale: string,
): ClaimRecord {
  assertWriteActor(actorRef(actor));
  const note = rationale.trim();
  if (!note) throw new ClaimReviewError("Reviewer rationale is required.");
  const claim = requireClaim(id);
  if (claim.reviewStatus === "archived") {
    throw new ClaimReviewError("This record is already archived.", 409);
  }
  const timestamp = nowIso();
  const next = touch({ ...claim, reviewStatus: "archived" });
  saveClaim(next);
  addReview({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    decision: "archived",
    rationale: note,
    createdAt: timestamp,
  });
  addAudit({
    id: newId(),
    claimId: id,
    actorId: actor.id,
    action: "archived",
    previousValue: { reviewStatus: claim.reviewStatus },
    newValue: { reviewStatus: "archived" },
    createdAt: timestamp,
  });
  return toClaimRecord(next);
}

export function storeAiDraft(
  actor: ReviewActor,
  claimId: string,
  input: {
    task: ClaimAiDraft["task"];
    model: string;
    promptVersion: string;
    inputSourceIds?: string[];
    draftText: string;
  },
): ClaimAiDraft {
  assertWriteActor(actorRef(actor));
  requireClaim(claimId);
  const draftText = input.draftText?.trim() ?? "";
  if (!draftText) throw new ClaimReviewError("AI draft text is required.");
  if (!input.model?.trim() || !input.promptVersion?.trim()) {
    throw new ClaimReviewError("Model and prompt version are required.");
  }
  const draft: ClaimAiDraft = {
    id: newId(),
    claimId,
    task: input.task,
    model: input.model.trim(),
    promptVersion: input.promptVersion.trim(),
    inputSourceIds: input.inputSourceIds ?? [],
    draftText,
    humanDecision: "pending",
    createdAt: nowIso(),
  };
  addAiDraft(draft);
  return draft;
}

function requireClaim(id: string): OncologyClaim {
  const claim = getClaim(id);
  if (!claim) throw new ClaimReviewError("Claim was not found.", 404);
  return claim;
}

export function claimErrorStatus(error: unknown): number {
  if (error instanceof ClaimReviewError) return error.status;
  return 400;
}

export type { ClaimClassification };
