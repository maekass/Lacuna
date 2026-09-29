import { z } from "zod";
import {
  atomicEvidenceValueSchema,
  evidenceKindSchema,
  evidenceSourceClassSchema,
  evidenceSourceSchema,
  geographySchema,
} from "@/lib/evidenceGraph/schema";

const isoDateSchema = z.iso.date();

export const partialDateSchema = z.string().regex(
  /^\d{4}(-\d{2}(-\d{2})?)?$/,
  "Expected YYYY, YYYY-MM, or YYYY-MM-DD",
);

export const nctIdSchema = z.string().regex(
  /^NCT\d{8}$/,
  "Expected an NCT ID with exactly eight digits",
);

export const therapeuticSourceSchema = evidenceSourceSchema.extend({
  sourceClass: evidenceSourceClassSchema,
});

/**
 * A field-level evidence claim. `evidenceKind` cannot be an assumption.
 * Assumptions live on `InvestmentThesis` and are not valid values here.
 */
export function sourcedSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    claimId: z.string().trim().min(1),
    field: z.string().trim().min(1),
    value: valueSchema,
    evidenceKind: evidenceKindSchema,
    derivation: z.string().trim().min(1).optional(),
    sourceId: z.string().trim().min(1),
    eventDate: partialDateSchema.optional(),
    asOf: isoDateSchema,
    limitations: z.array(z.string().trim().min(1)).min(1),
    geography: geographySchema.optional(),
    reviewedBy: z.string().trim().min(1).optional(),
    reviewedAt: isoDateSchema.optional(),
  }).superRefine((value, ctx) => {
    if (value.evidenceKind === "derived" && !value.derivation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["derivation"],
        message: "Derived evidence must record its derivation",
      });
    }
    if (
      (value.reviewedBy && !value.reviewedAt) ||
      (!value.reviewedBy && value.reviewedAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewedBy"],
        message: "Reviewer name and review date must be recorded together",
      });
    }
  });
}

export const analystAssumptionSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("assumption"),
  statement: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  reviewedBy: z.string().trim().min(1),
  reviewedAt: isoDateSchema,
}).strict();

export type TherapeuticSource = z.infer<typeof therapeuticSourceSchema>;
export type AnalystAssumption = z.infer<typeof analystAssumptionSchema>;
export type Sourced<T> = {
  claimId: string;
  field: string;
  value: T;
  evidenceKind: z.infer<typeof evidenceKindSchema>;
  derivation?: string;
  sourceId: string;
  eventDate?: string;
  asOf: string;
  limitations: string[];
  geography?: z.infer<typeof geographySchema>;
  reviewedBy?: string;
  reviewedAt?: string;
};

interface SourcedInput<T> {
  claimId: string;
  field: string;
  value: T;
  sourceId: string;
  asOf: string;
  limitations: string[];
  eventDate?: string;
  derivation?: string;
  geography?: Sourced<T>["geography"];
  reviewedBy?: string;
  reviewedAt?: string;
}

/** Build an observed sourced field. This helper cannot emit an assumption. */
export function observed<T>(input: SourcedInput<T>): Sourced<T> {
  return {
    ...input,
    evidenceKind: "observed",
  };
}

/** Build a derived sourced field. Derivation text is required. */
export function derived<T>(
  input: SourcedInput<T> & { derivation: string },
): Sourced<T> {
  return {
    ...input,
    evidenceKind: "derived",
  };
}

export { atomicEvidenceValueSchema, evidenceKindSchema, geographySchema };
