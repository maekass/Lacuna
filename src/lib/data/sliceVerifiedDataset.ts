import type { VerifiedDataset } from "./datasetTypes";
import {
  filterGenomicsAcquisitions,
  isGenomicsRelevantCompany,
} from "./genomicsFilters";

export type DatasetResource =
  | "companies"
  | "acquisitions"
  | "acquirers"
  | "all";

export interface DatasetSliceOptions {
  resource?: DatasetResource;
  limit: number;
  offset: number;
  sector?: string;
  genomics?: boolean;
}

export interface DatasetSliceResult {
  provenance: VerifiedDataset["provenance"];
  companies: VerifiedDataset["companies"];
  acquirers: VerifiedDataset["acquirers"];
  acquisitions: VerifiedDataset["acquisitions"];
  meta: {
    resource: DatasetResource;
    limit: number;
    offset: number;
    sector?: string;
    genomics: boolean;
    total: { companies: number; acquisitions: number; acquirers: number };
  };
}

function paginate<T>(items: T[], limit: number, offset: number): T[] {
  return items.slice(offset, offset + limit);
}

/** Slice an in-memory verified dataset without loading extra copies from disk. */
export function sliceVerifiedDataset(
  dataset: VerifiedDataset,
  options: DatasetSliceOptions,
): DatasetSliceResult {
  const resource = options.resource ?? "all";
  const companiesById = new Map(dataset.companies.map((c) => [c.id, c]));

  let companies = dataset.companies;
  let acquisitions = dataset.acquisitions;

  if (options.sector) {
    companies = companies.filter((c) => c.sector === options.sector);
    const sectorIds = new Set(companies.map((c) => c.id));
    acquisitions = acquisitions.filter((d) => sectorIds.has(d.targetId));
  }

  if (options.genomics) {
    companies = companies.filter(isGenomicsRelevantCompany);
    acquisitions = filterGenomicsAcquisitions(acquisitions, companiesById);
  }

  const totals = {
    companies: companies.length,
    acquisitions: acquisitions.length,
    acquirers: dataset.acquirers.length,
  };

  const slicedCompanies = resource === "all" || resource === "companies"
    ? paginate(companies, options.limit, options.offset)
    : [];
  const slicedAcquisitions = resource === "all" || resource === "acquisitions"
    ? paginate(acquisitions, options.limit, options.offset)
    : [];
  const slicedAcquirers = resource === "all" || resource === "acquirers"
    ? paginate(dataset.acquirers, options.limit, options.offset)
    : [];

  return {
    provenance: dataset.provenance,
    companies: slicedCompanies,
    acquirers: slicedAcquirers,
    acquisitions: slicedAcquisitions,
    meta: {
      resource,
      limit: options.limit,
      offset: options.offset,
      sector: options.sector,
      genomics: options.genomics ?? false,
      total: totals,
    },
  };
}
