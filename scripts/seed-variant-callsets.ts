/**
 * Infrastructure seed — demo callset + variant summaries for local ClickHouse dev.
 * NOT part of the verified M&A dataset; labeled for operator testing only.
 */
import process from 'node:process';
import { createClient } from '@clickhouse/client';
import { buildObjectUri } from '../src/lib/genomics/objectStorage';

const DEMO_CALLSET_ID = 'demo-brca-panel-grch38';
const DEMO_STUDY_ID = 'lacuna-infra-seed';

async function main() {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) {
    console.error('CLICKHOUSE_URL is required');
    process.exit(1);
  }

  const database = process.env.CLICKHOUSE_DATABASE?.trim() || 'lacuna';
  const client = createClient({ url, database });

  const objectUri = buildObjectUri('demo/brca-panel-grch38.vcf.gz');

  try {
    await client.insert({
      table: 'callsets',
      values: [
        {
          callset_id: DEMO_CALLSET_ID,
          sample_id: 'DEMO-SAMPLE-001',
          study_id: DEMO_STUDY_ID,
          assembly: 'GRCh38',
          object_uri: objectUri,
          bytes: 2_147_483_648,
          variant_count: 4,
          checksum: 'sha256:infra-seed-demo',
          notes: 'Infrastructure seed for variant-store smoke tests — not clinical data',
        },
      ],
      format: 'JSONEachRow',
    });

    await client.insert({
      table: 'variant_records',
      values: [
        {
          callset_id: DEMO_CALLSET_ID,
          chrom: '17',
          pos: 43044295,
          ref: 'G',
          alt: 'A',
          qual: 99.5,
          filter: 'PASS',
          gene_symbol: 'BRCA1',
          consequence: 'missense_variant',
          allele_frequency: 0.00012,
          is_pathogenic: 1,
        },
        {
          callset_id: DEMO_CALLSET_ID,
          chrom: '17',
          pos: 43051077,
          ref: 'T',
          alt: 'G',
          qual: 98.1,
          filter: 'PASS',
          gene_symbol: 'BRCA1',
          consequence: 'frameshift_variant',
          allele_frequency: 0.00003,
          is_pathogenic: 1,
        },
        {
          callset_id: DEMO_CALLSET_ID,
          chrom: '13',
          pos: 32340300,
          ref: 'C',
          alt: 'T',
          qual: 97.4,
          filter: 'PASS',
          gene_symbol: 'BRCA2',
          consequence: 'missense_variant',
          allele_frequency: 0.00008,
          is_pathogenic: 1,
        },
        {
          callset_id: DEMO_CALLSET_ID,
          chrom: '17',
          pos: 41245466,
          ref: 'G',
          alt: 'A',
          qual: 96.2,
          filter: 'PASS',
          gene_symbol: 'TP53',
          consequence: 'missense_variant',
          allele_frequency: 0.00021,
          is_pathogenic: 0,
        },
      ],
      format: 'JSONEachRow',
    });

    console.log(`Seeded callset ${DEMO_CALLSET_ID} with 4 variant summaries`);
    console.log(`Object URI: ${objectUri}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
