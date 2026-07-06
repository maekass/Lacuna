/**
 * HLTH Foundation / Outcomes4Me — State of Patient Empowerment Report (2022).
 *
 * Curated cited benchmarks with structured gap indices and portfolio crosswalk
 * metadata. Joined to Lacuna's verified dataset via `patientEmpowermentPipeline`.
 *
 * Do not merge into dataset.verified.json.
 */

import type { ModelProvenance } from "@/lib/provenance/modelProvenance";
import type {
  EmpowermentCarePhase,
  EmpowermentDataTier,
  EmpowermentGapSeverity,
  EmpowermentMetricPolarity,
  EmpowermentPrerequisiteId,
} from "@/lib/research/patientEmpowermentTaxonomy";
import { gapSeverityFromIndex } from "@/lib/research/patientEmpowermentTaxonomy";

export type {
  EmpowermentCarePhase,
  EmpowermentPrerequisiteId,
} from "@/lib/research/patientEmpowermentTaxonomy";

export interface EmpowermentPrerequisite {
  id: EmpowermentPrerequisiteId;
  label: string;
  summary: string;
}

export interface PatientEmpowermentMetric {
  id: string;
  label: string;
  citedValue: string;
  sourceYear: number;
  conditionScope: "breast_cancer_baseline";
  phase: EmpowermentCarePhase;
  prerequisiteId: EmpowermentPrerequisiteId;
  /**
   * 0–100 gap index: higher = more patients underserved on this dimension.
   * Derived from cited rates per report polarity.
   */
  gapIndexPct: number;
  polarity: EmpowermentMetricPolarity;
  gapSeverity: EmpowermentGapSeverity;
  /** Survey citation tier for the rate; index is derived_static */
  dataTier: EmpowermentDataTier;
  /** Lacuna sectors used for portfolio crosswalk */
  relatedSectors: readonly string[];
  /** Description keyword signals for company matching */
  matchKeywords: readonly string[];
  note?: string;
}

export interface PatientEmpowermentHeadline {
  reportVersion: string;
  sourceYear: number;
  stalenessNote: string;
  surveyRespondents: number;
  surveyWindow: string;
  publishedDate: string;
  hospitalsInRecordsAudit: number;
  medicalRecordsRequests: number;
  underservedAreaPct: number;
  communityHospitalPct: number;
  incomeUnder75kPct: number;
}

export const PATIENT_EMPOWERMENT_HEADLINE: PatientEmpowermentHeadline = {
  reportVersion: "2022.11.14",
  sourceYear: 2022,
  stalenessNote:
    "Static HLTH/Outcomes4Me baseline (Nov 2022). Check outcomes4me.com/empowerment2022 for updates — not live Lacuna patient data.",
  surveyRespondents: 1828,
  surveyWindow: "Oct 13 – Nov 1, 2022",
  publishedDate: "Nov 14, 2022",
  hospitalsInRecordsAudit: 1171,
  medicalRecordsRequests: 1862,
  underservedAreaPct: 72,
  communityHospitalPct: 62,
  incomeUnder75kPct: 57,
};

export const EMPOWERMENT_PREREQUISITES: readonly EmpowermentPrerequisite[] = [
  {
    id: "records-access",
    label: "Timely, actionable medical records",
    summary:
      "Full record access — not just portal snippets — in digestible formats when patients need them.",
  },
  {
    id: "care-team",
    label: "Trusted multidisciplinary care team",
    summary:
      "Consultative team available at decision points and for ad hoc questions.",
  },
  {
    id: "evidence-standards",
    label: "Evidence-based standards presented",
    summary:
      "Guideline-driven options, including clinical trials, shared during treatment discussions.",
  },
  {
    id: "life-goals",
    label: "Health and life goals integrated",
    summary:
      "Patient preferences documented and reflected in diagnosis, treatment, and recovery plans.",
  },
] as const;

function metric(
  partial: Omit<
    PatientEmpowermentMetric,
    "gapSeverity" | "dataTier" | "sourceYear" | "conditionScope"
  >,
): PatientEmpowermentMetric {
  return {
    ...partial,
    sourceYear: 2022,
    conditionScope: "breast_cancer_baseline",
    dataTier: "cited_survey_2022",
    gapSeverity: gapSeverityFromIndex(partial.gapIndexPct),
  };
}

