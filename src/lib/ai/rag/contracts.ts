import { z } from "zod";
import { dispositionSchema } from "@/lib/ai/evals/clinicalEvidenceEval";
import {
  type EvidenceObservation,
  type EvidenceSourceClass,
  evidenceSourceClassSchema,
  geographySchema,
} from "@/lib/evidenceGraph/schema";
import type { ResearchSource } from "@/lib/research/sourceRegistry";
import {
  type EvidenceStatus,
  evidenceStatusSchema,
  type ReimbursementClaim,
  type ReimbursementSource,
  sourceRedistributionSchema,
  sourceStoragePolicySchema,
} from "@/lib/reimbursement/schema";
import { passageContentBasis, sha256Text } from "./hash";

export const RAG_CONTRACT_VERSION = "1.0.0" as const;
export const RETRIEVER_VERSION = "1.0.0" as const;
export const RETRIEVAL_ALGORITHM = "lexical-v1" as const;

const idSchema = z.string().trim().min(1).max(160);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const evidenceLaneSchema = z.enum([
  "publication",
  "research_draft",
]);
export type EvidenceLane = z.infer<typeof evidenceLaneSchema>;

export const supersessionStatusSchema = z.enum([
  "current",
  "superseded",
  "revoked",
]);

export const passageRoleSchema = z.enum([
  "source_passage",
  "verified_observation",
  "approved_claim",
]);
export type PassageRole = z.infer<typeof passageRoleSchema>;

export const corpusClassSchema = z.enum([
  "public_licensed",
  "synthetic_fixture",
  "ledger_adapter",
  "observation_adapter",
]);

export const structuredRecordSchema = z.object({
  metric: z.string().trim().min(1).max(120),
  value: z.union([z.number().finite(), z.string().trim().min(1), z.null()]),
  comparator: z.enum(["eq", "lt", "lte", "gt", "gte"]).default("eq"),
  unit: z.string().trim().min(1).max(80).optional(),
  code: z.string().trim().min(1).max(32).optional(),
  codeSystem: z.enum(["CPT", "HCPCS"]).optional(),
  dataYear: z.number().int().min(1992).max(2100).optional(),
  payer: z.string().trim().min(1).max(80).optional(),
  setting: z.string().trim().min(1).max(80).optional(),
  geographyCode: z.string().trim().min(2).max(8).optional(),
});
export type StructuredRecord = z.infer<typeof structuredRecordSchema>;

const approvedStates = new Set<EvidenceStatus>(["approved", "published"]);
const observationStates = new Set<EvidenceStatus>([
  "source_verified",
  "specialist_reviewed",
]);

export const evidencePassageSchema = z.object({
  schemaVersion: z.literal(RAG_CONTRACT_VERSION),
  passageId: idSchema,
  sourceId: idSchema,
  documentId: idSchema,
  snapshotId: idSchema,
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  sourceUrl: z.url(),
  locator: z.string().trim().min(1).max(300),
  publishedAt: z.iso.date().optional(),
  retrievedAt: z.iso.date(),
  applicableDate: z.iso.date().optional(),
  dataYear: z.number().int().min(1992).max(2100).optional(),
  geography: geographySchema.optional(),
  population: z.string().trim().min(1).max(300).optional(),
  payer: z.string().trim().min(1).max(80).optional(),
  setting: z.string().trim().min(1).max(80).optional(),
  contentHash: sha256Schema,
  storagePolicy: sourceStoragePolicySchema,
  redistribution: sourceRedistributionSchema,
  licenseNote: z.string().trim().min(1).max(500),
  evidenceType: evidenceSourceClassSchema,
  reviewState: evidenceStatusSchema,
  supersessionStatus: supersessionStatusSchema,
  passageRole: passageRoleSchema,
  corpusClass: corpusClassSchema,
  limitations: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  text: z.string().trim().min(1).max(4000).optional(),
  record: structuredRecordSchema.optional(),
}).superRefine((passage, ctx) => {
  const basis = passageContentBasis(passage);
  if (passage.contentHash !== sha256Text(basis)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contentHash"],
      message: "contentHash does not match the stored passage content",
    });
  }

  if (passage.storagePolicy === "link_only" && passage.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["text"],
      message: "link_only passages cannot store body text",
    });
  }

  if (passage.storagePolicy !== "link_only" && !passage.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["text"],
      message: "Excerpt and full-text passages require stored text",
    });
  }

  if (
    passage.storagePolicy === "full_text_allowed" &&
    passage.redistribution !== "public"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storagePolicy"],
      message: "full_text_allowed requires public redistribution",
    });
  }

  const approved = approvedStates.has(passage.reviewState);
  if (passage.passageRole === "approved_claim" && !approved) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["passageRole"],
      message: "Approved claims require review state approved or published",
    });
  }
  if (passage.passageRole !== "approved_claim" && approved) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reviewState"],
      message:
        "Approved or published review state is only valid on an approved claim",
    });
  }
  if (
    passage.passageRole === "verified_observation" &&
    !observationStates.has(passage.reviewState)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["passageRole"],
      message:
        "Verified observations are source_verified or specialist_reviewed, not approved claims",
    });
  }
});

