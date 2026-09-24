/**
 * Disclosure labels for women's-health research, AI, diagnostics, and
 * clinical-trial context.
 *
 * A status records whether suitable documentation was located. It does not
 * infer efficacy, safety, clinical utility, or fairness, and it is not linked
 * to Lacuna companies, acquirers, or verified deals.
 */

import { WHAM_BUSINESS_CASE_SOURCE } from "@/lib/research/womensHealthScope";

export type EvidenceDisclosureStatus =
  | "reported"
  | "not-reported"
  | "unknown"
  | "not-applicable";

export type EvidenceRepresentationDimensionId =
  | "sex_disaggregated_enrollment"
  | "sex_disaggregated_efficacy"
  | "sex_disaggregated_safety"
  | "demographic_representation"
  | "external_validation"
  | "prospective_validation"
  | "real_world_evidence"
  | "intended_use_clarity"
  | "data_provenance"
  | "subgroup_performance_reporting"
  | "regulatory_status"
  | "reimbursement_evidence";

export interface EvidenceRepresentationDimension {
  id: string;
  label: string;
  question: string;
  meaningOfReported: string;
  meaningOfUnknown: string;
  notEvidenceOf: string[];
  sourceIds: string[];
}

/** WHAM and Lux frame the questions. They do not clinically validate an answer. */
export type EvidenceContextSourceRole = "contextual";

export interface EvidenceContextSource {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly published: string;
  readonly role: EvidenceContextSourceRole;
  readonly scope: string;
  readonly notASourceOf: readonly string[];
}

export interface EvidenceDisclosureStatusMeaning {
  readonly status: EvidenceDisclosureStatus;
  readonly label: string;
  readonly meaning: string;
  readonly doesNotMean: readonly string[];
}

/**
 * A disclosure label for one dimension.
 * No company, acquirer, deal, or trial identifier belongs on this record.
 */
export interface EvidenceRepresentationDisclosure {
  readonly dimensionId: EvidenceRepresentationDimensionId;
  readonly status: EvidenceDisclosureStatus;
  /** What was reviewed, in plain language. Null when nothing was located. */
  readonly note: string | null;
}

export const EVIDENCE_DISCLOSURE_STATUS_ORDER = [
  "reported",
  "not-reported",
  "unknown",
  "not-applicable",
] as const satisfies readonly EvidenceDisclosureStatus[];

export const EVIDENCE_REPRESENTATION_DIMENSION_ORDER = [
  "sex_disaggregated_enrollment",
  "sex_disaggregated_efficacy",
  "sex_disaggregated_safety",
  "demographic_representation",
  "external_validation",
  "prospective_validation",
  "real_world_evidence",
  "intended_use_clarity",
  "data_provenance",
  "subgroup_performance_reporting",
  "regulatory_status",
  "reimbursement_evidence",
] as const satisfies readonly EvidenceRepresentationDimensionId[];

/** Reported means the disclosure exists, not that the disclosure is adequate. */
export const REPORTED_MEANS_DISCLOSURE_ONLY =
  "A reported status only means disclosure or documentation exists. It does not mean adequate quality, clinical validity, equity, or efficacy.";

/** Unknown means Lacuna has not located a review, not that the fact is absent. */
export const UNKNOWN_MEANS_NOT_REVIEWED =
  "An unknown status means Lacuna has not reviewed or located suitable evidence. It does not prove absence.";

/** Not-reported is a gap in reviewed documentation, not a worldly negative proof. */
export const NOT_REPORTED_MEANS_DOCUMENTATION_GAP =
  "A not-reported status means reviewed material does not contain the disclosure. It does not prove the underlying fact is absent, and it is not a judgment of quality, equity, or clinical performance.";

/** Not-applicable is a scope label, not a clinical or regulatory finding. */
export const NOT_APPLICABLE_MEANS_OUT_OF_SCOPE =
  "A not-applicable status means the dimension does not apply to the artifact under review. It is not a finding of safety, efficacy, fairness, coverage, or regulatory status.";

/**
 * Hard boundary for every status. Prevents clinical, regulatory, investment,
 * model, and patient-level readings.
 */
export const EVIDENCE_REPRESENTATION_USE_BOUNDARY =
  "These labels are descriptive research context. They are not a clinical recommendation, regulatory determination, investment recommendation, model-performance guarantee, or patient-level decision support.";

