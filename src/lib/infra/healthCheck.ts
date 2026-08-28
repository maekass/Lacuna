import process from "node:process";
import packageJson from "../../../package.json";
import { getDataMode } from "@/lib/data/datasetProvider";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { isVariantStoreEnabled } from "@/lib/genomics/variantStoreConfig";
import { pingClickHouse } from "@/lib/genomics/clickhouseClient";
import { getDroppedAuditCount } from "@/lib/compliance/droppedAuditCounter";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { validateVerifiedDataset } from "@/lib/data/validateVerifiedDataset";

export interface DatabaseHealth {
  configured: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface DatasetHealth {
  ok: boolean;
  source: "static" | "db";
  companies: number;
  acquirers: number;
  acquisitions: number;
  lastUpdated?: string;
  validationErrors: number;
  validationWarnings: number;
}

export interface LivenessPayload {
  ok: true;
  service: "lacuna";
  probe: "live";
  version: string;
  dataMode: "static" | "db";
  timestamp: string;
  buildSha: string | null;
  droppedAuditEvents: number;
}

export interface VariantStoreHealth {
  enabled: boolean;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ReadinessPayload {
  ok: boolean;
  service: "lacuna";
  probe: "ready";
  version: string;
  dataMode: "static" | "db";
  timestamp: string;
  buildSha: string | null;
  checks: {
    dataset: DatasetHealth;
    database: DatabaseHealth;
    variantStore: VariantStoreHealth;
  };
}

/** Bundled at compile time — `readFileSync(package.json)` fails on Vercel serverless. */
function readAppVersion(): string {
  return packageJson.version;
}

function loadStaticDatasetMeta(): Pick<
  VerifiedDataset,
  "provenance" | "companies" | "acquirers" | "acquisitions"
> {
  // Bundled JSON import — readFileSync fails on Vercel serverless (file not on disk).
  return getStaticVerifiedDataset();
}

async function pingDatabase(): Promise<DatabaseHealth> {
  const configured = Boolean(process.env.DATABASE_URL?.trim());
  if (!configured) {
    return { configured: false, ok: true };
  }

  const started = Date.now();
  try {
    const { query } = await import("@/lib/data/dbClient");
    await query("SELECT 1 AS ok");
    return {
      configured: true,
      ok: true,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "database ping failed";
    return {
      configured: true,
      ok: false,
      latencyMs: Date.now() - started,
      error: message,
    };
  }
}

async function countDatasetFromDb(): Promise<DatasetHealth> {
  const { query } = await import("@/lib/data/dbClient");
  const [provenanceRows, companyRows, acquirerRows, acquisitionRows] =
    await Promise.all([
      query<{ last_updated: string }>(
        "SELECT last_updated::text FROM dataset_provenance WHERE id = $1",
        [1],
      ),
      query<{ count: string }>("SELECT COUNT(*)::text AS count FROM companies"),
      query<{ count: string }>("SELECT COUNT(*)::text AS count FROM acquirers"),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM acquisitions",
      ),
    ]);

  const companies = Number(companyRows[0]?.count ?? 0);
  const acquirers = Number(acquirerRows[0]?.count ?? 0);
  const acquisitions = Number(acquisitionRows[0]?.count ?? 0);
  const hasProvenance = provenanceRows.length > 0;

  return {
    ok: hasProvenance && companies > 0 && acquisitions > 0,
    source: "db",
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

  if (mode === "db") {
    const { loadVerifiedDatasetFromDb } = await import(
      "@/lib/data/loadVerifiedDatasetFromDb"
    );
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
    service: "lacuna",
    probe: "live",
    version: readAppVersion(),
    dataMode: getDataMode(),
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    droppedAuditEvents: getDroppedAuditCount(),
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
    mode === "db" ? countDatasetFromDb() : checkDatasetFull(),
    pingDatabase(),
    pingVariantStore(),
  ]);
  // Static mode serves the bundled dataset; a stale DATABASE_URL must not fail ready.
  const ok = dataset.ok && (mode === "db" ? database.ok : true) &&
    variantStore.ok;

  return {
    ok,
    service: "lacuna",
    probe: "ready",
    version: readAppVersion(),
    dataMode: mode,
    timestamp: new Date().toISOString(),
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    checks: { dataset, database, variantStore },
  };
}

/** @deprecated Use runLivenessCheck or runReadinessCheck. */
export function runHealthCheck(): Promise<ReadinessPayload> {
  return runReadinessCheck();
}
