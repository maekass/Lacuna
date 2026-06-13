import { getClickHouseClient } from "./clickhouseClient";
import type {
  CallsetPageResult,
  VariantCallset,
  VariantPageResult,
  VariantRecord,
} from "./variantTypes";

interface CallsetRow {
  callset_id: string;
  sample_id: string;
  study_id: string;
  assembly: string;
  object_uri: string;
  bytes: string;
  variant_count: string;
  ingested_at: string;
  checksum: string;
  notes: string;
}

interface VariantRow {
  callset_id: string;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  qual: number;
  filter: string;
  gene_symbol: string;
  consequence: string;
  allele_frequency: number;
  is_pathogenic: number;
}

function mapCallset(row: CallsetRow): VariantCallset {
  return {
    callsetId: row.callset_id,
    sampleId: row.sample_id,
    studyId: row.study_id,
    assembly: row.assembly,
    objectUri: row.object_uri,
    bytes: Number(row.bytes),
    variantCount: Number(row.variant_count),
    ingestedAt: row.ingested_at,
    checksum: row.checksum,
    notes: row.notes || undefined,
  };
}

function mapVariant(row: VariantRow): VariantRecord {
  return {
    callsetId: row.callset_id,
    chrom: row.chrom,
    pos: row.pos,
    ref: row.ref,
    alt: row.alt,
    qual: row.qual,
    filter: row.filter,
    geneSymbol: row.gene_symbol,
    consequence: row.consequence,
    alleleFrequency: row.allele_frequency,
    isPathogenic: row.is_pathogenic === 1,
  };
}

export interface ListCallsetsQuery {
  limit: number;
  offset: number;
  studyId?: string;
}

export interface ListVariantsQuery {
  limit: number;
  offset: number;
  callsetId?: string;
  chrom?: string;
  gene?: string;
  pathogenicOnly?: boolean;
}

/** Paginated callset catalog. */
export async function listCallsets(
  query: ListCallsetsQuery,
): Promise<CallsetPageResult> {
  const ch = getClickHouseClient();
  const clauses: string[] = [];
  const params: Record<string, string | number> = {
    limit: query.limit,
    offset: query.offset,
  };

  if (query.studyId) {
    clauses.push("study_id = {studyId:String}");
    params.studyId = query.studyId;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const countResult = await ch.query({
    query: `SELECT count() AS total FROM callsets ${where}`,
    query_params: params,
    format: "JSONEachRow",
  });
  const countRows = (await countResult.json()) as Array<{ total: string }>;
  const total = Number(countRows[0]?.total ?? 0);

  const dataResult = await ch.query({
    query: `
      SELECT
        callset_id, sample_id, study_id, assembly, object_uri,
        bytes, variant_count, ingested_at, checksum, notes
      FROM callsets
      ${where}
      ORDER BY study_id, callset_id
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  const rows = (await dataResult.json()) as CallsetRow[];

  return {
    callsets: rows.map(mapCallset),
    meta: {
      studyId: query.studyId,
      limit: query.limit,
      offset: query.offset,
      total,
    },
  };
}

/** Paginated variant summary query — partition-pruned by callset_id when provided. */
export async function listVariants(
  query: ListVariantsQuery,
): Promise<VariantPageResult> {
  const ch = getClickHouseClient();
  const clauses: string[] = [];
  const params: Record<string, string | number> = {
    limit: query.limit,
    offset: query.offset,
  };

  if (query.callsetId) {
    clauses.push("callset_id = {callsetId:String}");
    params.callsetId = query.callsetId;
  }
  if (query.chrom) {
    clauses.push("chrom = {chrom:String}");
    params.chrom = query.chrom;
  }
  if (query.gene) {
    clauses.push("gene_symbol = {gene:String}");
    params.gene = query.gene;
  }
  if (query.pathogenicOnly) {
    clauses.push("is_pathogenic = 1");
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const countResult = await ch.query({
    query: `SELECT count() AS total FROM variant_records ${where}`,
    query_params: params,
    format: "JSONEachRow",
  });
  const countRows = (await countResult.json()) as Array<{ total: string }>;
  const total = Number(countRows[0]?.total ?? 0);

  const dataResult = await ch.query({
    query: `
      SELECT
        callset_id, chrom, pos, ref, alt, qual, filter,
        gene_symbol, consequence, allele_frequency, is_pathogenic
      FROM variant_records
      ${where}
      ORDER BY callset_id, chrom, pos, ref, alt
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `,
    query_params: params,
    format: "JSONEachRow",
  });
  const rows = (await dataResult.json()) as VariantRow[];

  return {
    variants: rows.map(mapVariant),
    meta: {
      callsetId: query.callsetId,
      chrom: query.chrom,
      gene: query.gene,
      limit: query.limit,
      offset: query.offset,
      total,
    },
  };
}

/** Lookup a single callset by id. */
export async function getCallsetById(
  callsetId: string,
): Promise<VariantCallset | null> {
  const ch = getClickHouseClient();
  const result = await ch.query({
    query: `
      SELECT
        callset_id, sample_id, study_id, assembly, object_uri,
        bytes, variant_count, ingested_at, checksum, notes
      FROM callsets
      WHERE callset_id = {callsetId:String}
      LIMIT 1
    `,
    query_params: { callsetId },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as CallsetRow[];
  return rows[0] ? mapCallset(rows[0]) : null;
}
