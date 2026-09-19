import { z } from "zod";
import {
  type ReimbursementSourceManifest,
  reimbursementSourceManifestSchema,
  type SourceManifestValidationIssue,
  validateReimbursementSourceManifest,
} from "./sourceManifest";
import {
  normalizeCmsObservation,
  type NormalizedCmsObservation,
  type ObservationNormalizationIssue,
  type RawCmsRateObservation,
} from "./observations";

export const REIMBURSEMENT_INGESTION_CONTRACT_VERSION = "1.0.0" as const;

const isoTimestampSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Expected an ISO-compatible timestamp",
);

/**
 * One tabular CMS/HCPCS observation emitted by Python + DuckDB (or an
 * equivalent TypeScript producer). Null means "not present", never zero.
 */
export const ingestedRateRowSchema = z.object({
  id: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1),
  codeSystem: z.enum(["CPT", "HCPCS"]),
  dataYear: z.number().int().min(2000).max(2100),
  ruleCycle: z.string().trim().min(1).optional(),
  payer: z.string().trim().min(1),
  locality: z.string().trim().min(1).optional(),
  placeOfService: z.string().trim().min(1),
  workRvu: z.number().nonnegative().nullable().optional(),
  practiceExpenseRvu: z.number().nonnegative().nullable().optional(),
  malpracticeRvu: z.number().nonnegative().nullable().optional(),
  workGpci: z.number().positive().nullable().optional(),
  practiceExpenseGpci: z.number().positive().nullable().optional(),
  malpracticeGpci: z.number().positive().nullable().optional(),
  conversionFactor: z.number().positive().nullable().optional(),
  paymentAmount: z.number().nonnegative().nullable().optional(),
  sourceArtifactId: z.string().trim().min(1),
  observedAt: isoTimestampSchema,
});

export const ingestedObservationBatchSchema = z.object({
  contractVersion: z.literal(REIMBURSEMENT_INGESTION_CONTRACT_VERSION),
  producedAt: isoTimestampSchema,
  producer: z.object({
    runtime: z.enum(["python-duckdb", "typescript"]),
    name: z.string().trim().min(1),
  }),
  sourceManifest: reimbursementSourceManifestSchema,
  output: z.object({
    format: z.enum(["json", "parquet"]),
    parquetPath: z.string().trim().min(1).optional(),
  }),
  observations: z.array(ingestedRateRowSchema).default([]),
}).superRefine((batch, ctx) => {
  if (batch.output.format === "parquet" && !batch.output.parquetPath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Parquet output requires parquetPath for the TypeScript adapter.",
      path: ["output", "parquetPath"],
    });
  }

  // Empty JSON observations are allowed: a catalog-only sidecar may register
  // public sources without asserting rate rows. Missing is not zero.
});

export type IngestedRateRow = z.infer<typeof ingestedRateRowSchema>;
export type IngestedObservationBatch = z.infer<
  typeof ingestedObservationBatchSchema
>;

export interface IngestionValidationIssue {
  code: "schema" | "manifest" | "observation" | "unknown_source_artifact";
  path: string;
  message: string;
}

export interface IngestionValidationResult {
  ok: boolean;
  issues: IngestionValidationIssue[];
  batch?: IngestedObservationBatch;
  observations: NormalizedCmsObservation[];
}

function toRawObservation(row: IngestedRateRow): RawCmsRateObservation {
  return {
    ...(row.id ? { id: row.id } : {}),
    code: row.code,
    codeSystem: row.codeSystem,
    dataYear: row.dataYear,
    ...(row.ruleCycle ? { ruleCycle: row.ruleCycle } : {}),
    payer: row.payer,
    ...(row.locality ? { locality: row.locality } : {}),
    placeOfService: row.placeOfService,
    workRvu: row.workRvu,
    practiceExpenseRvu: row.practiceExpenseRvu,
    malpracticeRvu: row.malpracticeRvu,
    workGpci: row.workGpci,
    practiceExpenseGpci: row.practiceExpenseGpci,
    malpracticeGpci: row.malpracticeGpci,
    conversionFactor: row.conversionFactor,
    paymentAmount: row.paymentAmount,
    sourceId: row.sourceArtifactId,
    observedAt: row.observedAt,
  };
}

function mapObservationIssues(
  path: string,
  issues: ObservationNormalizationIssue[],
): IngestionValidationIssue[] {
  return issues.map((issue) => ({
    code: "observation" as const,
    path,
    message: issue.message,
  }));
}

function mapManifestIssues(
  issues: SourceManifestValidationIssue[],
): IngestionValidationIssue[] {
  return issues.map((issue) => ({
    code: "manifest" as const,
    path: `sourceManifest.${issue.path}`,
    message: issue.message,
  }));
}

/**
 * Validate a Python/DuckDB (or TypeScript) observation batch before any row
 * is copied into the reimbursement evidence ledger.
 *
 * Parquet files stay outside the Next.js runtime: the sidecar JSON carries
 * the contract, source manifest, and `parquetPath`. JSON batches may inline
 * rows or stay empty as a catalog-only provenance document.
 */
export function validateIngestedObservationBatch(
  input: unknown,
): IngestionValidationResult {
  const parsed = ingestedObservationBatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: "schema",
        path: issue.path.join("."),
        message: issue.message,
      })),
      observations: [],
    };
  }

  const batch = parsed.data;
  const issues: IngestionValidationIssue[] = [];
  const observations: NormalizedCmsObservation[] = [];

  const manifestResult = validateReimbursementSourceManifest(
    batch.sourceManifest,
  );
  if (!manifestResult.ok) {
    issues.push(...mapManifestIssues(manifestResult.issues));
  }

  const artifactIds = new Set(
    batch.sourceManifest.artifacts.map((artifact) => artifact.id),
  );

  for (const [index, row] of batch.observations.entries()) {
    if (!artifactIds.has(row.sourceArtifactId)) {
      issues.push({
        code: "unknown_source_artifact",
        path: `observations.${index}.sourceArtifactId`,
        message:
          `Observation references unknown source artifact ${row.sourceArtifactId}.`,
      });
      continue;
    }

    const normalized = normalizeCmsObservation(toRawObservation(row));
    if (!normalized.ok) {
      issues.push(
        ...mapObservationIssues(`observations.${index}`, normalized.issues),
      );
      continue;
    }
    observations.push(normalized.observation);
  }

  return {
    ok: issues.length === 0,
    issues,
    batch,
    observations,
  };
}

export type { ReimbursementSourceManifest };
