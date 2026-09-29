import { z } from "zod";
import { geographySchema } from "@/lib/evidenceGraph/schema";
import {
  analystAssumptionSchema,
  atomicEvidenceValueSchema,
  nctIdSchema,
  partialDateSchema,
  sourcedSchema,
  therapeuticSourceSchema,
} from "./primitives";

const idSchema = z.string().trim().min(1);

export const codedReferenceSchema = z.object({
  id: idSchema,
  system: z.enum([
    "ICD-10",
    "ICD-10-CM",
    "ICD-11",
    "MeSH",
    "SNOMED-CT",
    "other",
  ]),
  code: sourcedSchema(z.string().trim().min(1)),
  display: z.string().trim().min(1).optional(),
});

export const populationRelevanceSchema = z.object({
  id: idSchema,
  populationId: idSchema,
  rationale: sourcedSchema(z.string().trim().min(1)),
});

export const diseaseSchema = z.object({
  id: idSchema,
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
  codedReferences: z.array(codedReferenceSchema),
  description: sourcedSchema(z.string().trim().min(1)),
  populationRelevance: z.array(populationRelevanceSchema).min(1),
  /** Structured population relevance. This is not a boolean flag. */
  womensHealthRelevance: z.array(populationRelevanceSchema).min(1),
  sourceIds: z.array(idSchema).min(1),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const therapeuticPopulationSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1),
  kind: z.enum([
    "reproductive_age",
    "postmenopausal",
    "pregnancy",
    "ancestry_or_genomic",
    "disease_defined",
    "geography_defined",
    "trial_eligibility",
    "other_sourced",
  ]),
  age: z.object({
    minimumAgeText: sourcedSchema(z.string().trim().min(1)).optional(),
    maximumAgeText: sourcedSchema(z.string().trim().min(1)).optional(),
    minYears: sourcedSchema(z.number().finite()).optional(),
    maxYears: sourcedSchema(z.number().finite()).optional(),
  }).optional(),
  sex: z.object({
    sourceTerm: sourcedSchema(z.string().trim().min(1)),
  }).optional(),
  reproductiveStage: z.object({
    sourceTerm: sourcedSchema(z.string().trim().min(1)),
  }).optional(),
  geography: geographySchema.optional(),
  ancestryOrGenotype: z.object({
    sourceTerm: sourcedSchema(z.string().trim().min(1)),
  }).optional(),
  inclusionNotes: z.array(z.string().trim().min(1)),
  exclusionNotes: z.array(z.string().trim().min(1)),
  sourceIds: z.array(idSchema).min(1),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const indicationSchema = z.object({
  id: idSchema,
  diseaseId: idSchema,
  assetId: idSchema.optional(),
  jurisdiction: z.string().trim().min(1),
  labelText: sourcedSchema(z.string().trim().min(1)),
});

export const interventionClassSchema = z.object({
  id: idSchema,
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
  description: sourcedSchema(z.string().trim().min(1)),
});

export const assetClassLinkSchema = z.object({
  id: idSchema,
  assetId: idSchema,
  interventionClassId: idSchema,
  link: sourcedSchema(z.string().trim().min(1)),
});

export const therapeuticOrganizationSchema = z.object({
  id: idSchema,
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
  /** Optional link into dataset.verified.json. Never required. */
  verifiedCompanyId: idSchema.optional(),
  name: sourcedSchema(z.string().trim().min(1)),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const developmentStageSchema = z.enum([
  "discovery",
  "preclinical",
  "phase_1",
  "phase_2",
  "phase_3",
  "submitted",
  "approved",
  "withdrawn",
  "discontinued",
  "not_applicable",
  "unknown",
]);

export const modalitySchema = z.enum([
  "small_molecule",
  "peptide",
  "monoclonal_antibody",
  "other_biologic",
  "combination_product",
  "device",
  "procedure",
  "unknown",
]);

export const assetDevelopmentStatusSchema = z.object({
  id: idSchema,
  jurisdiction: z.string().trim().min(1),
  stage: sourcedSchema(developmentStageSchema),
  statusText: sourcedSchema(z.string().trim().min(1)),
  indicationId: idSchema.optional(),
});

export const organizationRelationshipSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  role: z.enum([
    "applicant",
    "marketing_authorisation_holder",
    "trial_sponsor",
    "commercial_partner",
    "licensor_claimed",
  ]),
  relationship: sourcedSchema(z.string().trim().min(1)),
});

export const therapeuticAssetSchema = z.object({
  id: idSchema,
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)),
  codeNames: z.array(z.string().trim().min(1)),
  brandNames: z.array(z.object({
    id: idSchema,
    name: sourcedSchema(z.string().trim().min(1)),
    jurisdiction: z.string().trim().min(1),
  })),
  sponsorOrganizationId: idSchema,
  previousOwnerOrganizationIds: z.array(idSchema),
  relationships: z.array(organizationRelationshipSchema),
  modality: sourcedSchema(modalitySchema).optional(),
  mechanism: sourcedSchema(z.string().trim().min(1)).optional(),
  molecularTarget: sourcedSchema(z.string().trim().min(1)).optional(),
  indicationIds: z.array(idSchema),
  developmentStatuses: z.array(assetDevelopmentStatusSchema).min(1),
  administrationRoute: sourcedSchema(z.string().trim().min(1)).optional(),
  interventionClassIds: z.array(idSchema),
  sourceIds: z.array(idSchema).min(1),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const trialArmSchema = z.object({
  label: z.string().trim().min(1),
  type: z.string().trim().min(1).nullable(),
  description: z.string().trim().min(1).nullable(),
  interventionNames: z.array(z.string().trim().min(1)),
});

export const trialInterventionSchema = z.object({
  type: z.string().trim().min(1).nullable(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
});

export const trialEndpointSchema = z.object({
  measure: z.string().trim().min(1),
  timeFrame: z.string().trim().min(1).nullable(),
  description: z.string().trim().min(1).nullable(),
});

export const clinicalTrialSchema = z.object({
  id: nctIdSchema,
  nctId: nctIdSchema,
  title: z.string().trim().min(1),
  sponsorName: z.string().trim().min(1).nullable(),
  sponsorOrganizationId: idSchema.nullable(),
  conditions: z.array(z.string().trim().min(1)).nullable(),
  phase: z.string().trim().min(1).nullable(),
  rawStatus: z.string().trim().min(1).nullable(),
  assetIds: z.array(idSchema),
  diseaseIds: z.array(idSchema),
  populationId: idSchema.nullable(),
  eligibility: z.object({
    sex: z.string().trim().min(1).nullable(),
    minimumAge: z.string().trim().min(1).nullable(),
    maximumAge: z.string().trim().min(1).nullable(),
  }).nullable(),
  arms: z.array(trialArmSchema).nullable(),
  interventions: z.array(trialInterventionSchema).nullable(),
  comparatorLabels: z.array(z.string().trim().min(1)).nullable(),
  enrollment: z.object({
    count: z.number().int().nonnegative(),
    type: z.string().trim().min(1).nullable(),
  }).nullable(),
  primaryEndpoints: z.array(trialEndpointSchema).nullable(),
  secondaryEndpoints: z.array(trialEndpointSchema).nullable(),
  startDate: partialDateSchema.nullable(),
  primaryCompletionDate: partialDateSchema.nullable(),
  completionDate: partialDateSchema.nullable(),
  studyFirstPostDate: partialDateSchema.nullable(),
  resultsFirstPostDate: partialDateSchema.nullable(),
  lastUpdatePostDate: partialDateSchema.nullable(),
  reportedResultDate: partialDateSchema.nullable(),
  hasResults: z.boolean().nullable(),
  /**
   * Registry results-posting state only. Never "success" or "failure".
   * Null when the source did not say whether results were posted.
   */
  resultStatus: z.enum(["results_posted", "results_not_posted"]).nullable(),
  missingFields: z.array(z.string().trim().min(1)),
  sourceId: idSchema,
  limitations: z.array(z.string().trim().min(1)).min(1),
}).superRefine((trial, ctx) => {
  if (trial.id !== trial.nctId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["id"],
      message: "Trial id must equal the NCT ID",
    });
  }
});

