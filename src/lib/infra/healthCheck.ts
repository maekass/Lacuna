import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataMode } from '@/lib/data/datasetProvider';
import { isVariantStoreEnabled } from '@/lib/genomics/variantStoreConfig';
import { pingClickHouse } from '@/lib/genomics/clickhouseClient';
import type { VerifiedDataset } from '@/lib/data/datasetTypes';
import { validateVerifiedDataset } from '@/lib/data/validateVerifiedDataset';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(packageRoot, '../../..');

export interface DatabaseHealth {
  configured: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface DatasetHealth {
  ok: boolean;
  source: 'static' | 'db';
  companies: number;
  acquirers: number;
  acquisitions: number;
  lastUpdated?: string;
  validationErrors: number;
  validationWarnings: number;
}

export interface LivenessPayload {
  ok: true;
  service: 'lacuna';
  probe: 'live';
  version: string;
  dataMode: 'static' | 'db';
  timestamp: string;
  buildSha: string | null;
}

export interface VariantStoreHealth {
  enabled: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ReadinessPayload {
  ok: boolean;
  service: 'lacuna';
  probe: 'ready';
  version: string;
  dataMode: 'static' | 'db';
  timestamp: string;
  buildSha: string | null;
  checks: {
    dataset: DatasetHealth;
    database: DatabaseHealth;
    variantStore: VariantStoreHealth;
  };
}

function readAppVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function loadStaticDatasetMeta(): Pick<VerifiedDataset, 'provenance' | 'companies' | 'acquirers' | 'acquisitions'> {
  const path = join(repoRoot, 'src/data/dataset.verified.json');
  const dataset = JSON.parse(readFileSync(path, 'utf8')) as VerifiedDataset;
  return dataset;
}

async function pingDatabase(): Promise<DatabaseHealth> {
  const configured = Boolean(process.env.DATABASE_URL?.trim());
  if (!configured) {
    return { configured: false, ok: true };
  }

  const started = Date.now();
  try {
    const { query } = await import('@/lib/data/dbClient');
    await query('SELECT 1 AS ok');
    return {
      configured: true,
      ok: true,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'database ping failed';
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
    };
  }
}

async function countDatasetFromDb(): Promise<DatasetHealth> {
  const { query } = await import('@/lib/data/dbClient');
  const [provenanceRows, companyRows, acquirerRows, acquisitionRows] = await Promise.all([
    query<{ last_updated: string }>(
      'SELECT last_updated::text FROM dataset_provenance WHERE id = $1',
      [1],
    ),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM companies'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM acquirers'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM acquisitions'),
  ]);

  const companies = Number(companyRows[0]?.count ?? 0);
  const acquirers = Number(acquirerRows[0]?.count ?? 0);
  const acquisitions = Number(acquisitionRows[0]?.count ?? 0);
  const hasProvenance = provenanceRows.length > 0;

  return {
    ok: hasProvenance && companies > 0 && acquisitions > 0,
    source: 'db',
    companies,
    acquirers,
    acquisitions,
    lastUpdated: provenanceRows[0]?.last_updated,
    validationErrors: hasProvenance ? 0 : 1,
    validationWarnings: 0,
  };
}

async function checkDatasetFull(): Promise<DatasetHealth> {
  const mode = getDataMode();
  let dataset: VerifiedDataset;

  if (mode === 'db') {
    const { loadVerifiedDatasetFromDb } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    dataset = await loadVerifiedDatasetFromDb();
  } else {
    dataset = loadStaticDatasetMeta() as VerifiedDataset;
  }

  const report = validateVerifiedDataset(dataset);

  return {
    ok: report.ok,
    source: mode,
    companies: dataset.companies.length,
    acquirers: dataset.acquirers.length,
    acquisitions: dataset.acquisitions.length,
    lastUpdated: dataset.provenance.lastUpdated,
    validationErrors: report.errors.length,
    validationWarnings: report.warnings.length,
  };
}

/** Cheap liveness for uptime probes — no dataset load or validation. */
export function runLivenessCheck(): LivenessPayload {
  return {
    ok: true,
    service: 'lacuna',
    probe: 'live',
    version: readAppVersion(),
    dataMode: getDataMode(),
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
  };
}

async function pingVariantStore(): Promise<VariantStoreHealth> {
  if (!isVariantStoreEnabled()) {
    return { enabled: false, ok: true };
  }

  const result = await pingClickHouse();
  return {
    enabled: true,
    ok: result.ok,
    latencyMs: result.latencyMs,
    error: result.error,
  };
}

/** Readiness with counts; db mode uses COUNT(*) instead of full hydration. */
export async function runReadinessCheck(): Promise<ReadinessPayload> {
  const mode = getDataMode();
  const [dataset, database, variantStore] = await Promise.all([
    mode === 'db' ? countDatasetFromDb() : checkDatasetFull(),
    pingDatabase(),
    pingVariantStore(),
  ]);
  const ok = dataset.ok && database.ok && variantStore.ok;

  return {
    ok,
    service: 'lacuna',
    probe: 'ready',
    version: readAppVersion(),
    dataMode: mode,
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    checks: { dataset, database, variantStore },
  };
}

/** @deprecated Use runLivenessCheck or runReadinessCheck. */
export async function runHealthCheck(): Promise<ReadinessPayload> {
  return runReadinessCheck();
}
