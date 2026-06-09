/**
 * Stream-ingest a VCF/gVCF into object storage + ClickHouse variant summaries.
 * Usage:
 *   CLICKHOUSE_URL=... npm run clickhouse:ingest-vcf -- --file ./sample.vcf.gz \
 *     --callset-id cohort-a-sample-1 --study-id brca-panel --sample-id SAMPLE-001
 */
import process from 'node:process';
import { createReadStream, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { buildObjectUri } from '../src/lib/genomics/objectStorage';
import { getObjectStorageBackend } from '../src/lib/genomics/variantStoreConfig';
import { uploadFileToS3 } from '../src/lib/genomics/s3Storage';
import {
  BATCH_SIZE,
  insertVariantBatch,
  registerCallset,
} from '../src/lib/genomics/registerCallset';
import { parseVcfDataLine } from '../src/lib/genomics/vcfStreamParser';
import type { ParsedVcfVariant } from '../src/lib/genomics/vcfStreamParser';

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
    if (token.startsWith('--')) {
      map.set(token.slice(2), argv[i + 1] ?? '');
      i += 1;
    }
  }

  const file = map.get('file');
  const callsetId = map.get('callset-id');
  const studyId = map.get('study-id');
  const sampleId = map.get('sample-id');
  const assembly = map.get('assembly') ?? 'GRCh38';

  if (!file || !callsetId || !studyId || !sampleId) {
    console.error(
      'Usage: npm run clickhouse:ingest-vcf -- --file <path.vcf[.gz]> --callset-id <id> --study-id <id> --sample-id <id> [--assembly GRCh38]',
    );
    process.exit(1);
  }

  return { file, callsetId, studyId, sampleId, assembly };
}

function objectKey(studyId: string, callsetId: string, fileName: string): string {
  return `${studyId}/${callsetId}/${fileName}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fileName = basename(args.file);
  const key = objectKey(args.studyId, args.callsetId, fileName);

  let objectUri: string;
  if (getObjectStorageBackend() === 's3') {
    objectUri = await uploadFileToS3(args.file, key);
    console.log('Uploaded to', objectUri);
  } else {
    const relative = key;
    const dest = join(process.env.LACUNA_OBJECT_STORAGE_LOCAL_ROOT?.trim() || 'data/variants', relative);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(args.file, dest);
    objectUri = buildObjectUri(relative);
    console.log('Copied to', dest);
  }

  const input = createReadStream(args.file);
  const lineStream = args.file.endsWith('.gz')
    ? input.pipe(createGunzip())
    : input;

  const rl = createInterface({ input: lineStream, crlfDelay: Infinity });

  let batch: ParsedVcfVariant[] = [];
  let total = 0;

  for await (const line of rl) {
    const variant = parseVcfDataLine(line);
    if (!variant) continue;

    batch.push(variant);
    if (batch.length >= BATCH_SIZE) {
      await insertVariantBatch(args.callsetId, batch);
      total += batch.length;
      batch = [];
      if (total % 10_000 === 0) {
        console.log(`Inserted ${total} variants...`);
      }
    }
  }

  if (batch.length > 0) {
    await insertVariantBatch(args.callsetId, batch);
    total += batch.length;
  }

  await registerCallset(
    {
      callsetId: args.callsetId,
      sampleId: args.sampleId,
      studyId: args.studyId,
      assembly: args.assembly,
      objectUri,
      notes: `Ingested from ${fileName}`,
    },
    total,
    args.file,
  );

  console.log(`Done: ${total} variant summaries for callset ${args.callsetId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