export const assetTrialMappingSchema = z.object({
  id: idSchema,
  nctId: nctIdSchema,
  assetId: idSchema,
  rule: z.enum(["exact_intervention_name", "all_intervention_names"]),
  interventionNames: z.array(z.string().trim().min(1)).min(1),
  reviewedBy: z.string().trim().min(1),
  reviewedAt: z.iso.date(),
  note: z.string().trim().min(1),
});

export const endpointHierarchySchema = z.enum([
  "primary",
  "secondary",
  "exploratory",
  "safety",
]);

export const clinicalOutcomeSchema = z.object({
  id: idSchema,
  trialId: nctIdSchema,
  assetId: idSchema.optional(),
  endpointName: sourcedSchema(z.string().trim().min(1)),
  endpointHierarchy: sourcedSchema(endpointHierarchySchema),
  timepoint: sourcedSchema(z.string().trim().min(1)),
  treatmentArm: sourcedSchema(z.string().trim().min(1)),
  comparator: sourcedSchema(z.string().trim().min(1)),
  effectMeasure: sourcedSchema(z.string().trim().min(1)),
  treatmentValue: sourcedSchema(z.number().finite()),
  comparatorValue: sourcedSchema(z.number().finite()).optional(),
  unit: sourcedSchema(z.string().trim().min(1)).optional(),
  confidenceInterval: sourcedSchema(z.string().trim().min(1)).optional(),
  pValueRaw: sourcedSchema(z.string().trim().min(1)).optional(),
  responderRate: sourcedSchema(z.number().finite()).optional(),
  adverseEventMeasure: sourcedSchema(z.string().trim().min(1)).optional(),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const regulatoryEventTypeSchema = z.enum([
  "approval",
  "supplement_approval",
  "label_change",
  "safety_communication",
  "rejection",
  "complete_response_letter",
  "withdrawal",
  "designation",
  "filing",
  "other",
]);

export const regulatoryOutcomeSchema = z.enum([
  "approval",
  "rejection",
  "complete_response_letter",
  "withdrawal",
  "not_a_decision",
  "other",
]);

export const regulatoryEventSchema = z.object({
  id: idSchema,
  assetId: idSchema,
  jurisdiction: z.string().trim().min(1),
  regulator: z.string().trim().min(1),
  eventType: sourcedSchema(regulatoryEventTypeSchema),
  applicationType: sourcedSchema(z.string().trim().min(1)).optional(),
  applicationNumber: sourcedSchema(z.string().trim().min(1)).optional(),
  filingDate: sourcedSchema(partialDateSchema).optional(),
  decisionDate: sourcedSchema(partialDateSchema).optional(),
  designation: sourcedSchema(z.string().trim().min(1)).optional(),
  labelChange: sourcedSchema(z.string().trim().min(1)).optional(),
  indicationId: idSchema.optional(),
  indicationText: sourcedSchema(z.string().trim().min(1)).optional(),
  safetyCommunication: sourcedSchema(z.string().trim().min(1)).optional(),
  outcome: sourcedSchema(regulatoryOutcomeSchema),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const catalystCertaintySchema = z.enum([
  "document_date",
  "registry_estimated",
  "sponsor_announced",
]);

export const catalystSchema = z.object({
  id: idSchema,
  assetId: idSchema,
  catalystType: z.string().trim().min(1),
  relatedTrialId: nctIdSchema.optional(),
  relatedRegulatoryEventId: idSchema.optional(),
  questionResolved: z.string().trim().min(1),
  status: z.enum(["expected", "occurred", "missed", "unknown"]),
  date: sourcedSchema(partialDateSchema).extend({
    role: z.enum(["actual", "expected"]),
    certainty: catalystCertaintySchema,
  }),
  limitations: z.array(z.string().trim().min(1)).min(1),
}).superRefine((catalyst, ctx) => {
  if (
    catalyst.date.role === "actual" &&
    catalyst.date.certainty === "registry_estimated"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date", "certainty"],
      message: "A registry estimate is not a factual event date",
    });
  }
});

export const commercialCategorySchema = z.enum([
  "pricing",
  "reimbursement",
  "utilization",
  "market_share",
  "treatment_uptake",
  "diagnosis_rate",
  "adherence",
  "payer_restriction",
  "coding",
  "coverage",
]);

export const commercialEvidenceSchema = z.object({
  id: idSchema,
  subjectId: idSchema,
  category: commercialCategorySchema,
  metric: sourcedSchema(z.string().trim().min(1)),
  value: sourcedSchema(atomicEvidenceValueSchema),
  unit: z.string().trim().min(1).optional(),
  geography: geographySchema.optional(),
  populationId: idSchema.optional(),
  limitations: z.array(z.string().trim().min(1)).min(1),
});

export const evidenceConflictSchema = z.object({
  id: idSchema,
  subject: z.object({
    kind: z.enum([
      "disease",
      "population",
      "asset",
      "trial",
      "outcome",
      "regulatory_event",
      "catalyst",
      "commercial_evidence",
      "organization",
    ]),
    id: idSchema,
  }),
  field: z.string().trim().min(1),
  competingObservations: z.array(z.object({
    id: idSchema,
    value: atomicEvidenceValueSchema,
    sourceId: idSchema,
    evidenceKind: z.enum(["observed", "derived", "proxy"]),
  })),
  gap: z.string().trim().min(1).optional(),
  reason: z.enum([
    "different_values",
    "different_development_stage",
    "missing_primary_confirmation",
    "stale_superseded",
  ]),
  resolutionStatus: z.enum(["unresolved", "resolved_by_precedence"]),
  precedenceRule: z.string().trim().min(1).optional(),
  reviewerNote: z.string().trim().min(1),
}).superRefine((conflict, ctx) => {
  if (
    conflict.resolutionStatus === "resolved_by_precedence" &&
    !conflict.precedenceRule
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["precedenceRule"],
      message: "A resolved conflict must record its precedence rule",
    });
  }
  const needsPair = conflict.reason === "different_values" ||
    conflict.reason === "different_development_stage" ||
    conflict.reason === "stale_superseded";
  if (needsPair && conflict.competingObservations.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["competingObservations"],
      message: "This conflict reason requires two competing observations",
    });
  }
  if (
    conflict.reason === "missing_primary_confirmation" &&
    !conflict.gap
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["gap"],
      message: "Missing primary confirmation must describe the gap",
    });
  }
});

