/**
 * Restore Lacuna Postgres: validate DATABASE_URL, migrate schema, import verified JSON.
 *
 * Usage:
 *   npm run db:restore
 *   npm run db:restore -- --check
 *   npm run db:restore -- --url "postgresql://..."
 *   DATABASE_URL="postgresql://..." npm run db:restore
 *
 * @see docs/RESTORE_POSTGRES.md
 */
import process from "node:process";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  envLocalExists,
  envLocalPathForDisplay,
  loadEnvLocal,
  removeEnvLocalKey,
  upsertEnvLocal,
} from "./lib/envLocal";
import {
  parseDatabaseUrl,
  pingDatabase,
  redactDatabaseUrl,
  suggestFix,
} from "./lib/databaseUrl";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

interface CliOptions {
  checkOnly: boolean;
  skipImport: boolean;
  seedResearch: boolean;
  databaseUrl?: string;
  help: boolean;
}

function printHelp(): void {
  console.log(`Lacuna Postgres restore

Validates DATABASE_URL, applies migrations, and imports dataset.verified.json.

Commands:
  npm run db:restore
  npm run db:restore -- --check
  npm run db:restore -- --url "<neon pooled connection string>"
  npm run db:restore -- --skip-import
  npm run db:restore -- --seed-research

Workflow (production Neon):
  1. Neon → Connect → copy pooled connection string
  2. npm run db:restore -- --url "<paste string>"
  3. Paste the same string into Vercel → DATABASE_URL (Production)
  4. Update GitHub secret DATABASE_URL for weekly-deal-pipeline
  5. Redeploy Vercel, then verify /api/health/ready

Local Docker:
  docker compose up -d postgres
  npm run db:restore
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    checkOnly: false,
    skipImport: false,
    seedResearch: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--check") {
      options.checkOnly = true;
      continue;
    }
    if (arg === "--skip-import") {
      options.skipImport = true;
      continue;
    }
    if (arg === "--seed-research") {
      options.seedResearch = true;
      continue;
    }
    if (arg === "--url") {
      options.databaseUrl = argv[i + 1];
      i++;
      continue;
    }
  }

  return options;
}

function runNpmScript(script: string): void {
  const result = spawnSync("npm", ["run", script], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function applyDatabaseUrl(databaseUrl: string): void {
  upsertEnvLocal("DATABASE_URL", databaseUrl);
  const meta = parseDatabaseUrl(databaseUrl);
  if (meta?.isNeon) {
    removeEnvLocalKey("PGSSLMODE");
    delete process.env.PGSSLMODE;
  } else if (meta?.isLocalhost && !process.env.PGSSLMODE) {
    upsertEnvLocal("PGSSLMODE", "disable");
    process.env.PGSSLMODE = "disable";
  }
  process.env.DATABASE_URL = databaseUrl;
  console.log(`Updated ${envLocalPathForDisplay()} DATABASE_URL`);
}

async function printStatus(): Promise<boolean> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.");
    console.error("");
    console.error("Options:");
    console.error(`  • Add DATABASE_URL to ${envLocalPathForDisplay()}`);
    console.error('  • npm run db:restore -- --url "postgresql://..."');
    console.error("  • vercel env pull .env.local  (after updating Vercel)");
    return false;
  }

  const meta = parseDatabaseUrl(url);
  console.log("Target:", redactDatabaseUrl(url));
  if (meta) {
    console.log(
      `  host=${meta.host} db=${meta.database} user=${meta.user} pooled=${
        meta.isPooledNeon ? "yes" : "no"
      }`,
    );
  }

  const ping = await pingDatabase(url);
  if (!ping.ok) {
    console.error(`\nConnection failed (${ping.latencyMs}ms): ${ping.error}`);
    for (const tip of suggestFix(ping.error ?? "", meta)) {
      console.error(`  → ${tip}`);
    }
    return false;
  }

  console.log(`\nConnection ok (${ping.latencyMs}ms)`);
  if (ping.serverVersion) {
    console.log(`  ${ping.serverVersion.split(",")[0]}`);
  }
  if (ping.migrationCount !== undefined) {
    console.log(`  migrations applied: ${ping.migrationCount}`);
  }
  return true;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvLocal();

  if (options.databaseUrl) {
    applyDatabaseUrl(options.databaseUrl);
  }

  console.log("Lacuna Postgres restore\n");

  if (!envLocalExists() && !process.env.DATABASE_URL) {
    console.log(
      `Tip: create ${envLocalPathForDisplay()} or pass --url to save Neon credentials locally.`,
    );
    console.log("");
  }

  const connected = await printStatus();
  if (!connected) {
    process.exit(1);
  }

  if (options.checkOnly) {
    console.log("\n--check only; skipping migrate/import.");
    return;
  }

  console.log("\nApplying migrations…");
  runNpmScript("db:migrate");

  if (!options.skipImport) {
    console.log("\nImporting dataset.verified.json…");
    runNpmScript("db:import");
  }

  if (options.seedResearch) {
    console.log("\nSeeding research studies…");
    runNpmScript("db:seed-research");
  }

  const after = await pingDatabase(process.env.DATABASE_URL!);
  console.log("\nRestore complete.");
  if (after.migrationCount !== undefined) {
    console.log(`  migrations: ${after.migrationCount}`);
  }

  const meta = parseDatabaseUrl(process.env.DATABASE_URL!);
  if (meta?.isNeon) {
    console.log("\nNext — sync production:");
    console.log(
      "  1. Vercel → Settings → Environment Variables → DATABASE_URL",
    );
    console.log("     (paste the same Neon pooled string as in .env.local)");
    console.log("  2. GitHub → Settings → Secrets → DATABASE_URL");
    console.log("  3. Redeploy, then:");
    console.log(
      "     curl -s https://lacuna-maekass.vercel.app/api/health/ready | jq '.checks.database'",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
