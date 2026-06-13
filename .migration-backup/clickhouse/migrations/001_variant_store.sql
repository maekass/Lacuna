-- Lacuna variant call-set catalog (ClickHouse)
-- Raw multi-GB VCF/BAM live in object storage; this DB holds metadata + queryable variant summaries.
-- Apply: npm run clickhouse:migrate

CREATE TABLE IF NOT EXISTS callsets (
    callset_id String,
    sample_id String,
    study_id String,
    assembly LowCardinality(String),
    object_uri String,
    bytes UInt64,
    variant_count UInt64,
    ingested_at DateTime DEFAULT now(),
    checksum String,
    notes String DEFAULT ''
)
ENGINE = MergeTree()
ORDER BY (study_id, callset_id);

CREATE TABLE IF NOT EXISTS variant_records (
    callset_id String,
    chrom LowCardinality(String),
    pos UInt32,
    ref String,
    alt String,
    qual Float32,
    filter LowCardinality(String),
    gene_symbol LowCardinality(String),
    consequence LowCardinality(String),
    allele_frequency Float32,
    is_pathogenic UInt8
)
ENGINE = MergeTree()
PARTITION BY callset_id
ORDER BY (callset_id, chrom, pos, ref, alt);