export const EVIDENCE_REPRESENTATION_SCOPE =
  "Vocabulary and disclosure labels only. Not linked to Lacuna companies, acquirers, deals, or trial records, and not a numeric completeness score.";

export const CONTEXT_SOURCES_ARE_NOT_VALIDATION =
  "WHAM and Lux are contextual sources for why these questions are asked. They are not clinical validation sources, and citing them does not establish efficacy, safety, clinical utility, or fairness.";

const NOT_CLINICAL_VALIDATION = [
  "clinical validation",
  "efficacy",
  "safety",
  "clinical utility",
  "fairness",
  "regulatory determination",
] as const;

export const WHAM_EVIDENCE_CONTEXT_SOURCE: EvidenceContextSource = {
  id: "wham-business-case-january-2026",
  label: WHAM_BUSINESS_CASE_SOURCE.label,
  url: WHAM_BUSINESS_CASE_SOURCE.url ?? "",
  published: "January 2026",
  role: "contextual",
  scope:
    "Women's-health investment and research-gap context, including attention to clinical representation. Not a validation of any product, trial, or model.",
  notASourceOf: [...NOT_CLINICAL_VALIDATION],
};

export const LUX_AI_WOMENS_HEALTH_SOURCE: EvidenceContextSource = {
  id: "lux-ai-womens-health-2025",
  label:
    "Lux Capital, Deena Shakir, Unlocking Potential: Artificial Intelligence for Women's Health, January 8, 2025",
  url:
    "https://www.luxcapital.com/news/unlocking-potential-artificial-intelligence-for-womens-health",
  published: "January 8, 2025",
  role: "contextual",
  scope:
    "Investor research context on AI opportunities and historical research gaps in women's health. Not a clinical validation of any model, diagnostic, or trial.",
  notASourceOf: [...NOT_CLINICAL_VALIDATION],
};

export const EVIDENCE_CONTEXT_SOURCES = [
  WHAM_EVIDENCE_CONTEXT_SOURCE,
  LUX_AI_WOMENS_HEALTH_SOURCE,
] as const satisfies readonly EvidenceContextSource[];

const CONTEXT_SOURCE_IDS = EVIDENCE_CONTEXT_SOURCES.map((source) => source.id);

const SHARED_NOT_EVIDENCE = [
  "adequate quality",
  "clinical validity",
  "equity",
  "efficacy",
  "safety",
  "clinical utility",
  "fairness",
] as const;

function dimension(
  id: EvidenceRepresentationDimensionId,
  label: string,
  question: string,
  meaningOfReported: string,
  meaningOfUnknown: string,
  extraNotEvidenceOf: readonly string[],
): EvidenceRepresentationDimension {
  return {
    id,
    label,
    question,
    meaningOfReported,
    meaningOfUnknown,
    notEvidenceOf: [...SHARED_NOT_EVIDENCE, ...extraNotEvidenceOf],
    sourceIds: [...CONTEXT_SOURCE_IDS],
  };
}

export const EVIDENCE_REPRESENTATION_DIMENSIONS: Record<
  EvidenceRepresentationDimensionId,
  EvidenceRepresentationDimension