export const investmentThesisSchema = z.object({
  id: idSchema,
  layer: z.literal("analyst_assumption"),
  question: z.string().trim().min(1),
  diseaseId: idSchema,
  assetIds: z.array(idSchema).min(1),
  supportingEvidenceClaimIds: z.array(idSchema),
  contradictingEvidenceClaimIds: z.array(idSchema),
  unknowns: z.array(z.string().trim().min(1)).min(1),
  assumptions: z.array(analystAssumptionSchema).min(1),
  catalystIds: z.array(idSchema),
  killCriteria: z.array(z.string().trim().min(1)).min(1),
  lastReviewed: z.iso.date(),
  reviewedBy: z.string().trim().min(1),
}).strict();

export const therapeuticsGraphSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: idSchema,
  sources: z.array(therapeuticSourceSchema).min(1),
  diseases: z.array(diseaseSchema).min(1),
  populations: z.array(therapeuticPopulationSchema),
  indications: z.array(indicationSchema),
  interventionClasses: z.array(interventionClassSchema),
  assetClassLinks: z.array(assetClassLinkSchema),
  organizations: z.array(therapeuticOrganizationSchema),
  assets: z.array(therapeuticAssetSchema),
  trials: z.array(clinicalTrialSchema),
  assetTrialMappings: z.array(assetTrialMappingSchema),
  outcomes: z.array(clinicalOutcomeSchema),
  regulatoryEvents: z.array(regulatoryEventSchema),
  catalysts: z.array(catalystSchema),
  commercialEvidence: z.array(commercialEvidenceSchema),
  conflicts: z.array(evidenceConflictSchema),
  theses: z.array(investmentThesisSchema),
});

