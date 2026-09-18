import { z } from "zod";

/**
 * Canonical, tenant-neutral schemas for reimbursement evidence.
 *
 * Keep client-specific taxonomy, branding, credentials, and confidential data
 * outside this module. These schemas are the sovereign core contract used by
 * Lacuna and any future adapters.
 */

export const REIMBURSEMENT_SCHEMA_VERSION = "1.0.0" as const;

const idSchema = z.string().trim().min(1);
const isoTimestampSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Expected an ISO-compatible timestamp",
);

export const evidenceStatusSchema = z.enum([
  "machine_proposed",
  "source_verified",
  "specialist_reviewed",
  "approved",
  "published",
  "rejected",
  "superseded",
  "insufficient_evidence",
]);

export const evidenceStrengthSchema = z.enum([
  "primary",
  "peer_reviewed",
  "secondary",
  "discovery_only",
]);

export const claimKindSchema = z.enum([
  "fact",
  "calculation",
  "interpretation",
  "modeled_estimate",
]);

export const economicUnitSchema = z.enum([
  "rvu",
  "rvu_per_hour",
  "allowed_amount",
  "fee_schedule_payment",
  "reimbursement_per_hour",
  "modeled_exposure",
]);

export const codeSystemSchema = z.enum(["CPT", "HCPCS"]);

export const sourceStoragePolicySchema = z.enum([
  "link_only",
  "excerpt_only",
  "full_text_allowed",
]);

export const sourceRedistributionSchema = z.enum([
  "public",
  "restricted",
  "unknown",
]);

export const reviewerRoleSchema = z.enum([
  "source_reviewer",
  "coding_reimbursement_specialist",
  "policy_reviewer",
  "admin",
]);

export const lineageHopKindSchema = z.enum([
  "source",
  "pe_input",
  "affected_services",
  "pe_rvu",
  "payment_mechanics",
  "utilization",
]);

export const lineageHopStatusSchema = z.enum([
  "open",
  "insufficient_evidence",
  "source_verified",
  "closed",
]);

export const reimbursementSourceSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  url: z.string().url(),
  publishedAt: isoTimestampSchema.optional(),
  accessedAt: isoTimestampSchema,
  sourceType: evidenceStrengthSchema,
  locator: z.string().trim().min(1).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  ruleCycle: z.string().trim().min(1).optional(),
  storagePolicy: sourceStoragePolicySchema.default("link_only"),
  redistribution: sourceRedistributionSchema.default("unknown"),
  licenseNote: z.string().trim().min(1).optional(),
});

export const reimbursementClaimSchema = z
  .object({
    id: idSchema,
    issueId: idSchema,
    statement: z.string().trim().min(1),
    kind: claimKindSchema,
    status: evidenceStatusSchema,
    sourceIds: z.array(idSchema).default([]),
    economicUnit: economicUnitSchema.optional(),
    payer: z.string().trim().min(1).optional(),
    dataYear: z.number().int().min(2000).max(2100).optional(),
    ruleCycle: z.string().trim().min(1).optional(),
    locality: z.string().trim().min(1).optional(),
    placeOfService: z.string().trim().min(1).optional(),
    codeSystem: codeSystemSchema.optional(),
    codes: z.array(z.string().trim().min(1)).optional(),
    assumptions: z.array(z.string().trim().min(1)).optional(),
    reviewerNote: z.string().trim().min(1).optional(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .superRefine((claim, ctx) => {
    const hasCodes = Boolean(claim.codes?.length);
    if (hasCodes !== Boolean(claim.codeSystem)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "codeSystem and codes must be supplied together",
        path: [hasCodes ? "codeSystem" : "codes"],
      });
    }

    if (
      (claim.kind === "modeled_estimate" ||
        claim.economicUnit === "modeled_exposure") &&
      !claim.assumptions?.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Modeled estimates require explicit assumptions",
        path: ["assumptions"],
      });
    }
  });

export const codeRateObservationSchema = z.object({
  id: idSchema,
  code: z.string().trim().min(1),
  codeSystem: codeSystemSchema,
  dataYear: z.number().int().min(2000).max(2100),
  payer: z.string().trim().min(1),
  locality: z.string().trim().min(1).optional(),
  ruleCycle: z.string().trim().min(1).optional(),
  placeOfService: z.string().trim().min(1),
  workRvu: z.number().nonnegative().optional(),
  practiceExpenseRvu: z.number().nonnegative().optional(),
  malpracticeRvu: z.number().nonnegative().optional(),
  workGpci: z.number().positive().optional(),
  practiceExpenseGpci: z.number().positive().optional(),
  malpracticeGpci: z.number().positive().optional(),
  conversionFactor: z.number().positive().optional(),
  paymentAmount: z.number().nonnegative().optional(),
  sourceId: idSchema,
  status: z.enum([
    "source_verified",
    "specialist_reviewed",
    "approved",
    "published",
  ]),
  observedAt: isoTimestampSchema,
});

export const reviewDecisionSchema = z.object({
  id: idSchema,
  claimId: idSchema,
  reviewerRole: reviewerRoleSchema,
  fromStatus: evidenceStatusSchema,
  toStatus: evidenceStatusSchema,
  decision: z.enum(["approve", "reject", "needs_more_evidence", "supersede"]),
  note: z.string().trim().min(1).optional(),
  reviewedAt: isoTimestampSchema,
});

export const reimbursementIssueSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1),
  question: z.string().trim().min(1),
  status: evidenceStatusSchema,
  ruleCycle: z.string().trim().min(1).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  claimIds: z.array(idSchema).default([]),
  nextAction: z.string().trim().min(1).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const reimbursementLineageHopSchema = z.object({
  id: idSchema,
  issueId: idSchema,
  sequence: z.number().int().min(1),
  kind: lineageHopKindSchema,
  question: z.string().trim().min(1),
  status: lineageHopStatusSchema,
  claimId: idSchema.optional(),
  notes: z.string().trim().min(1).optional(),
});

export const evidenceLedgerSchema = z.object({
  schemaVersion: z.literal(REIMBURSEMENT_SCHEMA_VERSION),
  issues: z.array(reimbursementIssueSchema),
  claims: z.array(reimbursementClaimSchema),
  sources: z.array(reimbursementSourceSchema),
  codeRates: z.array(codeRateObservationSchema),
  reviews: z.array(reviewDecisionSchema),
  lineageHops: z.array(reimbursementLineageHopSchema).default([]),
});

export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;
export type EvidenceStrength = z.infer<typeof evidenceStrengthSchema>;
export type ClaimKind = z.infer<typeof claimKindSchema>;
export type EconomicUnit = z.infer<typeof economicUnitSchema>;
export type CodeSystem = z.infer<typeof codeSystemSchema>;
export type ReviewerRole = z.infer<typeof reviewerRoleSchema>;
export type LineageHopKind = z.infer<typeof lineageHopKindSchema>;
export type LineageHopStatus = z.infer<typeof lineageHopStatusSchema>;
export type ReimbursementSource = z.infer<typeof reimbursementSourceSchema>;
export type ReimbursementClaim = z.infer<typeof reimbursementClaimSchema>;
export type CodeRateObservation = z.infer<typeof codeRateObservationSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ReimbursementIssue = z.infer<typeof reimbursementIssueSchema>;
export type ReimbursementLineageHop = z.infer<
  typeof reimbursementLineageHopSchema
>;
export type EvidenceLedger = z.infer<typeof evidenceLedgerSchema>;
