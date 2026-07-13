import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import verifiedJson from "@/data/dataset.verified.json";
import { closePool, setPoolForTests } from "@/lib/data/dbClient";
import { parseStaticVerifiedDatasetJson } from "@/lib/data/staticDataset";
import type { VerifiedDataset } from "@/lib/data/datasetSchema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  __dirname,
  "../../db/migrations/001_verified_dataset.sql",
);

export interface SeededPgMem {
  pool: Pool;
  dataset: VerifiedDataset;
  teardown: () => Promise<void>;
}

/** Seed pg-mem with the verified dataset schema + JSON import parity. */
export async function seedVerifiedPgMem(): Promise<SeededPgMem> {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const migrationSql = readFileSync(migrationPath, "utf8");
  db.public.none(migrationSql);

  const dataset = parseStaticVerifiedDatasetJson(verifiedJson);
  const { provenance, companies, acquirers, acquisitions } = dataset;

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  await pool.query(
    `INSERT INTO dataset_provenance (id, last_updated, purpose, disclaimer, sources, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      1,
      provenance.lastUpdated,
      provenance.purpose,
      provenance.disclaimer,
      provenance.sources,
      provenance.notes,
    ],
  );

  for (const c of companies) {
    await pool.query(
      `INSERT INTO companies (
         id, name, sector, stage, founded, hq, description,
         last_known_valuation, valuation_source, total_funding, sources
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        c.id,
        c.name,
        c.sector,
        c.stage,
        c.founded ?? 0,
        c.hq ?? "Unknown",
        c.description ?? "",
        c.lastKnownValuation ?? null,
        c.valuationSource ?? null,
        c.totalFunding ?? null,
        c.sources ?? [],
      ],
    );
  }

  for (const a of acquirers) {
    await pool.query(
      `INSERT INTO acquirers (id, name, ticker, sector, hq) VALUES ($1,$2,$3,$4,$5)`,
      [
        a.id,
        a.name,
        a.ticker ?? null,
        a.sector ?? "Healthcare",
        a.hq ?? "Unknown",
      ],
    );
  }

  for (const d of acquisitions) {
    await pool.query(
      `INSERT INTO acquisitions (
         id, target_id, acquirer_id, target_name, acquirer_name,
         announced_date, closed_date, deal_value, deal_value_note,
         deal_type, source, strategic_rationale
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        d.id,
        d.targetId,
        d.acquirerId,
        d.targetName,
        d.acquirerName,
        d.announcedDate,
        d.closedDate ?? null,
        d.dealValue ?? null,
        d.dealValueNote ?? null,
        d.dealType,
        d.source,
        d.strategicRationale,
      ],
    );
  }

  setPoolForTests(pool);
  process.env.DATABASE_URL = "postgresql://pgmem:test@localhost/lacuna_test";
  process.env.PGSSLMODE = "disable";

  return {
    pool,
    dataset,
    teardown: async () => {
      await closePool();
      setPoolForTests(undefined);
      delete process.env.DATABASE_URL;
      delete process.env.PGSSLMODE;
    },
  };
}
