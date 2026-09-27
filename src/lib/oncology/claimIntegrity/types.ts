/**
 * Oncology claim-integrity records. Classifications describe evidence
 * consistency only. They are not fraud, intent, clinical, or investment findings.
 */

export const CLAIM_CLASSIFICATIONS = [
  "unreviewed",
  "substantiated",
  "partially_substantiated",
  "insufficient_public_evidence",
  "material_context_omitted",
  "inconsistent_with_source_evidence",
  "cross_trial_comparison_limitation",
  "post_hoc_or_subgroup_dependence",
  "regulatory_characterization_unclear",
  "requires_expert_review",
] as const;

export type ClaimClassification = (typeof CLAIM_CLASSIFICATIONS)[number];

export const EVIDENCE_RELATIONSHIPS = [
  "supports",
  "contradicts",
  "contextualizes",
  "subsequent_evidence",
] as const;

export type EvidenceRelationship = (typeof EVIDENCE_RELATIONSHIPS)[number];

export const REVIEW_STATUSES = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "archived",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const SOURCE_TYPES = [
  "clinical_trial_registry",
  "peer_reviewed_publication",
  "regulatory_document",
  "company_filing",
  "investor_presentation",
  "press_release",
  "conference_abstract",
  "patent",
  "reimbursement_source",
  "other",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const CONFIDENCE_LEVELS = ["low", "moderate", "high"] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const EVIDENCE_STRENGTHS = ["limited", "moderate", "strong"] as const;

export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const AUDIT_ACTIONS = [
  "created",
  "edited",
  "evidence_added",
  "evidence_removed",
  "submitted",
  "classification_changed",
  "changes_requested",
  "approved",
  "archived",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface OncologyClaim {
  id: string;
  companyId?: string;
  assetId?: string;
  trialId?: string;
  exactClaim: string;
  normalizedClaim?: string;
  claimSourceUrl: string;
  claimSourceTitle?: string;
  claimSourceType: SourceType;
  speakerOrIssuer?: string;
  claimDate: string;
  evidenceCutoffDate: string;
  indication?: string;
  biomarker?: string;
  modality?: string;
  developmentPhase?: string;
  classification: ClaimClassification;
  classificationRationale?: string;
  confidence?: ConfidenceLevel;
  reviewStatus: ReviewStatus;
  reviewerId?: string;
  reviewedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEvidence {
  id: string;
  claimId: string;
  relationship: EvidenceRelationship;
  sourceType: SourceType;
  title: string;
  url: string;
  publisher?: string;
  publicationDate?: string;
  accessedAt: string;
  quotedExcerpt?: string;
  analystSummary: string;
  primarySource: boolean;
  availableByClaimDate: boolean;
  evidenceStrength?: EvidenceStrength;
  limitations?: string;
  createdBy: string;
  createdAt: string;
}

export interface ClaimAuditEvent {
  id: string;
  claimId: string;
  actorId: string;
  action: AuditAction;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface ClaimReview {
  id: string;
  claimId: string;
  actorId: string;
  decision: "submitted" | "changes_requested" | "approved" | "archived";
  rationale?: string;
  classification?: ClaimClassification;
  createdAt: string;
}

export interface ClaimAiDraft {
  id: string;
  claimId: string;
  task:
    | "extract_claim"
    | "suggest_fields"
    | "summarize_evidence"
    | "note_inconsistency"
    | "missing_evidence_questions";
  model: string;
  promptVersion: string;
  inputSourceIds: string[];
  draftText: string;
  humanDecision: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface ClaimIntegrityAnalysis {
  claimId: string;
  suggestedClassification: ClaimClassification;
  reasons: string[];
  missingEvidence: string[];
  contradictoryEvidenceIds: string[];
  supportingEvidenceIds: string[];
  subsequentEvidenceIds: string[];
  temporalWarnings: string[];
  requiresHumanReview: true;
}

export interface ClaimRecord {
  claim: OncologyClaim;
  evidence: ClaimEvidence[];
  reviews: ClaimReview[];
  audit: ClaimAuditEvent[];
  aiDrafts: ClaimAiDraft[];
  analysis: ClaimIntegrityAnalysis;
}

export const CLAIM_INTEGRITY_DISCLOSURE =
  "Lacuna evaluates the consistency of selected public claims with available evidence. It does not determine intent, fraud, legal liability, clinical validity, or investment merit. Findings require qualified human review.";
