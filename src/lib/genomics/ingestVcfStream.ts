import { copyFileSync, createReadStream, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { requireIngestConsentRef } from "@/lib/compliance/patientDataGovernance";
import { buildObjectUri } from "@/lib/genomics/objectStorage";
import { uploadFileToS3 } from "@/lib/genomics/s3Storage";
import {
  BATCH_SIZE,
  insertVariantBatch,
  registerCallset,
} from "@/lib/genomics/registerCallset";
import { getObjectStorageBackend } from "@/lib/genomics/variantStoreConfig";
import { parseVcfDataLine } from "@/lib/genomics/vcfStreamParser";
import type { ParsedVcfVariant } from "@/lib/genomics/vcfStreamParser";

export interface IngestVcfInput {
  file: string;
  callsetId: string;
  studyId: string;
  sampleId: string;
  assembly?: string;
}

function objectKey(
  studyId: string,
  callsetId: string,
  fileName: string,
): string {
  return `${studyId}/${callsetId}/${fileName}`;
}

/**
 * Stream-ingest a VCF/gVCF into object storage and ClickHouse variant summaries.
 * Intended for long-running workers — not Vercel serverless.
 */
export async function ingestVcfStream(input: IngestVcfInput): Promise<{
  variantCount: number;
  objectUri: string;
}> {
  const consentError = requireIngestConsentRef(input.studyId);
  if (consentError) {
    throw new Error(consentError);
  }

  const assembly = input.assembly ?? "GRCh38";
  const fileName = basename(input.file);
  const key = objectKey(input.studyId, input.callsetId, fileName);

  let objectUri: string;
  if (getObjectStorageBackend() === "s3") {
    objectUri = await uploadFileToS3(input.file, key);
  } else {
    const dest = join(
      process.env.LACUNA_OBJECT_STORAGE_LOCAL_ROOT?.trim() || "data/variants",
      key,
    );
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(input.file, dest);
    objectUri = buildObjectUri(key);
  }

  const stream = createReadStream(input.file);
  const lineStream = input.file.endsWith(".gz")
    ? stream.pipe(createGunzip())
    : stream;

  const rl = createInterface({ input: lineStream, crlfDelay: Infinity });

  let batch: ParsedVcfVariant[] = [];
  let total = 0;

  for await (const line of rl) {
    const variant = parseVcfDataLine(line);
    if (!variant) continue;

    batch.push(variant);
    if (batch.length >= BATCH_SIZE) {
      await insertVariantBatch(input.callsetId, batch);
      total += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertVariantBatch(input.callsetId, batch);
    total += batch.length;
  }

  await registerCallset(
    {
      callsetId: input.callsetId,
      sampleId: input.sampleId,
      studyId: input.studyId,
      assembly,
      objectUri,
      notes: `Ingested from ${fileName}`,
    },
    total,
    input.file,
  );

  return { variantCount: total, objectUri };
}
