import type {
  EvidenceStatus,
  ReimbursementClaim,
  ReviewDecision,
  ReviewerRole,
} from "./schema";

export type WorkflowActor = ReviewerRole | "machine";

const terminalStatuses = new Set<EvidenceStatus>(["rejected", "superseded"]);

const allowedTransitions: Record<EvidenceStatus, readonly EvidenceStatus[]> = {
  machine_proposed: ["source_verified", "rejected", "insufficient_evidence"],
  source_verified: [
    "specialist_reviewed",
    "rejected",
    "insufficient_evidence",
    "superseded",
  ],
  specialist_reviewed: [
    "approved",
    "rejected",
    "insufficient_evidence",
    "superseded",
  ],
  approved: ["published", "superseded"],
  published: ["superseded"],
  rejected: [],
  superseded: [],
  insufficient_evidence: ["machine_proposed"],
};

const actorPermissions: Record<WorkflowActor, readonly EvidenceStatus[]> = {
  machine: ["machine_proposed"],
  source_reviewer: [
    "source_verified",
    "rejected",
    "insufficient_evidence",
  ],
  coding_reimbursement_specialist: [
    "specialist_reviewed",
    "rejected",
    "insufficient_evidence",
    "superseded",
  ],
  policy_reviewer: [
    "approved",
    "published",
    "rejected",
    "insufficient_evidence",
    "superseded",
  ],
  admin: [
    "machine_proposed",
    "source_verified",
    "specialist_reviewed",
    "approved",
    "published",
    "rejected",
    "insufficient_evidence",
    "superseded",
  ],
};

export interface TransitionCheck {
  ok: boolean;
  reasons: string[];
}

export function getAllowedTargets(
  status: EvidenceStatus,
): readonly EvidenceStatus[] {
  return allowedTransitions[status];
}

export function canTransitionEvidenceStatus(
  from: EvidenceStatus,
  to: EvidenceStatus,
  actor: WorkflowActor,
): TransitionCheck {
  const reasons: string[] = [];

  if (from === to) {
    reasons.push("Evidence status must change during a workflow transition.");
  }

  if (terminalStatuses.has(from)) {
    reasons.push(`${from} is terminal and cannot transition.`);
  }

  if (!allowedTransitions[from].includes(to)) {
    reasons.push(`Transition ${from} -> ${to} is not allowed.`);
  }

  if (!actorPermissions[actor].includes(to)) {
    reasons.push(`${actor} is not permitted to set status ${to}.`);
  }

  if (actor === "machine" && to !== "machine_proposed") {
    reasons.push(
      "Machine actors may only create or reopen machine_proposed evidence.",
    );
  }

  return { ok: reasons.length === 0, reasons };
}

function decisionForTarget(
  to: EvidenceStatus,
): ReviewDecision["decision"] {
  switch (to) {
    case "rejected":
      return "reject";
    case "insufficient_evidence":
      return "needs_more_evidence";
    case "superseded":
      return "supersede";
    default:
      return "approve";
  }
}

export interface TransitionClaimInput {
  claim: ReimbursementClaim;
  to: EvidenceStatus;
  actor: WorkflowActor;
  reviewId: string;
  reviewedAt: string;
  note?: string;
}

export interface TransitionClaimResult {
  claim: ReimbursementClaim;
  review: ReviewDecision | null;
}

/**
 * Pure state transition helper. Persistence is intentionally delegated to the
 * caller so this core remains portable across Lacuna and future adapters.
 */
export function transitionClaim({
  claim,
  to,
  actor,
  reviewId,
  reviewedAt,
  note,
}: TransitionClaimInput): TransitionClaimResult {
  const check = canTransitionEvidenceStatus(claim.status, to, actor);
  if (!check.ok) {
    throw new Error(check.reasons.join(" "));
  }

  const updatedClaim: ReimbursementClaim = {
    ...claim,
    status: to,
    updatedAt: reviewedAt,
  };

  if (actor === "machine") {
    return { claim: updatedClaim, review: null };
  }

  return {
    claim: updatedClaim,
    review: {
      id: reviewId,
      claimId: claim.id,
      reviewerRole: actor,
      fromStatus: claim.status,
      toStatus: to,
      decision: decisionForTarget(to),
      ...(note ? { note } : {}),
      reviewedAt,
    },
  };
}
