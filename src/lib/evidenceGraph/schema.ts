import { z } from "zod";

const isoDateSchema = z.iso.date();

export const evidenceSubjectSchema = z.object({
  kind: z.enum([
    "drug",
    "device",
    "condition",
    "procedure",
    "organization",
    "study",
  ]),
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  identifiers: z.record(z.string(), z.string().trim().min(1)).optional(),
});

export const evidenceSourceSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  url: z.url(),
  locator: z.string().trim().min(1),
  publishedAt: isoDateSchema.optional(),
  retrievedAt: isoDateSchema,
});

export const geographySchema = z.object({
  level: z.enum(["global", "country", "subnational", "unspecified"]),
  code: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1),
});

export const populationSchema = z.object({
  definition: z.string().trim().min(1),
  inclusion: z.array(z.string().trim().min(1)).default([]),
  exclusion: z.array(z.string().trim().min(1)).default([]),
});

const atomicEvidenceValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const evidenceObservationSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().trim().min(1),
  subject: evidenceSubjectSchema,
  metric: z.string().trim().min(1),
  value: atomicEvidenceValueSchema,
  comparator: z.enum(["eq", "lt", "lte", "gt", "gte"]).default("eq"),
  unit: z.string().trim().min(1).optional(),
  source: evidenceSourceSchema,
  sourceClass: z.enum([
    "regulatory",
    "claims",
    "surveillance",
    "trial",
    "epidemiology",
    "funding",
    "pricing",
    "workforce",
    "guideline",
    "other",
  ]),
  geography: geographySchema.optional(),
  population: populationSchema.optional(),
  eventDate: isoDateSchema.optional(),
  observedAt: isoDateSchema.optional(),
  asOf: isoDateSchema,
  evidenceKind: z.enum(["observed", "derived", "proxy"]),
  derivation: z.string().trim().min(1).optional(),
  limitations: z.array(z.string().trim().min(1)).min(1),
}).superRefine((observation, ctx) => {
  if (observation.evidenceKind === "derived" && !observation.derivation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["derivation"],
      message: "Derived evidence must record its derivation",
    });
  }

  if (
    observation.source.publishedAt &&
    observation.asOf < observation.source.publishedAt
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["asOf"],
      message: "Observation asOf cannot precede the source publication date",
    });
  }
});

export type EvidenceSubject = z.infer<typeof evidenceSubjectSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceObservation = z.infer<typeof evidenceObservationSchema>;