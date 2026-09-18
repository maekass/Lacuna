import { z } from "zod";

export const REIMBURSEMENT_SOURCE_MANIFEST_VERSION = "1.0.0" as const;

const isoTimestampSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Expected an ISO-compatible timestamp",
);

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);

export const reimbursementSourceArtifactTypeSchema = z.enum([
  "cms_pfs_rvu",
  "cms_pfs_rule",
  "cms_pfs_fact_sheet",
  "cms_hcpcs",
  "cms_utilization",
  "cms_other",
  "ama_reference",
  "peer_reviewed_literature",
  "other_public_source",
]);

export const reimbursementArtifactFormatSchema = z.enum([
  "csv",
  "xlsx",
  "json",
  "pdf",
  "html",
  "txt",
  "parquet",
  "other",
]);

export const reimbursementArtifactStoragePolicySchema = z.enum([
  "link_only",
  "metadata_only",
  "local_cache_allowed",
  "full_text_allowed",
]);

export const reimbursementArtifactRedistributionSchema = z.enum([
  "public",
  "restricted",
  "unknown",
]);

export const reimbursementSourceArtifactSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  artifactType: reimbursementSourceArtifactTypeSchema,
  sourceUrl: z.string().url(),
  retrievedAt: isoTimestampSchema,
  publishedAt: isoTimestampSchema.optional(),
  dataYear: z.number().int().min(2000).max(2100).optional(),
  ruleCycle: z.string().trim().min(1).optional(),
  versionLabel: z.string().trim().min(1).optional(),
  format: reimbursementArtifactFormatSchema,
  sha256: sha256Schema.optional(),
  storagePolicy: reimbursementArtifactStoragePolicySchema,
  redistribution: reimbursementArtifactRedistributionSchema,
  localPath: z.string().trim().min(1).optional(),
  licenseNote: z.string().trim().min(1).optional(),
  notes: z.array(z.string().trim().min(1)).default([]),
}).superRefine((artifact, ctx) => {
  if (
    artifact.redistribution === "restricted" &&
    artifact.storagePolicy === "full_text_allowed"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Restricted artifacts cannot be marked full_text_allowed without a separate rights determination.",
      path: ["storagePolicy"],
    });
  }

  if (artifact.storagePolicy === "link_only" && artifact.localPath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "link_only artifacts must not declare a localPath.",
      path: ["localPath"],
    });
  }

  if (
    artifact.artifactType === "ama_reference" &&
    artifact.storagePolicy === "full_text_allowed"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "AMA/CPT artifacts cannot be full_text_allowed unless a recorded license note is present and storage is not the public default.",
      path: ["storagePolicy"],
    });
  }
});

export const reimbursementSourceManifestSchema = z.object({
  schemaVersion: z.literal(REIMBURSEMENT_SOURCE_MANIFEST_VERSION),
  generatedAt: isoTimestampSchema,
  generatedBy: z.string().trim().min(1),
  artifacts: z.array(reimbursementSourceArtifactSchema),
});

export type ReimbursementSourceArtifact = z.infer<
  typeof reimbursementSourceArtifactSchema
>;
export type ReimbursementSourceManifest = z.infer<
  typeof reimbursementSourceManifestSchema
>;

export interface SourceManifestValidationIssue {
  code: "schema" | "duplicate_id";
  path: string;
  message: string;
}

export interface SourceManifestValidationResult {
  ok: boolean;
  issues: SourceManifestValidationIssue[];
  manifest?: ReimbursementSourceManifest;
}

/**
 * Validate the ingestion provenance manifest before any artifact-derived rows
 * enter the reimbursement evidence ledger.
 */
export function validateReimbursementSourceManifest(
  input: unknown,
): SourceManifestValidationResult {
  const parsed = reimbursementSourceManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "schema" as const,
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const artifact of parsed.data.artifacts) {
    if (seen.has(artifact.id)) duplicateIds.add(artifact.id);
    seen.add(artifact.id);
  }

  const issues: SourceManifestValidationIssue[] = [...duplicateIds].map((
    id,
  ) => ({
    code: "duplicate_id",
    path: "artifacts",
    message: `Duplicate source artifact id: ${id}.`,
  }));

  return {
    ok: issues.length === 0,
    issues,
    manifest: parsed.data,
  };
}
