import type {
  EvidenceStatus,
  ReimbursementClaim,
  ReimbursementSource,
  ReviewDecision,
  ReviewerRole,
} from "./schema";

export type WorkflowActor = ReviewerRole | "machine";

const terminalStatuses = new Set<EvidenceStatus>(["rejected", "superseded"]);

const historicalBranchStatuses = new Set<EvidenceStatus>([
  "insufficient_evidence",
  "rejected",
  "superseded",
]);

const sourceOriginRequiredStatuses = new Set<EvidenceStatus>([
  "specialist_reviewed",
  "approved",
  "published",
]);

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
  sourcesById?: ReadonlyMap<string, ReimbursementSource>;
}

export interface ReviewChainIssue {
  code: string;
  message: string;
}

export interface TransitionClaimResult {
  claim: ReimbursementClaim;
  review: ReviewDecision | null;
}

function assertSourceVerifiedPreconditions(
  claim: ReimbursementClaim,
  sourcesById?: ReadonlyMap<string, ReimbursementSource>,
): void {
  if (claim.sourceIds.length === 0) {
    throw new Error("source_verified requires at least one attached source.");
  }
  if (!sourcesById) return;
  const unknown = claim.sourceIds.filter((sourceId) =>
    !sourcesById.has(sourceId)
  );
  if (unknown.length > 0) {
    throw new Error(
      `source_verified references unknown source IDs: ${unknown.join(", ")}.`,
    );
  }
}

/**
 * Reconstruct a claim's ordered review history. Adjacent hops must be legal
 * for the recorded actor, and the last hop must land on the claim status.
 */
function compareReviewsNewestFirst(
  a: ReviewDecision,
  b: ReviewDecision,
): number {
  const time = Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt);
  if (time !== 0) return time;
  return b.id.localeCompare(a.id);
}

/**
 * Walk backward from the claim's current status so equal timestamps do not
 * reverse a legal specialist → policy chain.
 */
function reconstructReviewPath(
  claimStatus: EvidenceStatus,
  reviews: readonly ReviewDecision[],
): { ordered: ReviewDecision[]; leftover: ReviewDecision[] } {
  const remaining = new Set(reviews);
  const ordered: ReviewDecision[] = [];
  let currentTo: EvidenceStatus = claimStatus;

  while (remaining.size > 0) {
    const candidates = [...remaining]
      .filter((review) => review.toStatus === currentTo)
      .sort(compareReviewsNewestFirst);
    const picked = candidates[0];
    if (!picked) break;
    ordered.unshift(picked);
    remaining.delete(picked);
    currentTo = picked.fromStatus;
  }

  return { ordered, leftover: [...remaining] };
}

/**
 * Prior insufficient_evidence / rejected / superseded attempts stay in the
 * ledger as audit history. They are not gaps on a later active path.
 */
function leftoverAfterHistoricalBranches(
  leftover: ReviewDecision[],
): ReviewDecision[] {
  const remaining = new Set(leftover);
  const terminals = leftover
    .filter((review) => historicalBranchStatuses.has(review.toStatus))
    .sort(compareReviewsNewestFirst);

  for (const terminal of terminals) {
    if (!remaining.has(terminal)) continue;
    const { ordered } = reconstructReviewPath(terminal.toStatus, [
      ...remaining,
    ]);
    for (const review of ordered) remaining.delete(review);
  }

  return [...remaining];
}

function hasSourceOrigin(ordered: readonly ReviewDecision[]): boolean {
  const first = ordered[0];
  return Boolean(
    first &&
      first.fromStatus === "machine_proposed" &&
      first.toStatus === "source_verified" &&
      first.decision === "approve" &&
      (first.reviewerRole === "source_reviewer" ||
        first.reviewerRole === "admin"),
  );
}

export function validateReviewChain(
  claim: ReimbursementClaim,
  reviews: readonly ReviewDecision[],
): ReviewChainIssue[] {
  const claimReviews = reviews.filter((review) => review.claimId === claim.id);
  if (claimReviews.length === 0) return [];

  const issues: ReviewChainIssue[] = [];
  const { ordered, leftover } = reconstructReviewPath(
    claim.status,
    claimReviews,
  );

  for (const review of claimReviews) {
    const check = canTransitionEvidenceStatus(
      review.fromStatus,
      review.toStatus,
      review.reviewerRole,
    );
    if (!check.ok) {
      issues.push({
        code: "illegal_review_transition",
        message: `Review ${review.id}: ${check.reasons.join(" ")}`,
      });
    }
    if (review.decision !== decisionForTarget(review.toStatus)) {
      issues.push({
        code: "review_decision_mismatch",
        message:
          `Review ${review.id} decision ${review.decision} does not match target ${review.toStatus}.`,
      });
    }
  }

  const leftoverGaps = leftoverAfterHistoricalBranches(leftover);
  for (const review of leftoverGaps) {
    issues.push({
      code: "review_chain_gap",
      message:
        `Review ${review.id} is not on the contiguous path that ends at ${claim.status}.`,
    });
  }

  for (let index = 0; index < ordered.length - 1; index++) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (!current || !next) continue;
    if (Date.parse(next.reviewedAt) < Date.parse(current.reviewedAt)) {
      issues.push({
        code: "review_chain_chronology",
        message:
          `Review ${next.id} at ${next.reviewedAt} precedes prerequisite ${current.id} at ${current.reviewedAt}. Equal timestamps stay ordered by workflow status, then review id.`,
      });
    }
  }

  const reopenedInitialState = claim.status === "machine_proposed" &&
    ordered.length === 0 &&
    leftoverGaps.length === 0;

  const last = ordered[ordered.length - 1];
  if (
    !reopenedInitialState &&
    (!last || last.toStatus !== claim.status)
  ) {
    issues.push({
      code: "review_chain_status_mismatch",
      message: `Review chain does not reach claim status ${claim.status}.`,
    });
  }

  if (
    sourceOriginRequiredStatuses.has(claim.status) && !hasSourceOrigin(ordered)
  ) {
    issues.push({
      code: "missing_source_review",
      message:
        `${claim.status} requires a recorded machine_proposed → source_verified review by a source reviewer or admin.`,
    });
  }

  if (claim.status === "published") {
    const publishedHop = ordered.find((review) =>
      review.fromStatus === "approved" &&
      review.toStatus === "published" &&
      review.decision === "approve"
    );
    if (!publishedHop) {
      issues.push({
        code: "missing_publish_transition",
        message:
          "published claims require an explicit approved → published review.",
      });
    }
  }

  return issues;
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
  sourcesById,
}: TransitionClaimInput): TransitionClaimResult {
  const check = canTransitionEvidenceStatus(claim.status, to, actor);
  if (!check.ok) {
    throw new Error(check.reasons.join(" "));
  }

  if (to === "source_verified") {
    assertSourceVerifiedPreconditions(claim, sourcesById);
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
