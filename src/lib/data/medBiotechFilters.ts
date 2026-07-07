import type { VerifiedDataset } from "./datasetTypes";

/** Sectors treated as consumer / wellness — excluded from medicine & biotech scope. */
const CONSUMER_SECTORS = new Set([
  "Wearables",
  "General Wellness",
  "Consumer",
  "Sexual Wellness",
  "Wellness",
  "Mental Health",
]);

/** Sectors in medicine, biotech, diagnostics, and clinical women's health. */
const MED_BIOTECH_SECTORS = new Set([
  "Therapeutics",
  "Biotech",
  "Tech Bio",
  "Medical Device",
  "Diagnostic",
  "Diagnostics",
  "Precision Medicine",
  "Dermatology",
  "Menopause",
  "Gynecological Surgery",
  "Breast Health",
  "Contraception",
  "Oncology",
  "Cardiovascular",
  "Fertility",
  "Pelvic Health",
  "Reproductive Health",
  "Maternal Health",
  "Reproductive",
]);

const MED_EVIDENCE = new Set([
  "clinical_therapeutic",
  "diagnostic_genomic",
  "fertility_science",
]);

/** care_delivery kept only for clinical oncology / menopause platforms. */
const CARE_DELIVERY_KEEP_SECTORS = new Set(["Menopause", "Precision Medicine"]);

const CLINICAL_DIGITAL_KEYWORD =
  /trial|genomic|clinical|therapeutic|diagnostic|biotech|pharma|device|cures/i;

export interface MedBiotechCompanyRef {
  sector: string;
  evidenceClass?: string;
  name: string;
  description?: string;
}

/** Lacuna dataset views — medicine/biotech is the default product scope. */
export type DatasetScope = "med_biotech" | "consumer_health";

export const DATASET_SCOPE_LABELS: Readonly<Record<DatasetScope, string>> = {
  med_biotech: "Medicine & biotech",
  consumer_health: "Consumer health",
};

/**
 * Whether a company belongs in Lacuna's medicine & biotech scope.
 * Excludes consumer health, wearables, and consumer digital apps.
 */
export function isMedBiotechRelevantCompany(
  company: MedBiotechCompanyRef,
): boolean {
  if (CONSUMER_SECTORS.has(company.sector)) return false;
  if (company.evidenceClass === "consumer_wellness") return false;

  if (company.sector === "Digital Health") {
    if (company.evidenceClass === "portfolio_investment") {
      const haystack = `${company.name} ${company.description ?? ""}`;
      return CLINICAL_DIGITAL_KEYWORD.test(haystack);
    }
    return false;
  }

  if (company.evidenceClass === "portfolio_investment") {
    return MED_BIOTECH_SECTORS.has(company.sector);
  }

  if (company.evidenceClass === "care_delivery") {
    return CARE_DELIVERY_KEEP_SECTORS.has(company.sector);
  }

  if (company.evidenceClass && MED_EVIDENCE.has(company.evidenceClass)) {
    return true;
  }

  return MED_BIOTECH_SECTORS.has(company.sector);
}

/**
 * Whether a company belongs in the consumer health scope (wearables, wellness apps,
 * consumer digital health). Complement of {@link isMedBiotechRelevantCompany}.
 */
export function isConsumerHealthRelevantCompany(
  company: MedBiotechCompanyRef,
): boolean {
  return !isMedBiotechRelevantCompany(company);
}

function scopePredicate(
  scope: DatasetScope,
): (company: MedBiotechCompanyRef) => boolean {
  return scope === "med_biotech"
    ? isMedBiotechRelevantCompany
    : isConsumerHealthRelevantCompany;
}

/** Filter acquisitions whose targets match the given scope. */
export function filterScopedAcquisitions(
  acquisitions: VerifiedDataset["acquisitions"],
  companiesById: Map<string, VerifiedDataset["companies"][number]>,
  scope: DatasetScope,
): VerifiedDataset["acquisitions"] {
  const matches = scopePredicate(scope);
  return acquisitions.filter((deal) => {
    const target = companiesById.get(deal.targetId);
    return target ? matches(target) : false;
  });
}

/** Filter acquisitions whose targets are medicine / biotech relevant. */
export function filterMedBiotechAcquisitions(
  acquisitions: VerifiedDataset["acquisitions"],
  companiesById: Map<string, VerifiedDataset["companies"][number]>,
): VerifiedDataset["acquisitions"] {
  return filterScopedAcquisitions(acquisitions, companiesById, "med_biotech");
}

/** Return a dataset copy for the requested scope. */
export function applyDatasetScope(
  dataset: VerifiedDataset,
  scope: DatasetScope,
): VerifiedDataset {
  const matches = scopePredicate(scope);
  const companies = dataset.companies.filter(matches);
  const companyIds = new Set(companies.map((c) => c.id));
  const acquisitions = dataset.acquisitions.filter((d) =>
    companyIds.has(d.targetId)
  );

  return {
    ...dataset,
    companies,
    acquisitions,
  };
}

/** Return a dataset copy scoped to medicine & biotech companies and their deals. */
export function applyMedBiotechScope(
  dataset: VerifiedDataset,
): VerifiedDataset {
  return applyDatasetScope(dataset, "med_biotech");
}

/** Return a dataset copy scoped to consumer health companies and their deals. */
export function applyConsumerHealthScope(
  dataset: VerifiedDataset,
): VerifiedDataset {
  return applyDatasetScope(dataset, "consumer_health");
}
