import process from "node:process";
import {
  runLivenessCheck,
  runReadinessCheck,
} from "../src/lib/infra/healthCheck";

interface EnvRequirement {
  key: string;
  when: string;
  required: boolean;
}

const ENV_REQUIREMENTS: EnvRequirement[] = [
  {
    key: "LACUNA_DATA_MODE",
    when: "always (defaults to static)",
    required: false,
  },
  {
    key: "DATABASE_URL",
    when: "LACUNA_DATA_MODE=db or SEC ingest",
    required: false,
  },
  {
    key: "CRON_SECRET",
    when: "production Vercel cron (required on Vercel prod)",
    required: false,
  },
  { key: "SEC_EDGAR_USER_AGENT", when: "SEC ingest / cron / download:free-apis", required: false },
  { key: "NCBI_TOOL_EMAIL", when: "download:free-apis (PubMed)", required: false },
  { key: "PATENTSVIEW_API_KEY", when: "download:free-apis (optional)", required: false },
  {
    key: "LACUNA_INGEST_RUN_TRACKING",
    when: "recommended for production ingest",
    required: false,
  },
  {
    key: "SEC_USE_DB_CURSOR",
    when: "recommended for incremental cron",
    required: false,
  },
  {
    key: "LACUNA_VARIANT_STORE",
    when: "clickhouse variant catalog (off by default)",
    required: false,
  },
  {
    key: "CLICKHOUSE_URL",
    when: "LACUNA_VARIANT_STORE=clickhouse",
    required: false,
  },
];

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
}

function printEnvChecklist(): void {
  const mode = process.env.LACUNA_DATA_MODE === "db" ? "db" : "static";
  console.log("Environment checklist (see .env.example):");
  for (const item of ENV_REQUIREMENTS) {
    const value = process.env[item.key];
    const set = value !== undefined && value !== "";
    const flag = set ? "set" : "unset";
    const req = (item.key === "DATABASE_URL" && mode === "db" && !set) ||
        (item.key === "SEC_EDGAR_USER_AGENT" && !set) ||
        (item.key === "CRON_SECRET" && isProductionEnv() && !set)
      ? " ← needed for your mode/workflow"
      : "";
    console.log(`  [${flag}] ${item.key} — ${item.when}${req}`);
  }
  console.log("");
}

async function main() {
  console.log("Lacuna infrastructure check\n");
  printEnvChecklist();

  const live = runLivenessCheck();
  const health = await runReadinessCheck();
  console.log("Health summary:");
  console.log(`  live: ${live.ok} (${live.probe})`);
  console.log(`  ready: ${health.ok} (${health.probe})`);
  console.log(`  dataMode: ${health.dataMode}`);
  console.log(
    `  dataset: ${health.checks.dataset.companies} companies, ${health.checks.dataset.acquisitions} deals (${health.checks.dataset.source})`,
  );
  if (health.checks.dataset.validationErrors > 0) {
    console.log(
      `  dataset validation errors: ${health.checks.dataset.validationErrors}`,
    );
  }
  if (health.checks.database.configured) {
    console.log(
      `  database: ${health.checks.database.ok ? "ok" : "failed"} (${
        health.checks.database.latencyMs ?? "?"
      } ms)`,
    );
    if (health.checks.database.error) {
      console.log(`  database error: ${health.checks.database.error}`);
    }
  } else {
    console.log("  database: not configured (ok for static demo)");
  }

  if (health.checks.variantStore.enabled) {
    console.log(
      `  variantStore: ${health.checks.variantStore.ok ? "ok" : "failed"} (${
        health.checks.variantStore.latencyMs ?? "?"
      } ms)`,
    );
    if (health.checks.variantStore.error) {
      console.log(`  variantStore error: ${health.checks.variantStore.error}`);
    }
  } else {
    console.log("  variantStore: disabled (ok for Vercel demo)");
  }

  if (!health.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
