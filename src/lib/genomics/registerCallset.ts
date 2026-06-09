import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { getClickHouseClient } from './clickhouseClient';
import type { ParsedVcfVariant } from './vcfStreamParser';

const BATCH_SIZE = 1000;

export interface RegisterCallsetInput {
  callsetId: string;
  sampleId: string;
  studyId: string;
  assembly: string;
  objectUri: string;
  notes?: string;
}

function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(`sha256:${hash.digest('hex')}`));
    stream.on('error', reject);
  });
}

/** Batch-insert parsed variant rows for a callset. */
export async function insertVariantBatch(
  callsetId: string,
  variants: ParsedVcfVariant[],
): Promise<void> {
  if (variants.length === 0) return;

  const ch = getClickHouseClient();
  await ch.insert({
    table: 'variant_records',
    values: variants.map((v) => ({
      callset_id: callsetId,
      chrom: v.chrom,
      pos: v.pos,
      ref: v.ref,
      alt: v.alt,
      qual: v.qual,
      filter: v.filter,
      gene_symbol: v.geneSymbol,
      consequence: v.consequence,
      allele_frequency: 0,
      is_pathogenic: v.isPathogenic ? 1 : 0,
    })),
    format: 'JSONEachRow',
  });
}

/** Flush remaining variants and register callset metadata row. */
export async function registerCallset(
  input: RegisterCallsetInput,
  variantCount: number,
  localFileForChecksum?: string,
): Promise<void> {
  const ch = getClickHouseClient();
  const bytes = localFileForChecksum ? statSync(localFileForChecksum).size : 0;
  const checksum = localFileForChecksum ? await sha256File(localFileForChecksum) : '';

  await ch.insert({
    table: 'callsets',
    values: [
      {
        callset_id: input.callsetId,
        sample_id: input.sampleId,
        study_id: input.studyId,
        assembly: input.assembly,
        object_uri: input.objectUri,
        bytes,
        variant_count: variantCount,
        checksum,
        notes: input.notes ?? '',
      },
    ],
    format: 'JSONEachRow',
  });
}

export { BATCH_SIZE };
