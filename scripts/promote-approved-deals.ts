import process from "node:process";
import { closePool } from "../src/lib/data/dbClient";
import {
  promoteApprovedDeals,
  type PromoteTarget,
} from "../src/lib/ingestion/promoteApprovedDeals";

function parseTarget(raw: string | undefined): PromoteTarget {
  if (raw === "db" || raw === "both") return raw;
  return "json";
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dealIdArg = args.find((arg) => arg.startsWith("--deal-id="));
  const targetArg = args.find((arg) => arg.startsWith("--target="));

  if (!process.env.DATABASE_URL && !dryRun) {
    console.error("DATABASE_URL is required (marks lacuna_deals as merged).");
    process.exit(1);
  }

  const dealIds = dealIdArg ? [dealIdArg.split("=")[1] ?? ""] : undefined;
  const target = parseTarget(targetArg?.split("=")[1]);

  const result = await promoteApprovedDeals({
    dealIds: dealIds?.filter(Boolean),
    target,
    dryRun,
  });

  for (const row of result.promoted) {
    if (row.ok) {
      console.log(`promoted ${row.dealId} → ${row.acquisitionId}`);
    } else if (row.skipped) {
      console.log(
        `skipped ${row.dealId}: ${row.error ?? "duplicate or incomplete"}`,
      );
    } else {
      console.error(`failed ${row.dealId}: ${row.error}`);
    }
  }

  if (result.validationErrors.length > 0) {
    console.error("\nValidation errors:");
    for (const message of result.validationErrors) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  if (result.promoted.length === 0) {
    console.log("No approved deals waiting for promotion.");
  }

  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