export type EvidencePassage = z.infer<typeof evidencePassageSchema>;

export const sourceSnapshotSchema = z.object({
  schemaVersion: z.literal(RAG_CONTRACT_VERSION),
  sourceId: idSchema,
  documentId: idSchema,
  snapshotId: idSchema,
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  sourceUrl: z.url(),
  locator: z.string().trim().min(1),
  publishedAt: z.iso.date().optional(),
  retrievedAt: z.iso.date(),
  geographyLabel: z.string().trim().min(1).optional(),
  population: z.string().trim().min(1).optional(),
  contentHash: sha256Schema,
  storagePolicy: sourceStoragePolicySchema,
  redistribution: sourceRedistributionSchema,
  licenseNote: z.string().trim().min(1),
  evidenceType: evidenceSourceClassSchema,
  limitations: z.array(z.string().trim().min(1)).min(1),
  claimVerified: z.literal(false),
});
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;

export const evidenceAskRequestSchema = z.object({
  question: z.string().trim().min(1).max(1_000),
  asOfDate: z.iso.date(),
  lane: evidenceLaneSchema.default("publication"),
  geographyCode: z.string().trim().min(2).max(8).optional(),
  payer: z.string().trim().min(1).max(80).optional(),
  setting: z.string().trim().min(1).max(80).optional(),
  dataYear: z.number().int().min(1992).max(2100).optional(),
  topK: z.number().int().min(1).max(8).default(5),
});
export type EvidenceAskRequest = z.infer<typeof evidenceAskRequestSchema>;

export const evidenceClaimRecordSchema = structuredRecordSchema;
export type EvidenceClaimRecord = StructuredRecord;

export const evidenceAskDraftSchema = z.object({
  disposition: dispositionSchema,
  answer: z.string().trim().max(2_000),
  claims: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1).max(1_000),
    passageIds: z.array(z.string().trim().min(1).max(160)).max(8),
    record: evidenceClaimRecordSchema.optional(),
  })).max(8),
  limitations: z.array(z.string().trim().min(1).max(400)).max(8),
  conflicts: z.array(z.string().trim().min(1).max(400)).max(8),
  abstentionReason: z.string().trim().min(1).max(400).optional(),
});
export type EvidenceAskDraft = z.infer<typeof evidenceAskDraftSchema>;

export interface EvidenceCitation {
  passageId: string;
  sourceId: string;
  documentId: string;
  snapshotId: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  locator: string;
  publishedAt?: string;
  retrievedAt: string;
  applicableDate?: string;
  dataYear?: number;
  geographyLabel?: string;
  population?: string;
  payer?: string;
  setting?: string;
  reviewState: EvidenceStatus;
  passageRole: PassageRole;
  supersessionStatus: EvidencePassage["supersessionStatus"];
  storagePolicy: EvidencePassage["storagePolicy"];
  limitations: string[];
  corpusClass: EvidencePassage["corpusClass"];
}

export interface VerifiedClaim {
  id: string;
  text: string;
  passageIds: string[];
  verification: "resolved" | "unresolved" | "rejected";
  reasons: string[];
}

