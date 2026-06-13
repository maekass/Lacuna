# VCF ingest worker

Multi-gigabyte VCF ingest **does not run on Vercel serverless**. Lacuna ships a
standalone Node worker that streams variants into object storage and ClickHouse.

The Next.js app exposes **read-only** genomics APIs. `POST /api/genomics/ingest`
returns **501** with a link to this document.

## Architecture

```mermaid
flowchart LR
  vcf[VCF / gVCF file]
  worker[ingest-worker]
  s3[Object storage]
  ch[(ClickHouse)]
  app[Vercel Next.js app]
  vcf --> worker
  worker --> s3
  worker --> ch
  app -->|read-only| ch
  app -->|presign| s3
```

| Component       | Role                                         |
| --------------- | -------------------------------------------- |
| `ingest-worker` | Long-running stream parse + batch insert     |
| Object storage  | Raw VCF blobs (local `data/variants/` or S3) |
| ClickHouse      | Callset catalog + variant summaries          |
| Vercel app      | `GET /api/genomics/*` only                   |

## Local (Docker Compose)

```bash
cp .env.example .env.local
docker compose --profile genomics up -d clickhouse

npm run clickhouse:migrate
npm run clickhouse:seed   # optional demo data

# One-shot ingest via worker container
docker compose --profile genomics run --rm ingest-worker \
  --file /ingest/sample.vcf.gz \
  --callset-id cohort-1 \
  --study-id brca-panel \
  --sample-id SAMPLE-001
```

Or without Docker:

```bash
LACUNA_VARIANT_STORE=clickhouse \
CLICKHOUSE_URL=http://lacuna:lacuna@localhost:8123 \
LACUNA_INGEST_CONSENT_REF=IRB-2024-001 \
npm run ingest:worker -- \
  --file ./cohort.vcf.gz \
  --callset-id cohort-1 \
  --study-id brca-panel \
  --sample-id SAMPLE-001
```

## Environment

| Variable                    | Required | Notes                                      |
| --------------------------- | -------- | ------------------------------------------ |
| `CLICKHOUSE_URL`            | Yes      | Same as variant store                      |
| `LACUNA_VARIANT_STORE`      | Yes      | `clickhouse`                               |
| `LACUNA_INGEST_CONSENT_REF` | Yes*     | *Waived for `lacuna-infra-seed` demo study |
| `LACUNA_OBJECT_STORAGE`     | Yes      | `local` or `s3`                            |
| `LACUNA_S3_BUCKET`          | If S3    | Unchanged from variant store docs          |

Governance: [PATIENT_DATA_GOVERNANCE.md](./PATIENT_DATA_GOVERNANCE.md).

## Deploy on Render

1. Create a **Background Worker** service linked to this repo.
2. **Dockerfile path:** `Dockerfile.ingest`
3. **Start command:** leave default (`ENTRYPOINT` runs worker; pass CLI args per
   job)
4. Set env vars above plus AWS credentials if using S3.
5. Run one-off jobs from the Render shell or trigger via your orchestrator — not
   from Vercel.

Example Render one-off shell:

```bash
npm run ingest:worker -- --file /data/cohort.vcf.gz --callset-id c1 --study-id s1 --sample-id S1
```

## Deploy on Fly.io

```bash
fly launch --dockerfile Dockerfile.ingest --no-deploy
fly secrets set CLICKHOUSE_URL=... LACUNA_INGEST_CONSENT_REF=...
fly machine run . -- \
  --file /data/cohort.vcf.gz --callset-id c1 --study-id s1 --sample-id S1
```

Mount a volume for incoming VCF files or pull from S3 before ingest.

## Related

- [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md)
- [PATIENT_DATA_GOVERNANCE.md](./PATIENT_DATA_GOVERNANCE.md)
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
