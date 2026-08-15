import process from "node:process";
import { Pool, type QueryResultRow } from "pg";
import { reportError } from "@/lib/observability/reportError";

let pool: Pool | undefined;
let poolOverride: Pool | undefined;

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

function getPool(): Pool {
  if (poolOverride) {
    return poolOverride;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.PG_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      ssl: process.env.PGSSLMODE === "disable"
        ? undefined
        : { rejectUnauthorized: false },
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