/** Cited empowerment gaps with structured indices for pipeline joins. */
export const PATIENT_EMPOWERMENT_METRICS: readonly PatientEmpowermentMetric[] = [
  metric({
    id: "full-records-access",
    label: "Patients with full access to medical records",
    citedValue: "45%",
    gapIndexPct: 55,
    polarity: "asset_inverted",
    phase: "records",
    prerequisiteId: "records-access",
    relatedSectors: ["Digital Health", "Diagnostics", "Wearables"],
    matchKeywords: [
      "medical record",
      "health record",
      "patient portal",
      "interop",
      "fhir",
    ],
    note: "52% at community hospitals vs higher in academic settings.",
  }),
  metric({
    id: "hipaa-compliant-institutions",
    label: "Institutions fully compliant with HIPAA records requests",
    citedValue: "47%",
    gapIndexPct: 53,
    polarity: "asset_inverted",
    phase: "records",
    prerequisiteId: "records-access",
    relatedSectors: ["Digital Health", "Diagnostics"],
    matchKeywords: ["hipaa", "records request", "release of information"],
  }),
  metric({
    id: "records-not-understandable",
    label: "Cannot make sense of medical records",
    citedValue: "1 in 4",
    gapIndexPct: 25,
    polarity: "deficit_rate",
    phase: "records",
    prerequisiteId: "records-access",
    relatedSectors: ["Digital Health", "Diagnostics"],
    matchKeywords: ["patient-friendly", "plain language", "health literacy"],
  }),
  metric({
    id: "portal-diagnosis",
    label: "Learned cancer diagnosis via portal before care team",
    citedValue: "1 in 4",
    gapIndexPct: 25,
    polarity: "deficit_rate",
    phase: "diagnosis",
    prerequisiteId: "care-team",
    relatedSectors: ["Digital Health", "Breast Health", "Diagnostics"],
    matchKeywords: ["navigation", "care coordination", "patient engagement"],
  }),
  metric({
    id: "uncomfortable-advocating",
    label: "Did not feel comfortable advocating to care team",
    citedValue: "1 in 2",
    gapIndexPct: 50,
    polarity: "deficit_rate",
    phase: "diagnosis",
    prerequisiteId: "care-team",
    relatedSectors: ["Digital Health", "Breast Health", "Mental Health"],
    matchKeywords: ["advocacy", "navigation", "second opinion", "care team"],
  }),
  metric({
    id: "care-team-accessible",
    label: "Care team accessible to answer questions",
    citedValue: "~55%",
    gapIndexPct: 45,
    polarity: "asset_inverted",
    phase: "treatment",
    prerequisiteId: "care-team",
    relatedSectors: ["Digital Health", "Breast Health", "Precision Medicine"],
    matchKeywords: ["telehealth", "navigation", "oncology", "care coordination"],
  }),
  metric({
    id: "oncologist-listens",
    label: "Oncologist listens; wishes reflected in treatment plan",
    citedValue: "56%",
    gapIndexPct: 44,
    polarity: "asset_inverted",
    phase: "treatment",
    prerequisiteId: "life-goals",
    relatedSectors: ["Breast Health", "Precision Medicine", "Digital Health"],
    matchKeywords: [
      "shared decision",
      "patient preference",
      "treatment plan",
      "oncology",
    ],
  }),
  metric({
    id: "genetic-testing-not-recommended",
    label: "Not recommended genetic testing (NCCN: almost all should)",
    citedValue: "37%",
    gapIndexPct: 37,
    polarity: "deficit_rate",
    phase: "treatment",
    prerequisiteId: "evidence-standards",
    relatedSectors: ["Precision Medicine", "Diagnostics", "Breast Health"],
    matchKeywords: [
      "genetic",
      "genomic",
      "brca",
      "hereditary",
      "germline",
      "tumor profiling",
    ],
    note: "Disparities by hospital setting, income, and ethnicity.",
  }),
  metric({
    id: "clinical-trial-offered",
    label: "Presented with clinical trial as treatment option",
    citedValue: "1 in 5",
    gapIndexPct: 80,
    polarity: "asset_inverted",
    phase: "treatment",
    prerequisiteId: "evidence-standards",
    relatedSectors: ["Precision Medicine", "Breast Health", "Digital Health"],
    matchKeywords: [
      "clinical trial",
      "trial matching",
      "trial enrollment",
      "nct",
    ],
    note: "Diagnostics sector removed — sector overlap inflated heuristic coverage without trial-offering evidence.",
  }),
  metric({
    id: "no-survivorship-plan",
    label: "No survivorship care plan after active treatment",
    citedValue: "54%",
    gapIndexPct: 54,
    polarity: "deficit_rate",
    phase: "survivorship",
    prerequisiteId: "life-goals",
    relatedSectors: ["Breast Health", "Digital Health", "Precision Medicine"],
    matchKeywords: [
      "survivorship",
      "follow-up care",
      "remission",
      "recurrence monitoring",
    ],
  }),
  metric({
    id: "unaware-survivorship-resources",
    label: "Not aware of survivorship resources",
    citedValue: "2 in 3",
    gapIndexPct: 67,
    polarity: "deficit_rate",
    phase: "survivorship",
    prerequisiteId: "life-goals",
    relatedSectors: ["Breast Health", "Digital Health"],
    matchKeywords: ["survivorship", "support program", "patient community"],
    note: "Mental Health sector removed — general therapy apps lack breast-cancer survivorship resource evidence.",
  }),
  metric({
    id: "not-in-control",
    label: "Do not feel in control of care decisions",
    citedValue: "27%",
    gapIndexPct: 27,
    polarity: "deficit_rate",
    phase: "overall",
    prerequisiteId: "life-goals",
    relatedSectors: [
      "Digital Health",
      "Breast Health",
      "Precision Medicine",
      "Diagnostics",
    ],
    matchKeywords: ["empowerment", "decision support", "patient-centered"],
  }),
] as const;

export const PATIENT_EMPOWERMENT_SOURCES = [
  {
    label: "HLTH Foundation — State of Patient Empowerment (PDF)",
    reference:
      "Outcomes4Me & HLTH Foundation. The State of Patient Empowerment Report, 2022 Edition. Nov 14, 2022. Partnership with Boston Consulting Group and IQVIA.",
    url:
      "https://hlthfoundation.org/wp-content/uploads/State-of-Patient-Empowerment-Report_2022.11.14.pdf",
  },
  {
    label: "Outcomes4Me — empowerment2022",
    reference:
      "Full methodology and interactive results. outcomes4me.com/empowerment2022",
    url: "https://outcomes4me.com/empowerment2022",
  },
] as const;

export const PATIENT_EMPOWERMENT_MODEL: ModelProvenance = {
  module: "src/lib/research/patientEmpowermentPipeline.ts",
  exportName: "buildPatientEmpowermentSnapshot",
  definition:
    "HLTH/Outcomes4Me empowerment gaps crosswalked to Lacuna verified portfolio by sector + keyword affinity — descriptive only.",
};

/** @deprecated Use `citedValue` on metrics; kept for compact UI copy. */
export function formatCitedValue(metric: PatientEmpowermentMetric): string {
  return metric.citedValue;
}
