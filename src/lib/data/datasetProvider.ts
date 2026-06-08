import process from 'node:process';
import { getCachedStaticVerifiedDataset } from './cachedDataset';
import type { DataMode, VerifiedDataset } from './datasetTypes';

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
