import process from "node:process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../db/migrations");

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS lacuna_schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.PGSSLMODE === "disable"
      ? undefined
      : { rejectUnauthorized: false },
  });

  try {
    await pool.query(MIGRATIONS_TABLE);

    for (const file of files) {
      const applied = await pool.query<{ filename: string }>(
        "SELECT filename FROM lacuna_schema_migrations WHERE filename = $1",
        [file],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        console.log("Skipped (already applied):", file);
        continue;
      }

      const path = join(migrationsDir, file);
      const sql = readFileSync(path, "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO lacuna_schema_migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log("Migration applied:", file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
