import process from "node:process";
import { getCachedStaticVerifiedDataset } from "./cachedDataset";
import type { DataMode, VerifiedDataset } from "./datasetTypes";
import { type DatasetIdentity, hashDataset } from "@/lib/lineage/datasetHash";
import {
  type DatasetResource,
  type DatasetSliceResult,
  sliceVerifiedDataset,
} from "./sliceVerifiedDataset";

function getMode(): DataMode {
  const raw = process.env.LACUNA_DATA_MODE;
  return raw === "db" ? "db" : "static";
}

const datasetIdentities = new WeakMap<VerifiedDataset, DatasetIdentity>();
const dbIdentities = new Map<string, Promise<DatasetIdentity>>();

export function getDataMode(): DataMode {
  return getMode();
}

export async function getVerifiedDataset(): Promise<VerifiedDataset> {
  let dataset: VerifiedDataset;
  if (getMode() === "db") {
    const { loadVerifiedDatasetFromDb } = await import(
      "./loadVerifiedDatasetFromDb"
    );
    dataset = await loadVerifiedDatasetFromDb();
  } else {
    dataset = await getCachedStaticVerifiedDataset();
  }
  return withDatasetIdentity(dataset);
}

function withDatasetIdentity(dataset: VerifiedDataset): VerifiedDataset {
  let identity = datasetIdentities.get(dataset);
  if (!identity) {
    identity = hashDataset(dataset);
    datasetIdentities.set(dataset, identity);
  }
  return {
    ...dataset,
    provenance: {
      ...dataset.provenance,
      datasetHash: identity.fullHash,
    },
  };
}

function dbRevisionKey(provenance: {
  readonly last_updated: Date | string;
  readonly purpose: string;
  readonly disclaimer: string;
  readonly sources: readonly string[];
  readonly notes: readonly string[];
}): string {
  return JSON.stringify([
    String(provenance.last_updated),
    provenance.purpose,
    provenance.disclaimer,
    provenance.sources,
    provenance.notes,
  ]);
}

async function getCachedDbIdentity(
  provenance: Parameters<typeof dbRevisionKey>[0],
): Promise<DatasetIdentity> {
  const key = dbRevisionKey(provenance);
  const cached = dbIdentities.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const { loadVerifiedDatasetFromDb } = await import(
      "./loadVerifiedDatasetFromDb"
    );
    return hashDataset(await loadVerifiedDatasetFromDb());
  })();
  dbIdentities.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    dbIdentities.delete(key);
    throw error;
  }
}

export interface VerifiedDatasetPageRequest {
  resource?: DatasetResource;
  limit: number;
  offset: number;
  sector?: string;
  genomics?: boolean;
}

/**
 * Paginated dataset access for large catalogs (e.g. genomics diagnostics portfolios).
 * Static mode slices the cached JSON; db mode uses LIMIT/OFFSET queries.
 */
export async function getVerifiedDatasetPage(
  request: VerifiedDatasetPageRequest,
): Promise<DatasetSliceResult> {
  const resource = request.resource ?? "all";
  const queryOpts = {
    limit: request.limit,
    offset: request.offset,
    sector: request.sector,
    genomics: request.genomics,
  };

  if (getMode() === "db") {
    const {
      loadProvenanceRow,
      loadCompaniesPage,
      loadAcquisitionsPage,
      loadAcquirersPage,
      countCompaniesPage,
      countAcquisitionsPage,
      countAcquirers,
    } = await import("./loadVerifiedDatasetFromDb");
    const { mapRowsToVerifiedDataset } = await import("./mapVerifiedDataset");

    const includeCompanies = resource === "all" || resource === "companies";
    const includeAcquisitions = resource === "all" ||
      resource === "acquisitions";
    const includeAcquirers = resource === "all" || resource === "acquirers";

    const [
      provenance,
      companyRows,
      acquisitionRows,
      acquirerRows,
      companyTotal,
      acquisitionTotal,
      acquirerTotal,
    ] = await Promise.all([
      loadProvenanceRow(),
      includeCompanies ? loadCompaniesPage(queryOpts) : Promise.resolve([]),
      includeAcquisitions
        ? loadAcquisitionsPage(queryOpts)
        : Promise.resolve([]),
      includeAcquirers ? loadAcquirersPage(queryOpts) : Promise.resolve([]),
      countCompaniesPage(queryOpts),
      countAcquisitionsPage(queryOpts),
      countAcquirers(),
    ]);

    const mapped = mapRowsToVerifiedDataset(
      provenance,
      companyRows,
      acquirerRows,
      acquisitionRows,
    );
    const identity = await getCachedDbIdentity(provenance);

    return {
      provenance: {
        ...mapped.provenance,
        datasetHash: identity.fullHash,
      },
      companies: includeCompanies ? mapped.companies : [],
      acquirers: includeAcquirers ? mapped.acquirers : [],
      acquisitions: includeAcquisitions ? mapped.acquisitions : [],
      meta: {
        resource,
        limit: request.limit,
        offset: request.offset,
        sector: request.sector,
        genomics: request.genomics ?? false,
        total: {
          companies: companyTotal,
          acquisitions: acquisitionTotal,
          acquirers: acquirerTotal,
        },
      },
    };
  }

  const dataset = await getVerifiedDataset();
  return sliceVerifiedDataset(dataset, {
    resource,
    limit: request.limit,
    offset: request.offset,
    sector: request.sector,
    genomics: request.genomics,
  });
}