export type Disease = z.infer<typeof diseaseSchema>;
export type TherapeuticPopulation = z.infer<typeof therapeuticPopulationSchema>;
export type TherapeuticAsset = z.infer<typeof therapeuticAssetSchema>;
export type InterventionClass = z.infer<typeof interventionClassSchema>;
export type ClinicalTrial = z.infer<typeof clinicalTrialSchema>;
export type ClinicalOutcome = z.infer<typeof clinicalOutcomeSchema>;
export type RegulatoryEvent = z.infer<typeof regulatoryEventSchema>;
export type Catalyst = z.infer<typeof catalystSchema>;
export type CommercialEvidence = z.infer<typeof commercialEvidenceSchema>;
export type EvidenceConflict = z.infer<typeof evidenceConflictSchema>;
export type InvestmentThesis = z.infer<typeof investmentThesisSchema>;
export type AssetTrialMapping = z.infer<typeof assetTrialMappingSchema>;
export type AssetClassLink = z.infer<typeof assetClassLinkSchema>;
export type TherapeuticsGraph = z.infer<typeof therapeuticsGraphSchema>;
export type Indication = z.infer<typeof indicationSchema>;
export { nctIdSchema };
export type TherapeuticOrganization = z.infer<
  typeof therapeuticOrganizationSchema
>;
