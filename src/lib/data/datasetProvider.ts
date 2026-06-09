import process from 'node:process';
import { getCachedStaticVerifiedDataset } from './cachedDataset';
import type { DataMode, VerifiedDataset } from './datasetTypes';
import {
  sliceVerifiedDataset,
  type DatasetResource,
  type DatasetSliceResult,
} from './sliceVerifiedDataset';

function getMode(): DataMode {
  const raw = process.env.LACUNA_DATA_MODE;
  return raw === 'db' ? 'db' : 'static';
}

export function getDataMode(): DataMode {
  return getMode();
}

export async function getVerifiedDataset(): Promise<VerifiedDataset> {
  if (getMode() === 'db') {
    const { loadVerifiedDatasetFromDb } = await import('./loadVerifiedDatasetFromDb');
    return loadVerifiedDatasetFromDb();
  }
  return getCachedStaticVerifiedDataset();
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
  const resource = request.resource ?? 'all';
  const queryOpts = {
    limit: request.limit,
    offset: request.offset,
    sector: request.sector,
    genomics: request.genomics,
  };

  if (getMode() === 'db') {
    const {
      loadProvenanceRow,
      loadCompaniesPage,
      loadAcquisitionsPage,
      loadAcquirersPage,
      countCompaniesPage,
      countAcquisitionsPage,
      countAcquirers,
    } = await import('./loadVerifiedDatasetFromDb');
    const { mapRowsToVerifiedDataset } = await import('./mapVerifiedDataset');

    const includeCompanies = resource === 'all' || resource === 'companies';
    const includeAcquisitions = resource === 'all' || resource === 'acquisitions';
    const includeAcquirers = resource === 'all' || resource === 'acquirers';

    const [provenance, companyRows, acquisitionRows, acquirerRows, companyTotal, acquisitionTotal, acquirerTotal] =
      await Promise.all([
        loadProvenanceRow(),
        includeCompanies ? loadCompaniesPage(queryOpts) : Promise.resolve([]),
        includeAcquisitions ? loadAcquisitionsPage(queryOpts) : Promise.resolve([]),
        includeAcquirers ? loadAcquirersPage(queryOpts) : Promise.resolve([]),
        countCompaniesPage(queryOpts),
        countAcquisitionsPage(queryOpts),
        countAcquirers(),
      ]);

    const mapped = mapRowsToVerifiedDataset(provenance, companyRows, acquirerRows, acquisitionRows);

    return {
      provenance: mapped.provenance,
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

  const dataset = await getCachedStaticVerifiedDataset();
  return sliceVerifiedDataset(dataset, {
    resource,
    limit: request.limit,
    offset: request.offset,
    sector: request.sector,
    genomics: request.genomics,
  });
}
