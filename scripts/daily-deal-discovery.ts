import process from "node:process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { closePool } from "../src/lib/data/dbClient";
import { runSecIngest } from "../src/lib/ingestion/secIngestPipeline";

const reportPath = join(process.cwd(), "artifacts/daily-deal-discovery-report.json");

interface DiscoveryRunReport {
  workflowRunTime: string;
  source: "SEC EDGAR";
  sourceQueryStatus: "success" | "lock_skipped";
  sinceDateUsed: string | null;
  candidateCount: number;
  womensHealthCandidateCount: number;
  insertedCount: number;
  correctedCount: number;
  supersededCount: number;
  rejectedCount: number;
  deduplicatedCount: number;
  validationResult: "pending";
  sourceFreshnessTimestamp: string;
  artifactFreshnessTimestamp: null;
  publicationOccurred: false;
  publicationReason: string;
  ingestRunId: number | null;
}

function writeReport(report: DiscoveryRunReport): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  if (!process.env.SEC_EDGAR_USER_AGENT?.trim()) {
    console.error("SEC_EDGAR_USER_AGENT is required");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  console.log("Daily SEC discovery starting…");
  const ingest = await runSecIngest();

  const womensHealthCandidateCount = ingest.classified.filter((candidate) =>
    candidate.womensHealthRelevant
  ).length;
  const rejectedCount = ingest.classified.length - womensHealthCandidateCount;
  const report: DiscoveryRunReport = {
    workflowRunTime: startedAt,
    source: "SEC EDGAR",
    sourceQueryStatus: ingest.lockSkipped ? "lock_skipped" : "success",
    sinceDateUsed: ingest.sinceDateUsed ?? null,
    candidateCount: ingest.parsedFilings.length,
    womensHealthCandidateCount,
    insertedCount: ingest.sync?.inserted ?? 0,
    correctedCount: ingest.sync?.updated ?? 0,
    supersededCount: 0,
    rejectedCount,
    deduplicatedCount: ingest.sync?.deduped ?? 0,
    validationResult: "pending",
    sourceFreshnessTimestamp: new Date().toISOString(),
    artifactFreshnessTimestamp: null,
    publicationOccurred: false,
    publicationReason: ingest.lockSkipped
      ? "Discovery skipped because another ingest run holds the advisory lock."
      : "Discovery stages candidates only; verified publication remains gated by the manual promote-approved-deals workflow.",
    ingestRunId: ingest.runId ?? null,
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool().catch(() => undefined);
  process.exit(1);
});
