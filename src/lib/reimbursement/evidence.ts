export type EvidenceStatus =
  | "machine_proposed"
  | "source_verified"
  | "specialist_reviewed"
  | "approved"
  | "published"
  | "rejected"
  | "superseded"
  | "insufficient_evidence";

export type EvidenceStrength = "primary" | "peer_reviewed" | "secondary" | "discovery_only";

export type EconomicUnit =
  | "rvu"
  | "rvu_per_hour"
  | "allowed_amount"
  | "fee_schedule_payment"
  | "reimbursement_per_hour"
  | "modeled_exposure";

export interface ReimbursementSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  accessedAt: string;
  sourceType: EvidenceStrength;
  locator?: string;
  sha256?: string;
}

export interface ReimbursementClaim {
  id: string;
  issueId: string;
  statement: string;
  status: EvidenceStatus;
  sourceIds: string[];
  economicUnit?: EconomicUnit;
  payer?: string;
  dataYear?: number;
  ruleCycle?: string;
  placeOfService?: string;
  codeSystem?: "CPT" | "HCPCS";
  codes?: string[];
  reviewerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeRateObservation {
  id: string;
  code: string;
  codeSystem: "CPT" | "HCPCS";
  dataYear: number;
  payer: "Medicare" | string;
  locality?: string;
  placeOfService: "facility" | "nonfacility" | string;
  workRvu?: number;
  practiceExpenseRvu?: number;
  malpracticeRvu?: number;
  conversionFactor?: number;
  paymentAmount?: number;
  sourceId: string;
  status: Extract<EvidenceStatus, "source_verified" | "specialist_reviewed" | "approved" | "published">;
}

export interface ReviewDecision {
  id: string;
  claimId: string;
  reviewerRole: "source_reviewer" | "coding_reimbursement_specialist" | "policy_reviewer" | string;
  decision: "approve" | "reject" | "needs_more_evidence";
  note?: string;
  reviewedAt: string;
}

export interface ReimbursementIssue {
  id: string;
  title: string;
  question: string;
  status: EvidenceStatus;
  ruleCycle?: string;
  priority?: "high" | "medium" | "low";
  claimIds: string[];
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceLedger {
  issues: ReimbursementIssue[];
  claims: ReimbursementClaim[];
  sources: ReimbursementSource[];
  codeRates: CodeRateObservation[];
  reviews: ReviewDecision[];
}

const publishableStatuses: EvidenceStatus[] = ["approved", "published"];

export function isPublishableClaim(claim: ReimbursementClaim): boolean {
  return publishableStatuses.includes(claim.status) && claim.sourceIds.length > 0;
}

export function validateClaimForApproval(
  claim: ReimbursementClaim,
  sources: ReimbursementSource[],
): string[] {
  const errors: string[] = [];
  const knownSourceIds = new Set(sources.map((source) => source.id));

  if (!claim.statement.trim()) errors.push("Claim statement is required.");
  if (claim.sourceIds.length === 0) errors.push("At least one source is required.");
  if (claim.sourceIds.some((sourceId) => !knownSourceIds.has(sourceId))) {
    errors.push("Claim references one or more unknown sources.");
  }
  if (claim.economicUnit === "modeled_exposure" && !claim.reviewerNote) {
    errors.push("Modeled exposure requires an explicit assumptions/reviewer note.");
  }

  return errors;
}