export interface EvidenceAskResponse {
  requestId: string;
  disposition: EvidenceAskDraft["disposition"];
  lane: EvidenceLane;
  answer: string;
  claims: VerifiedClaim[];
  citations: EvidenceCitation[];
  considered: EvidenceCitation[];
  limitations: string[];
  conflicts: string[];
  assumptions: string[];
  analystInterpretation: null;
  abstentionReason: string | null;
  publicationEligible: boolean;
  representedAsApprovedClaim: boolean;
  sourceSnapshotHash: string;
  modelId: string;
  promptVersion: string;
  retrieverVersion: string;
  retrievalAlgorithm: string;
  retrievalConfigHash: string;
  retrievalScopeHash: string;
  retrievedPassageIds: string[];
  operational: {
    latencyMs: number;
    retrievalLatencyMs: number;
    estimatedCostUsd: number;
  };
  disclaimer: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDateOrUndefined(
  value: string | undefined,
): string | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  return value;
}

function roleForReviewState(reviewState: EvidenceStatus): PassageRole {
  if (approvedStates.has(reviewState)) return "approved_claim";
  if (observationStates.has(reviewState)) return "verified_observation";
  return "source_passage";
}

export interface PassageDraft {
  passageId: string;
  sourceId: string;
  documentId: string;
  snapshotId?: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  locator: string;
  publishedAt?: string;
  retrievedAt: string;
  applicableDate?: string;
  dataYear?: number;
  geography?: EvidencePassage["geography"];
  population?: string;
  payer?: string;
  setting?: string;
  storagePolicy: EvidencePassage["storagePolicy"];
  redistribution: EvidencePassage["redistribution"];
  licenseNote: string;
  evidenceType: EvidenceSourceClass;
  reviewState: EvidenceStatus;
  supersessionStatus: EvidencePassage["supersessionStatus"];
  passageRole?: PassageRole;
  corpusClass: EvidencePassage["corpusClass"];
  limitations: string[];
  text?: string;
  record?: StructuredRecord;
}

/** Parse a passage and fill the content hash. Does not approve anything. */
export function defineEvidencePassage(draft: PassageDraft): EvidencePassage {
  const text = draft.storagePolicy === "link_only" ? undefined : draft.text;
  const contentHash = sha256Text(passageContentBasis({
    text,
    sourceId: draft.sourceId,
    locator: draft.locator,
    retrievedAt: draft.retrievedAt,
  }));
  return evidencePassageSchema.parse({
    schemaVersion: RAG_CONTRACT_VERSION,
    ...draft,
    text,
    passageRole: draft.passageRole ?? roleForReviewState(draft.reviewState),
    contentHash,
    snapshotId: draft.snapshotId ?? `snap:${contentHash.slice(0, 16)}`,
  });
}

/**
 * Research-source registration. This snapshot is not a verified claim and is
 * not historically admissible unless publishedAt is already an ISO date.
 */
export function snapshotFromResearchSource(
  source: ResearchSource,
  retrievedAt: string,
): SourceSnapshot {
  const publishedAt = isoDateOrUndefined(source.publishedAt);
  const contentHash = sha256Text(
    [source.id, source.title, source.sourceUrl, publishedAt ?? "undated"].join(
      "|",
    ),
  );
  return sourceSnapshotSchema.parse({
    schemaVersion: RAG_CONTRACT_VERSION,
    sourceId: source.id,
    documentId: source.id,
    snapshotId: `snap:${contentHash.slice(0, 16)}`,
    title: source.title,
    publisher: source.publisher,
    sourceUrl: source.sourceUrl,
    locator: "research-source-registry",
    publishedAt,
    retrievedAt,
    geographyLabel: source.geographicScope,
    population: source.populationScope,
    contentHash,
    storagePolicy: "link_only",
    redistribution: "unknown",
    licenseNote:
      "Registry metadata only. Report PDFs and full texts are not stored.",
    evidenceType: "other",
    limitations: source.limitations,
    claimVerified: false,
  });
}

