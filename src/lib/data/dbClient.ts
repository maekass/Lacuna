import process from "node:process";
import { readFileSync } from "node:fs";
import type { ConnectionOptions } from "node:tls";
import { Pool, type QueryResultRow } from "pg";
import { reportError, reportWarning } from "@/lib/observability/reportError";
import { assertRemotePostgresTlsEnabled } from "@/lib/data/pgSslPolicy";

let pool: Pool | undefined;
let poolOverride: Pool | undefined;

const INLINE_PEM_MARKER = "-----BEGIN ";

/** Inject an in-memory pool (pg-mem) for integration tests. */
export function setPoolForTests(testPool: Pool | undefined): void {
  poolOverride = testPool;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required when LACUNA_DATA_MODE=db");
  }
  return url;
}

function readSslRootCert(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes(INLINE_PEM_MARKER)) {
    return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
  }
  return readFileSync(trimmed, "utf8");
}

/**
 * Resolve `pg` Pool `ssl` from env. Default verifies server certificates.
 * `PGSSLMODE=disable` turns TLS off (local Docker). `PGSSLROOTCERT` is a file
 * path or inline PEM. `PGSSL_ALLOW_UNVERIFIED=true` is an explicit MITM-prone
 * escape hatch and logs a warning.
 */
export function resolvePgSslConfig(): ConnectionOptions | undefined {
  if (process.env.PGSSLMODE === "disable") {
    return undefined;
  }

  if (process.env.PGSSL_ALLOW_UNVERIFIED === "true") {
    reportWarning(
      "db.ssl",
      "PGSSL_ALLOW_UNVERIFIED=true disables TLS certificate verification (MITM-able)",
    );
    return { rejectUnauthorized: false };
  }

  const rawCa = process.env.PGSSLROOTCERT?.trim();
  if (rawCa) {
    return { rejectUnauthorized: true, ca: readSslRootCert(rawCa) };
  }

  return { rejectUnauthorized: true };
}

function getPool(): Pool {
  if (poolOverride) {
    return poolOverride;
  }
  if (!pool) {
    assertRemotePostgresTlsEnabled(getDatabaseUrl());
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.PG_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      ssl: resolvePgSslConfig(),
    });
  }
  return pool;
}

/** Run a parameterized query. Values must only appear in `params`, never in `text`. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (client: Pick<Pool, "query">) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Never let a rollback failure mask the error that caused it.
      reportError("db.rollback", rollbackError, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (poolOverride) {
    await poolOverride.end();
    poolOverride = undefined;
    return;
  }
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
