import type {
  ClaimClassification,
  EvidenceRelationship,
  ReviewStatus,
  SourceType,
} from "@/lib/oncology/claimIntegrity/types";

export const CLASSIFICATION_LABELS: Record<ClaimClassification, string> = {
  unreviewed: "Unreviewed",
  substantiated: "Substantiated",
  partially_substantiated: "Partially substantiated",
  insufficient_public_evidence: "Insufficient public evidence",
  material_context_omitted: "Material context may be missing",
  inconsistent_with_source_evidence: "Inconsistent with source evidence",
  cross_trial_comparison_limitation: "Cross-trial comparison limitation",
  post_hoc_or_subgroup_dependence: "Post hoc or subgroup dependence",
  regulatory_characterization_unclear:
    "Regulatory characterization could not be verified",
  requires_expert_review: "Requires specialist review",
};

export const RELATIONSHIP_LABELS: Record<EvidenceRelationship, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  contextualizes: "Contextualizes",
  subsequent_evidence: "Subsequent evidence",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  archived: "Archived",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  clinical_trial_registry: "Clinical trial registry",
  peer_reviewed_publication: "Peer-reviewed publication",
  regulatory_document: "Regulatory document",
  company_filing: "Company filing",
  investor_presentation: "Investor presentation",
  press_release: "Press release",
  conference_abstract: "Conference abstract",
  patent: "Patent",
  reimbursement_source: "Reimbursement source",
  other: "Other",
};