/** A reimbursement source record does not by itself verify a claim. */
export function passageFromReimbursementSource(
  source: ReimbursementSource,
): EvidencePassage {
  return defineEvidencePassage({
    passageId: `passage:${source.id}`,
    sourceId: source.id,
    documentId: source.id,
    title: source.title,
    publisher: source.publisher,
    sourceUrl: source.url,
    locator: source.locator ?? source.id,
    publishedAt: isoDateOrUndefined(source.publishedAt?.slice(0, 10)),
    retrievedAt: source.accessedAt.slice(0, 10),
    dataYear: undefined,
    storagePolicy: "link_only",
    redistribution: source.redistribution,
    licenseNote: source.licenseNote ??
      "Adapted from the reimbursement source record. No claim is verified by registration.",
    evidenceType: "pricing",
    reviewState: "source_verified",
    supersessionStatus: "current",
    passageRole: "source_passage",
    corpusClass: "ledger_adapter",
    limitations: [
      "Source registration does not establish claim verification.",
      source.licenseNote ??
        "Storage policy follows the reimbursement source record.",
    ],
  });
}

/**
 * Ledger claims stay in their existing review state. Machine-proposed claims
 * remain ineligible for retrieval.
 */
export function passageFromReimbursementClaim(
  claim: ReimbursementClaim,
): EvidencePassage {
  return defineEvidencePassage({
    passageId: `passage:${claim.id}`,
    sourceId: claim.sourceIds[0] ?? `unregistered:${claim.id}`,
    documentId: claim.issueId,
    title: "Lacuna reimbursement ledger claim",
    publisher: "Lacuna",
    sourceUrl: "https://example.com/lacuna/reimbursement-ledger",
    locator: claim.id,
    retrievedAt: claim.updatedAt.slice(0, 10),
    dataYear: claim.dataYear,
    payer: claim.payer,
    setting: claim.placeOfService,
    storagePolicy: "excerpt_only",
    redistribution: "public",
    licenseNote:
      "Lacuna-authored ledger statement. Not a CMS excerpt and not verified by this adapter.",
    evidenceType: "pricing",
    reviewState: claim.status,
    supersessionStatus: claim.status === "superseded"
      ? "superseded"
      : "current",
    corpusClass: "ledger_adapter",
    limitations: [
      "Adapted from the reimbursement ledger. Registration is not approval.",
      "Missing economic inputs on this claim are not zero.",
    ],
    text: claim.statement,
    record: claim.economicUnit
      ? {
        metric: claim.economicUnit,
        value: null,
        comparator: "eq",
        unit: claim.economicUnit,
        code: claim.codes?.[0],
        codeSystem: claim.codeSystem,
        dataYear: claim.dataYear,
        payer: claim.payer,
        setting: claim.placeOfService,
      }
      : undefined,
  });
}

/** Evidence-graph observations keep their values. Review state is explicit. */
function structuredObservationValue(
  value: EvidenceObservation["value"],
): StructuredRecord["value"] {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return value;
}

export function passageFromEvidenceObservation(
  observation: EvidenceObservation,
  reviewState: EvidenceStatus,
): EvidencePassage {
  const recordValue = structuredObservationValue(observation.value);
  const valueText = recordValue === null
    ? "value missing"
    : String(recordValue);
  const text = `${observation.metric} ${observation.comparator} ${valueText}${
    observation.unit ? ` ${observation.unit}` : ""
  }. ${observation.limitations.join(" ")}`;
  return defineEvidencePassage({
    passageId: `passage:${observation.id}`,
    sourceId: observation.source.id,
    documentId: observation.id,
    title: observation.source.title,
    publisher: observation.source.publisher,
    sourceUrl: observation.source.url,
    locator: observation.source.locator,
    publishedAt: observation.source.publishedAt,
    retrievedAt: observation.source.retrievedAt,
    applicableDate: observation.asOf,
    dataYear: undefined,
    geography: observation.geography,
    population: observation.population?.definition,
    storagePolicy: "excerpt_only",
    redistribution: "public",
    licenseNote:
      "Rendered from an evidence-graph observation. This adapter does not approve the observation.",
    evidenceType: observation.sourceClass,
    reviewState,
    supersessionStatus: "current",
    corpusClass: "observation_adapter",
    limitations: [...observation.limitations],
    text,
    record: {
      metric: observation.metric,
      value: recordValue,
      comparator: observation.comparator,
      unit: observation.unit,
      geographyCode: observation.geography?.code,
    },
  });
}
