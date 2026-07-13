import process from "node:process";
import { runSecIngest } from "../src/lib/ingestion/secIngestPipeline";

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error(
      "Set SEC_EDGAR_USER_AGENT before ingest (SEC fair-access policy).",
    );
    console.error(
      'Example: SEC_EDGAR_USER_AGENT="Lacuna Research mps5cy@virginia.edu" npm run sec:ingest',
    );
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");

  console.log(
    `SEC ingest starting${dryRun ? " (dry run — no DB writes)" : ""}…`,
  );

  const result = await runSecIngest({ dryRun });

  console.log(`Tickers scanned: ${result.scannedTickers}`);
  if (result.unresolvedTickers.length > 0) {
    console.warn(
      `Unresolved tickers (skipped — foreign ADR or set SEC_TICKER_CIK_OVERRIDES): ${
        result.unresolvedTickers.join(", ")
      }`,
    );
  }
  if (result.sinceDateUsed) {
    console.log(`Since date: ${result.sinceDateUsed}`);
  }
  console.log(`Item 2.01 filings parsed: ${result.parsedFilings.length}`);
  console.log(
    `Women's health candidates: ${
      result.classified.filter((c) => c.womensHealthRelevant).length
    }`,
  );

  const aiClassified = result.classified.filter((c) =>
    c.classificationMethod === "ai"
  );
  const keywordClassified = result.classified.filter((c) =>
    c.classificationMethod !== "ai"
  );
  if (aiClassified.length > 0) {
    const modelId = aiClassified[0]?.classificationModelId ?? "unknown";
    console.log(
      `AI classification: ${aiClassified.length} filing(s) via ${modelId}`,
    );
  }
  if (keywordClassified.length > 0 && aiClassified.length === 0) {
    console.log(
      "Keyword-only classification (enable Vercel AI Gateway or set OPENAI_API_KEY for AI path)",
    );
  }

  if (result.sync) {
    console.log(
      `DB sync — inserted: ${result.sync.inserted}, updated: ${result.sync.updated}, skipped: ${result.sync.skipped}`,
    );
  } else if (!dryRun && !process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set — classification only, no DB sync");
  }

  console.log("Review lacuna_deals before merging into dataset.verified.json");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
