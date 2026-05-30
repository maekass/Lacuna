import type { DataMode, VerifiedDataset } from './datasetTypes';

// Static dataset is always available (demo never breaks).
import staticVerifiedDataset from '@/data/dataset.verified.json';
import process from "node:process";

function getMode(): DataMode {
  const raw = process.env.LACUNA_DATA_MODE;
  return raw === 'db' ? 'db' : 'static';
}

function getFromDb(): VerifiedDataset {
  /**
   * Placeholder for DB-backed mode.
   *
   * This keeps a clean seam for when you add:
   * - Postgres (e.g., Vercel Postgres/Neon)
   * - ingestion scripts
   * - provenance-per-field storage
   *
   * For now we fall back to static to avoid breaking builds.
   */
  return staticVerifiedDataset as VerifiedDataset;
}

export function getVerifiedDataset(): Promise<VerifiedDataset> {
  const mode = getMode();
  if (mode === 'db') return Promise.resolve(getFromDb());
  return Promise.resolve(staticVerifiedDataset as VerifiedDataset);
}

