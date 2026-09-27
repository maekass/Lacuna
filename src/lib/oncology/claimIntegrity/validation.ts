import {
  CLAIM_CLASSIFICATIONS,
  type ClaimClassification,
  type ClaimEvidence,
  CONFIDENCE_LEVELS,
  type ConfidenceLevel,
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_STRENGTHS,
  type EvidenceRelationship,
  type EvidenceStrength,
  type OncologyClaim,
  SOURCE_TYPES,
  type SourceType,
} from "@/lib/oncology/claimIntegrity/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ClaimValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimValidationError";
  }
}

export function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if ((allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ClaimValidationError(`${label} is not a supported value.`);
}

/** http(s) URLs only. Rejects javascript, data, and protocol-relative URLs. */
export function assertHttpUrl(value: string, label: string): string {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ClaimValidationError(`${label} must be an http(s) URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ClaimValidationError(`${label} must be an http(s) URL.`);
  }
  if (!parsed.hostname) {
    throw new ClaimValidationError(`${label} must include a host.`);
  }
  return trimmed;
}

export function assertIsoDate(value: string, label: string): string {
  if (!ISO_DATE.test(value)) {
    throw new ClaimValidationError(`${label} must be YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ClaimValidationError(`${label} is not a valid date.`);
  }
  return value;
}

export interface ClaimDraftInput {
  companyId?: string;
  assetId?: string;
  trialId?: string;
  exactClaim: string;
  normalizedClaim?: string;
  claimSourceUrl: string;
  claimSourceTitle?: string;
  claimSourceType: string;
  speakerOrIssuer?: string;
  claimDate: string;
  evidenceCutoffDate: string;
  indication?: string;
  biomarker?: string;
  modality?: string;
  developmentPhase?: string;
}

export function validateClaimDraft(input: ClaimDraftInput): {
  exactClaim: string;
  normalizedClaim?: string;
  claimSourceUrl: string;
  claimSourceTitle?: string;
  claimSourceType: SourceType;
  speakerOrIssuer?: string;
  claimDate: string;
  evidenceCutoffDate: string;
  companyId?: string;
  assetId?: string;
  trialId?: string;
  indication?: string;
  biomarker?: string;
  modality?: string;
  developmentPhase?: string;
} {
  const exactClaim = input.exactClaim?.trim() ?? "";
  if (!exactClaim) {
    throw new ClaimValidationError("exactClaim is required.");
  }
  const claimDate = assertIsoDate(input.claimDate ?? "", "claimDate");
  const evidenceCutoffDate = assertIsoDate(
    input.evidenceCutoffDate ?? "",
    "evidenceCutoffDate",
  );
  if (evidenceCutoffDate < claimDate) {
    throw new ClaimValidationError(
      "evidenceCutoffDate cannot precede claimDate.",
    );
  }
  const optional = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    exactClaim,
    normalizedClaim: optional(input.normalizedClaim),
    claimSourceUrl: assertHttpUrl(input.claimSourceUrl ?? "", "claimSourceUrl"),
    claimSourceTitle: optional(input.claimSourceTitle),
    claimSourceType: assertEnum(
      input.claimSourceType,
      SOURCE_TYPES,
      "claimSourceType",
    ),
    speakerOrIssuer: optional(input.speakerOrIssuer),
    claimDate,
    evidenceCutoffDate,
    companyId: optional(input.companyId),
    assetId: optional(input.assetId),
    trialId: optional(input.trialId),
    indication: optional(input.indication),
    biomarker: optional(input.biomarker),
    modality: optional(input.modality),
    developmentPhase: optional(input.developmentPhase),
  };
}

export interface EvidenceDraftInput {
  relationship: string;
  sourceType: string;
  title: string;
  url: string;
  publisher?: string;
  publicationDate?: string;
  quotedExcerpt?: string;
  analystSummary: string;
  primarySource: boolean;
  evidenceStrength?: string;
  limitations?: string;
}

/**
 * Publication after the evidence cutoff is stored as subsequent evidence.
 * Availability uses the claim date, not later publications.
 */
export function resolveEvidenceTiming(input: {
  relationship: EvidenceRelationship;
  publicationDate?: string;
  claimDate: string;
  evidenceCutoffDate: string;
}): {
  relationship: EvidenceRelationship;
  availableByClaimDate: boolean;
  temporalWarning?: string;
} {
  if (!input.publicationDate) {
    return {
      relationship: input.relationship,
      availableByClaimDate: false,
      temporalWarning:
        "Publication date is missing, so this record is not treated as available on the claim date.",
    };
  }
  const publicationDate = assertIsoDate(
    input.publicationDate,
    "publicationDate",
  );
  if (publicationDate > input.evidenceCutoffDate) {
    return {
      relationship: "subsequent_evidence",
      availableByClaimDate: false,
      temporalWarning:
        "Publication date is after the evidence cutoff. The record is labeled subsequent evidence and is excluded from the as-of comparison.",
    };
  }
  return {
    relationship: input.relationship,
    availableByClaimDate: publicationDate <= input.claimDate,
    temporalWarning: publicationDate > input.claimDate
      ? "Publication date is after the claim date and on or before the evidence cutoff. It is not marked available by the claim date."
      : undefined,
  };
}

export function validateEvidenceDraft(
  input: EvidenceDraftInput,
  claim: Pick<OncologyClaim, "claimDate" | "evidenceCutoffDate">,
): Omit<
  ClaimEvidence,
  "id" | "claimId" | "accessedAt" | "createdBy" | "createdAt"
> {
  const title = input.title?.trim() ?? "";
  const analystSummary = input.analystSummary?.trim() ?? "";
  if (!title) throw new ClaimValidationError("Evidence title is required.");
  if (!analystSummary) {
    throw new ClaimValidationError("Analyst summary is required.");
  }
  const requested = assertEnum(
    input.relationship,
    EVIDENCE_RELATIONSHIPS,
    "relationship",
  );
  const publicationDate = input.publicationDate?.trim()
    ? assertIsoDate(input.publicationDate, "publicationDate")
    : undefined;
  const timing = resolveEvidenceTiming({
    relationship: requested,
    publicationDate,
    claimDate: claim.claimDate,
    evidenceCutoffDate: claim.evidenceCutoffDate,
  });
  const strength = input.evidenceStrength?.trim()
    ? assertEnum(input.evidenceStrength, EVIDENCE_STRENGTHS, "evidenceStrength")
    : undefined;
  return {
    relationship: timing.relationship,
    sourceType: assertEnum(input.sourceType, SOURCE_TYPES, "sourceType"),
    title,
    url: assertHttpUrl(input.url ?? "", "url"),
    publisher: input.publisher?.trim() || undefined,
    publicationDate,
    quotedExcerpt: input.quotedExcerpt?.trim() || undefined,
    analystSummary,
    primarySource: input.primarySource === true,
    availableByClaimDate: timing.availableByClaimDate,
    evidenceStrength: strength,
    limitations: input.limitations?.trim() || undefined,
  };
}

export function assertClassification(value: string): ClaimClassification {
  return assertEnum(value, CLAIM_CLASSIFICATIONS, "classification");
}

export function assertConfidence(value: string): ConfidenceLevel {
  return assertEnum(value, CONFIDENCE_LEVELS, "confidence");
}

export function assertEvidenceStrength(value: string): EvidenceStrength {
  return assertEnum(value, EVIDENCE_STRENGTHS, "evidenceStrength");
}
