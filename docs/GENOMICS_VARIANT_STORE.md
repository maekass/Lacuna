# Genomics variant call-set store

Lacuna separates **multi-GB raw files** from **queryable variant summaries**:

| Layer | Technology | Holds |
| --- | --- | --- |
| Object storage | Local `data/variants/` or S3 | VCF/gVCF/BAM blobs |
| Variant catalog | ClickHouse | Callset metadata + indexed variant rows |
| M&A intelligence | Postgres / JSON | Verified deals (unchanged) |

The Vercel demo keeps `LACUNA_VARIANT_STORE=off`. Enable locally or on a backend with ClickHouse + object storage.

## Local setup

```bash
docker compose up -d clickhouse

# .env.local
LACUNA_VARIANT_STORE=clickhouse
CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123
CLICKHOUSE_DATABASE=lacuna
LACUNA_OBJECT_STORAGE=local

npm run clickhouse:migrate
npm run clickhouse:seed
npm run dev
```

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/genomics/callsets` | Paginated callset catalog (`studyId`, `limit`, `offset`) |
| `GET /api/genomics/variants` | Variant summaries — requires `callsetId` or `gene` |
| `GET /api/genomics/callsets/{id}/object` | Resolve S3/local URI for the raw VCF (no streaming) |

Examples:

```bash
curl -s "http://localhost:3000/api/genomics/callsets?limit=10" | jq '.meta'

curl -s "http://localhost:3000/api/genomics/variants?callsetId=demo-brca-panel-grch38&gene=BRCA1" | jq '.variants'

curl -s "http://localhost:3000/api/genomics/callsets/demo-brca-panel-grch38/object" | jq '.object'
```

## Production (ClickHouse Cloud + S3)

1. Provision [ClickHouse Cloud](https://clickhouse.com/cloud) and an S3 bucket.
2. Set env on your compute (not Vercel serverless for heavy ingest):
   - `LACUNA_VARIANT_STORE=clickhouse`
   - `CLICKHOUSE_URL` — HTTPS endpoint with credentials
   - `LACUNA_OBJECT_STORAGE=s3`, `LACUNA_S3_BUCKET`, `LACUNA_S3_REGION`
3. Run `npm run clickhouse:migrate` from CI or an ingest worker.
4. Stream VCF → object storage; batch-insert variant summaries into ClickHouse.

## Ingest pattern (multi-GB VCF)

```
VCF.gz ──► S3 put (or local copy) ──► register callsets row (bytes, checksum, object_uri)
              │
              └──► streaming parser ──► batch INSERT variant_records
```

```bash
LACUNA_VARIANT_STORE=clickhouse CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123 \
  npm run clickhouse:ingest-vcf -- \
  --file ./cohort.vcf.gz \
  --callset-id cohort-a-001 \
  --study-id brca-panel \
  --sample-id SAMPLE-001
```

- Never load full VCF into Next.js memory.
- Partition `variant_records` by `callset_id` (already in schema).
- Query with `callsetId` + `chrom`/`gene` filters to prune partitions.

## Presigned S3 downloads

When `LACUNA_OBJECT_STORAGE=s3` and AWS credentials are configured, `GET /api/genomics/callsets/{id}/object` returns a `presignedUrl` (1h TTL) for HTTPS download.

## Dashboard UI

`VariantCallsetBrowser` on the home page lists callsets, filters variants by gene, and links to presigned VCF URLs when available.

## Seed data honesty

`npm run clickhouse:seed` inserts **infrastructure demo** rows (`lacuna-infra-seed`) — not clinical truth and not part of `dataset.verified.json`.

## Related

- [PERFORMANCE.md](./PERFORMANCE.md) — pagination and upstream caps
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — docker compose stack