> = {
  sex_disaggregated_enrollment: dimension(
    "sex_disaggregated_enrollment",
    "Sex-disaggregated enrollment",
    "Does reviewed material report enrollment counts or proportions separated by sex?",
    "Reviewed material discloses enrollment separated by sex. Disclosure is not evidence that enrollment was adequate, representative, or equitable.",
    "Lacuna has not reviewed or located suitable sex-disaggregated enrollment disclosure. Unknown is not a finding that such enrollment reporting is absent.",
    ["adequate enrollment", "representativeness"],
  ),
  sex_disaggregated_efficacy: dimension(
    "sex_disaggregated_efficacy",
    "Sex-disaggregated efficacy",
    "Does reviewed material report efficacy or effectiveness results separated by sex?",
    "Reviewed material discloses an efficacy or effectiveness result separated by sex. Disclosure is not evidence that the result is adequate, favorable, or clinically valid.",
    "Lacuna has not reviewed or located suitable sex-disaggregated efficacy disclosure. Unknown is not a finding that such a result is absent.",
    ["clinical benefit", "favorable effect"],
  ),
  sex_disaggregated_safety: dimension(
    "sex_disaggregated_safety",
    "Sex-disaggregated safety",
    "Does reviewed material report safety results separated by sex?",
    "Reviewed material discloses a safety result separated by sex. Disclosure is not evidence that the product or intervention is safe.",
    "Lacuna has not reviewed or located suitable sex-disaggregated safety disclosure. Unknown is not a finding that such a result is absent.",
    ["absence of harm", "tolerability"],
  ),
  demographic_representation: dimension(
    "demographic_representation",
    "Demographic representation",
    "Does reviewed material report demographic composition of the studied population, such as age, race, ethnicity, or geography?",
    "Reviewed material discloses demographic composition. Disclosure is not evidence that the population was representative, fair, or adequate.",
    "Lacuna has not reviewed or located suitable demographic-composition disclosure. Unknown is not a finding that demographic reporting is absent.",
    ["adequate representation", "generalizability"],
  ),
  external_validation: dimension(
    "external_validation",
    "External validation",
    "Does reviewed material document validation on data, sites, or people held out from development?",
    "Reviewed material documents an external or held-out validation. Documentation is not a performance guarantee or proof of clinical validity.",
    "Lacuna has not reviewed or located suitable external-validation documentation. Unknown is not a finding that external validation is absent.",
    ["model-performance guarantee", "generalizability"],
  ),
  prospective_validation: dimension(
    "prospective_validation",
    "Prospective validation",
    "Does reviewed material document validation that was specified before the outcome data were analyzed?",
    "Reviewed material documents a prospective validation plan or result. Documentation is not proof of clinical utility or future performance.",
    "Lacuna has not reviewed or located suitable prospective-validation documentation. Unknown is not a finding that prospective validation is absent.",
    ["model-performance guarantee", "future performance"],
  ),
  real_world_evidence: dimension(
    "real_world_evidence",
    "Real-world evidence",
    "Does reviewed material document evidence from routine care, registries, claims, devices, or other non-trial settings?",
    "Reviewed material documents a real-world evidence source. Documentation is not proof of effectiveness, safety, or representativeness.",
    "Lacuna has not reviewed or located suitable real-world evidence documentation. Unknown is not a finding that real-world evidence is absent.",
    ["effectiveness", "causal effect", "representativeness"],
  ),
  intended_use_clarity: dimension(
    "intended_use_clarity",
    "Intended-use clarity",
    "Does reviewed material state who the study, tool, or product is for and what use it is meant to inform?",
    "Reviewed material states an intended use or study purpose. That statement is not a regulatory clearance or permission for patient-level decisions.",
    "Lacuna has not reviewed or located a suitable intended-use statement. Unknown is not a finding that an intended use is undocumented.",
    [
      "regulatory clearance",
      "patient-level decision support",
      "clinical recommendation",
    ],
  ),
  data_provenance: dimension(
    "data_provenance",
    "Data provenance",
    "Does reviewed material describe where the data came from, which population it covers, and how it was selected?",
    "Reviewed material describes data origin and selection. That description is not proof the data are complete, unbiased, or fit for a clinical purpose.",
    "Lacuna has not reviewed or located a suitable data-provenance description. Unknown is not a finding that provenance is undocumented.",
    ["data completeness", "freedom from bias"],
  ),
  subgroup_performance_reporting: dimension(
    "subgroup_performance_reporting",
    "Subgroup performance reporting",
    "Does reviewed material report performance or outcomes for stated subgroups, rather than only an overall result?",
    "Reviewed material discloses subgroup results. Disclosure is not evidence that subgroups were adequately powered, fairly compared, or clinically meaningful.",
    "Lacuna has not reviewed or located suitable subgroup-performance disclosure. Unknown is not a finding that subgroup results are absent.",
    ["adequate power", "clinically meaningful difference"],
  ),
  regulatory_status: dimension(
    "regulatory_status",
    "Regulatory status",
    "Does reviewed material document a regulatory application, authorization, clearance, or other status for a stated product or use?",
    "Reviewed material documents a regulatory status. Documentation is not a Lacuna regulatory determination and does not establish clinical utility.",
    "Lacuna has not reviewed or located a suitable regulatory-status record. Unknown is not a finding that a product is approved or unapproved.",
    ["Lacuna regulatory determination", "marketing authorization"],
  ),
  reimbursement_evidence: dimension(
    "reimbursement_evidence",
    "Reimbursement evidence",
    "Does reviewed material document coverage, coding, payment, or a package assembled for a reimbursement question?",
    "Reviewed material documents reimbursement-related material. Documentation is not proof of coverage, payment, clinical utility, or commercial success.",
    "Lacuna has not reviewed or located suitable reimbursement documentation. Unknown is not a finding that coverage or payment evidence is absent.",
    ["coverage determination", "payment", "commercial success"],
  ),
};

