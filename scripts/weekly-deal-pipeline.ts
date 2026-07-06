import process from "node:process";
import { closePool } from "../src/lib/data/dbClient";
import { runHandsOffPipeline } from "../src/lib/ingestion/runHandsOffPipeline";
import { runSecIngest } from "../src/lib/ingestion/secIngestPipeline";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("SEC_EDGAR_USER_AGENT is required");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.log("SEC ingest starting…");
  const ingest = await runSecIngest();
  console.log(JSON.stringify({
    scannedTickers: ingest.scannedTickers,
    parsed: ingest.parsedFilings.length,
    womensHealthCandidates: ingest.classified.filter((c) =>
      c.womensHealthRelevant
    ).length,
    sync: ingest.sync,
  }));

  const handsOff = await runHandsOffPipeline();
  console.log(JSON.stringify({ handsOff }, null, 2));

  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
