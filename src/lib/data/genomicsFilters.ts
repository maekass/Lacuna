import type { VerifiedDataset } from "./datasetTypes";

const GENOMICS_KEYWORD =
  /genomic|genome|sequenc|brca|biomarker|hereditary|carrier screening|cgp|profiling|variant|exome|oncotype/i;

export interface GenomicsCompanyRef {
  sector: string;
  name: string;
  description: string;
}

/** Diagnostics sector and genomics-related portfolio companies. */
export function isGenomicsRelevantCompany(
  company: GenomicsCompanyRef,
): boolean {
  if (company.sector === "Diagnostics") return true;
  const haystack = `${company.name} ${company.description}`;
  return GENOMICS_KEYWORD.test(haystack);
}

/** Filter acquisitions whose targets are genomics-relevant. */
export function filterGenomicsAcquisitions(
  acquisitions: VerifiedDataset["acquisitions"],
  companiesById: Map<string, VerifiedDataset["companies"][number]>,
): VerifiedDataset["acquisitions"] {
  return acquisitions.filter((deal) => {
    const target = companiesById.get(deal.targetId);
    return target ? isGenomicsRelevantCompany(target) : false;
  });
}