export const EVIDENCE_DISCLOSURE_STATUS_MEANINGS: Record<
  EvidenceDisclosureStatus,
  EvidenceDisclosureStatusMeaning
> = {
  reported: {
    status: "reported",
    label: "Reported",
    meaning: REPORTED_MEANS_DISCLOSURE_ONLY,
    doesNotMean: [
      "adequate quality",
      "clinical validity",
      "equity",
      "efficacy",
      "safety",
      "clinical utility",
      "fairness",
    ],
  },
  "not-reported": {
    status: "not-reported",
    label: "Not reported",
    meaning: NOT_REPORTED_MEANS_DOCUMENTATION_GAP,
    doesNotMean: [
      "proof of absence",
      "inadequate quality",
      "inequity",
      "lack of efficacy",
      "lack of safety",
    ],
  },
  unknown: {
    status: "unknown",
    label: "Unknown",
    meaning: UNKNOWN_MEANS_NOT_REVIEWED,
    doesNotMean: [
      "proof of absence",
      "negative finding",
      "failed review",
      "lack of efficacy",
      "lack of safety",
    ],
  },
  "not-applicable": {
    status: "not-applicable",
    label: "Not applicable",
    meaning: NOT_APPLICABLE_MEANS_OUT_OF_SCOPE,
    doesNotMean: [
      "safety",
      "efficacy",
      "fairness",
      "coverage",
      "regulatory status",
    ],
  },
};

/** Metadata for one contextual source. Not a clinical validation source. */
export function getEvidenceContextSource(
  sourceId: string,
): EvidenceContextSource | undefined {
  return EVIDENCE_CONTEXT_SOURCES.find((source) => source.id === sourceId);
}

/** True when the source is labeled contextual rather than clinical validation. */
export function isContextualEvidenceSource(
  source: EvidenceContextSource,
): boolean {
  return source.role === "contextual" &&
    source.notASourceOf.includes("clinical validation");
}

/** All representation dimensions in display order. */
export function listEvidenceRepresentationDimensions(): readonly EvidenceRepresentationDimension[] {
  return EVIDENCE_REPRESENTATION_DIMENSION_ORDER.map(
    (id) => EVIDENCE_REPRESENTATION_DIMENSIONS[id],
  );
}

/** Metadata for one dimension. Does not classify any company or deal. */
export function getEvidenceRepresentationDimension(
  id: EvidenceRepresentationDimensionId,
): EvidenceRepresentationDimension {
  return EVIDENCE_REPRESENTATION_DIMENSIONS[id];
}

/** Meaning of a disclosure status, independent of any dimension. */
export function getEvidenceDisclosureStatusMeaning(
  status: EvidenceDisclosureStatus,
): EvidenceDisclosureStatusMeaning {
  return EVIDENCE_DISCLOSURE_STATUS_MEANINGS[status];
}

export interface EvidenceRepresentationReading {
  readonly dimension: EvidenceRepresentationDimension;
  readonly status: EvidenceDisclosureStatusMeaning;
  readonly statement: string;
  readonly useBoundary: string;
}

/**
 * Plain-language reading of one dimension at one status.
 * Combines dimension copy with the global disclosure rules. No score.
 */
export function describeEvidenceRepresentation(
  dimensionId: EvidenceRepresentationDimensionId,
  status: EvidenceDisclosureStatus,
): EvidenceRepresentationReading {
  const dimensionMeta = getEvidenceRepresentationDimension(dimensionId);
  const statusMeta = getEvidenceDisclosureStatusMeaning(status);
  const detail = status === "reported"
    ? dimensionMeta.meaningOfReported
    : status === "unknown"
    ? dimensionMeta.meaningOfUnknown
    : statusMeta.meaning;
  return {
    dimension: dimensionMeta,
    status: statusMeta,
    statement: `${detail} ${statusMeta.meaning}`,
    useBoundary: EVIDENCE_REPRESENTATION_USE_BOUNDARY,
  };
}

/** True when a dimension record carries no numeric completeness field. */
export function dimensionOmitsNumericFields(
  dimensionMeta: EvidenceRepresentationDimension,
): boolean {
  return Object.values(dimensionMeta).every((value) =>
    typeof value !== "number"
  );
}
