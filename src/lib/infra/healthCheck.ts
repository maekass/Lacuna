import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataMode } from '@/lib/data/datasetProvider';
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

export interface HealthPayload {
  ok: boolean;
  service: 'lacuna';
  version: string;
  dataMode: 'static' | 'db';
  timestamp: string;
  buildSha: string | null;
  checks: {
    dataset: DatasetHealth;
    database: DatabaseHealth;
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

function loadStaticDataset(): VerifiedDataset {
  const path = join(repoRoot, 'src/data/dataset.verified.json');
  return JSON.parse(readFileSync(path, 'utf8')) as VerifiedDataset;
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

async function checkDataset(): Promise<DatasetHealth> {
  const mode = getDataMode();
  let dataset: VerifiedDataset;

  if (mode === 'db') {
    const { loadVerifiedDatasetFromDb } = await import('@/lib/data/loadVerifiedDatasetFromDb');
    dataset = await loadVerifiedDatasetFromDb();
  } else {
    dataset = loadStaticDataset();
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

/** Aggregate readiness for load balancers, Datadog synthetics, and `npm run infra:check`. */
export async function runHealthCheck(): Promise<HealthPayload> {
  const [dataset, database] = await Promise.all([checkDataset(), pingDatabase()]);
  const ok = dataset.ok && database.ok;

  return {
    ok,
    service: 'lacuna',
    version: readAppVersion(),
    dataMode: getDataMode(),
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    checks: { dataset, database },
  };
}
