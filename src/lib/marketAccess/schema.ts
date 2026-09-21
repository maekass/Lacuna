import { z } from "zod";

const isoDateSchema = z.iso.date();

export const marketAccessSourceSchema = z.object({
  url: z.url(),
  title: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  accessedAt: isoDateSchema,
  publishedAt: isoDateSchema.optional(),
  locator: z.string().trim().min(1),
});

const sourcedNumberBase = {
  value: z.number().finite().nonnegative(),
  sources: z.array(marketAccessSourceSchema).min(1),
};

export const evidenceNumberSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("observed"),
    ...sourcedNumberBase,
  }),
  z.object({
    kind: z.literal("derived"),
    ...sourcedNumberBase,
    formula: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("proxy"),
    ...sourcedNumberBase,
    limitation: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("assumption"),
    value: z.number().finite().nonnegative(),
    rationale: z.string().trim().min(1),
    reviewedBy: z.string().trim().min(1),
    reviewedAt: isoDateSchema,
    evidence: z.array(marketAccessSourceSchema).min(1),
  }),
]);

export const rateEvidenceNumberSchema = evidenceNumberSchema.refine(
  (entry) => entry.value <= 1,
  { message: "Rate inputs must be expressed from 0 to 1" },
);

export const supplierSchema = z.object({
  manufacturer: z.string().trim().min(1),
  product: z.string().trim().min(1),
  regulatoryStatus: z.string().trim().min(1),
  geography: z.string().trim().min(1),
  unitPriceUsd: evidenceNumberSchema.optional(),
  annualCapacity: evidenceNumberSchema.optional(),
  leadTimeDays: evidenceNumberSchema.optional(),
  notes: z.string().trim().min(1).optional(),
  sources: z.array(marketAccessSourceSchema).min(1),
});

export const readinessDimensionSchema = z.object({
  status: z.enum(["documented", "partial", "unknown"]),
  summary: z.string().trim().min(1),
  sources: z.array(marketAccessSourceSchema),
});

export const interventionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  mechanism: z.enum([
    "status_quo",
    "price_negotiation",
    "pooled_procurement",
    "volume_guarantee",
    "subsidy",
    "leasing",
    "other",
  ]),
  targetUptake: rateEvidenceNumberSchema,
  unitCommodityCostUsd: evidenceNumberSchema,
  deliveryCostPerPatientUsd: evidenceNumberSchema,
  fixedImplementationCostUsd: evidenceNumberSchema,
  notes: z.string().trim().min(1).optional(),
});

export const marketAccessCaseSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  indication: z.string().trim().min(1),
  commodity: z.string().trim().min(1),
  country: z.string().trim().min(1),
  asOfDate: isoDateSchema,
  status: z.enum(["research", "reviewed"]),
  burden: z.object({
    targetPopulation: evidenceNumberSchema,
    prevalence: rateEvidenceNumberSchema,
    serviceReach: rateEvidenceNumberSchema,
    diagnosisRate: rateEvidenceNumberSchema,
    treatmentEligibility: rateEvidenceNumberSchema,
    currentUptake: rateEvidenceNumberSchema,
  }),
  suppliers: z.array(supplierSchema),
  countryReadiness: z.object({
    guidelines: readinessDimensionSchema,
    financing: readinessDimensionSchema,
    procurement: readinessDimensionSchema,
    workforce: readinessDimensionSchema,
    diagnostics: readinessDimensionSchema,
    supplyChain: readinessDimensionSchema,
  }),
  baseline: interventionSchema,
  interventions: z.array(interventionSchema).min(1),
  evidenceNotes: z.array(z.string().trim().min(1)),
}).superRefine((value, ctx) => {
  if (value.baseline.mechanism !== "status_quo") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["baseline", "mechanism"],
      message: "Baseline intervention must use status_quo",
    });
  }
  if (value.baseline.targetUptake.value !== value.burden.currentUptake.value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["baseline", "targetUptake", "value"],
      message: "Baseline targetUptake must equal burden.currentUptake",
    });
  }
});

export type MarketAccessSource = z.infer<typeof marketAccessSourceSchema>;
export type EvidenceNumber = z.infer<typeof evidenceNumberSchema>;
export type MarketAccessIntervention = z.infer<typeof interventionSchema>;
export type MarketAccessCase = z.infer<typeof marketAccessCaseSchema>;
