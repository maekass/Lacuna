import process from 'node:process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@clickhouse/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../clickhouse/migrations');

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS lacuna_clickhouse_migrations (
    filename String,
    applied_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY filename;
`;

function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function splitStatements(sql: string): string[] {
  return stripLineComments(sql)
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) {
    console.error('CLICKHOUSE_URL is required');
    process.exit(1);
  }

  const database = process.env.CLICKHOUSE_DATABASE?.trim() || 'lacuna';
  const client = createClient({ url, database });

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  try {
    await client.command({ query: `CREATE DATABASE IF NOT EXISTS ${database}` });
    await client.command({ query: MIGRATIONS_TABLE });

    for (const file of files) {
      const existing = await client.query({
        query: 'SELECT filename FROM lacuna_clickhouse_migrations WHERE filename = {file:String} LIMIT 1',
        query_params: { file },
        format: 'JSONEachRow',
      });
      const rows = (await existing.json()) as Array<{ filename: string }>;
      if (rows.length > 0) {
        console.log('Skipped (already applied):', file);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      for (const statement of splitStatements(sql)) {
        await client.command({ query: statement });
      }

      await client.insert({
        table: 'lacuna_clickhouse_migrations',
        values: [{ filename: file }],
        format: 'JSONEachRow',
      });
      console.log('Migration applied:', file);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
