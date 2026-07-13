import process from "node:process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { closePool, setPoolForTests } from "@/lib/data/dbClient";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../../db/migrations");

const PG_MEM_MIGRATIONS = ["002_", "003_", "008_", "009_"];

/** pg-mem-safe lacuna_deals extensions (empty table — no backfill). */
const LACUNA_DEALS_PG_MEM_EXTENSIONS = `
ALTER TABLE lacuna_deals
  ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT '8-K',
  ADD COLUMN IF NOT EXISTS natural_key TEXT;

ALTER TABLE lacuna_deals
  ALTER COLUMN natural_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lacuna_deals_natural_key_uidx
  ON lacuna_deals (natural_key);

ALTER TABLE lacuna_deals
  DROP CONSTRAINT IF EXISTS lacuna_deals_natural_key_key;

ALTER TABLE lacuna_deals
  ADD CONSTRAINT lacuna_deals_natural_key_key UNIQUE (natural_key);

ALTER TABLE lacuna_ingest_state
  ADD COLUMN IF NOT EXISTS last_processed_accession TEXT,
  ADD COLUMN IF NOT EXISTS last_processed_natural_key TEXT,
  ADD COLUMN IF NOT EXISTS last_processed_filing_date DATE;
`;

export interface LacunaDealsPgMem {
  pool: Pool;
  teardown: () => Promise<void>;
}

/** pg-mem with lacuna_deals + ingest state + audit log schema. */
export async function seedLacunaDealsPgMem(): Promise<LacunaDealsPgMem> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const files = readdirSync(migrationsDir)
    .filter((file) =>
      PG_MEM_MIGRATIONS.some((prefix) => file.startsWith(prefix))
    )
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.public.none(sql);
  }
  db.public.none(LACUNA_DEALS_PG_MEM_EXTENSIONS);

  db.public.registerFunction({
    name: "pg_try_advisory_lock",
    args: ["int8"],
    returns: "bool",
    implementation: () => true,
  });
  db.public.registerFunction({
    name: "pg_advisory_unlock",
    args: ["int8"],
    returns: "bool",
    implementation: () => true,
  });

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();
  setPoolForTests(pool);
  process.env.DATABASE_URL = "postgresql://pgmem:test@localhost/lacuna_test";
  process.env.PGSSLMODE = "disable";

  return {
    pool,
    teardown: async () => {
      await closePool();
      setPoolForTests(undefined);
      delete process.env.DATABASE_URL;
      delete process.env.PGSSLMODE;
    },
  };
}
