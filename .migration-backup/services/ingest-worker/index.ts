/**
 * Standalone VCF ingest worker — runs outside Vercel serverless.
 * See docs/INGEST_WORKER.md for deploy steps.
 */
import process from "node:process";
import { ingestVcfStream } from "../../src/lib/genomics/ingestVcfStream";

interface WorkerArgs {
  file: string;
  callsetId: string;
  studyId: string;
  sampleId: string;
  assembly: string;
}

function parseArgs(argv: string[]): WorkerArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      map.set(token.slice(2), argv[i + 1] ?? "");
      i += 1;
    }
  }

  const file = map.get("file");
  const callsetId = map.get("callset-id");
  const studyId = map.get("study-id");
  const sampleId = map.get("sample-id");
  const assembly = map.get("assembly") ?? "GRCh38";

  if (!file || !callsetId || !studyId || !sampleId) {
    console.error(
      "Usage: ingest-worker --file <path.vcf[.gz]> --callset-id <id> --study-id <id> --sample-id <id> [--assembly GRCh38]",
    );
    process.exit(1);
  }

  return { file, callsetId, studyId, sampleId, assembly };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `[ingest-worker] starting callset=${args.callsetId} study=${args.studyId}`,
  );

  const result = await ingestVcfStream(args);
  console.log(
    `[ingest-worker] complete variants=${result.variantCount} uri=${result.objectUri}`,
  );
}

main().catch((error) => {
  console.error("[ingest-worker] failed:", error);
  process.exit(1);
});
