import type { EvidenceStatus } from "@/lib/reimbursement/schema";
import { assessPublicationAt } from "@/lib/evidenceGraph/temporal";
import type { EvidenceLane, EvidencePassage } from "./contracts";

const RESEARCH_DRAFT_STATES = [
  "source_verified",
  "specialist_reviewed",
  "approved",
  "published",
] as const satisfies readonly EvidenceStatus[];

const PUBLICATION_STATES = [
  "approved",
  "published",
] as const satisfies readonly EvidenceStatus[];

const BLOCKED_STATES = new Set<EvidenceStatus>([
  "machine_proposed",
  "rejected",
  "superseded",
  "insufficient_evidence",
]);

export interface EvidenceRetrievalScope {
  asOfDate: string;
  lane: EvidenceLane;
  geographyCode?: string;
  payer?: string;
  setting?: string;
  dataYear?: number;
}

export function reviewStatesForLane(
  lane: EvidenceLane,
): readonly EvidenceStatus[] {
  return lane === "publication" ? PUBLICATION_STATES : RESEARCH_DRAFT_STATES;
}

export interface AdmissibilityDecision {
  admissible: boolean;
  reason: string;
}

/**
 * Filters run before ranking. Unknown publication dates are not historical
 * evidence. Superseded, revoked, and non-approved claim states never pass.
 */
export function assessPassageAdmissibility(
  passage: EvidencePassage,
  scope: EvidenceRetrievalScope,
): AdmissibilityDecision {
  if (passage.supersessionStatus !== "current") {
    return {
      admissible: false,
      reason: `Passage ${passage.passageId} is ${passage.supersessionStatus}.`,
    };
  }

  if (BLOCKED_STATES.has(passage.reviewState)) {
    return {
      admissible: false,
      reason:
        `Review state ${passage.reviewState} is not eligible evidence for ${passage.passageId}.`,
    };
  }

  if (passage.redistribution !== "public") {
    return {
      admissible: false,
      reason:
        `Redistribution ${passage.redistribution} is not authorized for generation.`,
    };
  }

  const temporal = assessPublicationAt(passage.publishedAt, scope.asOfDate);
  if (temporal.status !== "admissible") {
    return { admissible: false, reason: temporal.reason };
  }

  const allowed = new Set(reviewStatesForLane(scope.lane));
  if (!allowed.has(passage.reviewState)) {
    return {
      admissible: false,
      reason:
        `Review state ${passage.reviewState} is outside the ${scope.lane} lane.`,
    };
  }

  if (
    scope.lane === "publication" && passage.passageRole !== "approved_claim"
  ) {
    return {
      admissible: false,
      reason:
        "Publication lane admits approved claims only. Source registration is not claim approval.",
    };
  }

  if (
    scope.geographyCode &&
    passage.geography?.code !== scope.geographyCode
  ) {
    return {
      admissible: false,
      reason: "Geography does not match the requested scope.",
    };
  }

  if (scope.payer && passage.payer !== scope.payer) {
    return {
      admissible: false,
      reason: "Payer does not match the requested scope.",
    };
  }

  if (scope.setting && passage.setting !== scope.setting) {
    return {
      admissible: false,
      reason: "Setting does not match the requested scope.",
    };
  }

  if (
    scope.dataYear !== undefined && passage.dataYear !== scope.dataYear
  ) {
    return {
      admissible: false,
      reason: "Data year does not match the requested scope.",
    };
  }

  return { admissible: true, reason: temporal.reason };
}

export function filterAdmissiblePassages(
  passages: readonly EvidencePassage[],
  scope: EvidenceRetrievalScope,
): EvidencePassage[] {
  return passages.filter(
    (passage) => assessPassageAdmissibility(passage, scope).admissible,
  );
}
