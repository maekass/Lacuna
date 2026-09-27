import { analyzeClaimIntegrity } from "@/lib/oncology/claimIntegrity/analysis";
import type {
  ClaimAiDraft,
  ClaimAuditEvent,
  ClaimEvidence,
  ClaimRecord,
  ClaimReview,
  OncologyClaim,
} from "@/lib/oncology/claimIntegrity/types";

export interface ClaimFilter {
  q?: string;
  reviewStatus?: string;
  classification?: string;
  sourceType?: string;
  claimDateFrom?: string;
  claimDateTo?: string;
  evidenceCutoffFrom?: string;
  evidenceCutoffTo?: string;
}

interface MemoryState {
  claims: Map<string, OncologyClaim>;
  evidence: ClaimEvidence[];
  reviews: ClaimReview[];
  audit: ClaimAuditEvent[];
  aiDrafts: ClaimAiDraft[];
}

const state: MemoryState = {
  claims: new Map(),
  evidence: [],
  reviews: [],
  audit: [],
  aiDrafts: [],
};

/** Test and process-local registry. Production Postgres is selected separately. */
export function resetClaimMemoryStore(): void {
  state.claims.clear();
  state.evidence.length = 0;
  state.reviews.length = 0;
  state.audit.length = 0;
  state.aiDrafts.length = 0;
}

export function saveClaim(claim: OncologyClaim): void {
  state.claims.set(claim.id, claim);
}

export function getClaim(id: string): OncologyClaim | undefined {
  return state.claims.get(id);
}

export function listClaims(filter: ClaimFilter = {}): OncologyClaim[] {
  const q = filter.q?.trim().toLowerCase();
  return [...state.claims.values()]
    .filter((claim) => {
      if (filter.reviewStatus && claim.reviewStatus !== filter.reviewStatus) {
        return false;
      }
      if (
        filter.classification && claim.classification !== filter.classification
      ) {
        return false;
      }
      if (filter.sourceType && claim.claimSourceType !== filter.sourceType) {
        return false;
      }
      if (filter.claimDateFrom && claim.claimDate < filter.claimDateFrom) {
        return false;
      }
      if (filter.claimDateTo && claim.claimDate > filter.claimDateTo) {
        return false;
      }
      if (
        filter.evidenceCutoffFrom &&
        claim.evidenceCutoffDate < filter.evidenceCutoffFrom
      ) {
        return false;
      }
      if (
        filter.evidenceCutoffTo &&
        claim.evidenceCutoffDate > filter.evidenceCutoffTo
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        claim.exactClaim,
        claim.companyId,
        claim.assetId,
        claim.indication,
        claim.biomarker,
        claim.classification,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => b.claimDate.localeCompare(a.claimDate));
}

export function evidenceFor(claimId: string): ClaimEvidence[] {
  return state.evidence.filter((item) => item.claimId === claimId);
}

export function addEvidence(item: ClaimEvidence): void {
  state.evidence.push(item);
}

export function removeEvidence(claimId: string, evidenceId: string): boolean {
  const index = state.evidence.findIndex((item) =>
    item.id === evidenceId && item.claimId === claimId
  );
  if (index < 0) return false;
  state.evidence.splice(index, 1);
  return true;
}

export function addReview(review: ClaimReview): void {
  state.reviews.push(review);
}

export function reviewsFor(claimId: string): ClaimReview[] {
  return state.reviews.filter((item) => item.claimId === claimId);
}

export function addAudit(event: ClaimAuditEvent): void {
  state.audit.push(event);
}

export function auditFor(claimId: string): ClaimAuditEvent[] {
  return state.audit.filter((item) => item.claimId === claimId);
}

export function addAiDraft(draft: ClaimAiDraft): void {
  state.aiDrafts.push(draft);
}

export function aiDraftsFor(claimId: string): ClaimAiDraft[] {
  return state.aiDrafts.filter((item) => item.claimId === claimId);
}

export function toClaimRecord(claim: OncologyClaim): ClaimRecord {
  const evidence = evidenceFor(claim.id);
  return {
    claim,
    evidence,
    reviews: reviewsFor(claim.id),
    audit: auditFor(claim.id),
    aiDrafts: aiDraftsFor(claim.id),
    analysis: analyzeClaimIntegrity(claim, evidence),
  };
}
