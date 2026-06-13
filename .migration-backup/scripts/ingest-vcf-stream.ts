/**
 * CLI wrapper for VCF stream ingest — delegates to ingest worker library.
 * Usage:
 *   CLICKHOUSE_URL=... npm run clickhouse:ingest-vcf -- --file ./sample.vcf.gz \
 *     --callset-id cohort-a-sample-1 --study-id brca-panel --sample-id SAMPLE-001
 */
import process from "node:process";
import { ingestVcfStream } from "../src/lib/genomics/ingestVcfStream";

interface CliArgs {
  file: string;
  callsetId: string;
  studyId: string;
  sampleId: string;
  assembly: string;
}

function parseArgs(argv: string[]): CliArgs {
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
      "Usage: npm run clickhouse:ingest-vcf -- --file <path.vcf[.gz]> --callset-id <id> --study-id <id> --sample-id <id> [--assembly GRCh38]",
    );
    process.exit(1);
  }

  return { file, callsetId, studyId, sampleId, assembly };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await ingestVcfStream(args);
  console.log(
    `Done: ${result.variantCount} variant summaries for callset ${args.callsetId}`,
  );
  console.log("Object URI:", result.objectUri);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
