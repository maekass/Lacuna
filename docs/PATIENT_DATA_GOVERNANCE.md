# Patient data governance (HIPAA / GDPR)

Lacuna's verified M&A dataset has **no patient data**. The optional variant
call-set store can hold **PHI-linked genomic data** when operators ingest real
VCFs — this document defines the guardrails.

## Data classification

| Class              | Examples                         | Default access          |
| ------------------ | -------------------------------- | ----------------------- |
| Public demo        | `lacuna-infra-seed` callsets     | De-identified summaries |
| De-identified      | Gene/chrom/pos variant summaries | `de_identified` mode    |
| Identifiable (PHI) | `sample_id`, raw VCF blobs       | `authorized` + API key  |

## Environment controls

```bash
# Default when unset — variant summaries only, no raw downloads
LACUNA_PATIENT_DATA_MODE=de_identified

# Full PHI/raw VCF access (never on public Vercel demo)
LACUNA_PATIENT_DATA_MODE=authorized
LACUNA_PATIENT_DATA_API_KEY=<rotate-regularly>

# Required before non-demo VCF ingest (GDPR lawful basis / HIPAA authorization)
LACUNA_INGEST_CONSENT_REF=IRB-2024-001

# Privileged access fails closed without ClickHouse or Postgres audit.
# Opt out only for local demos — never on a shared host.
# LACUNA_ALLOW_UNAUDITED_PHI=1
```

| Mode            | Variant API | Sample IDs | Raw VCF presign  |
| --------------- | ----------- | ---------- | ---------------- |
| `blocked`       | Denied      | Denied     | Denied           |
| `de_identified` | Allowed     | Pseudonym  | Denied           |
| `authorized`    | Allowed     | Full       | Allowed (Bearer) |

## API behavior

- `GET /api/genomics/variants` — minimum necessary variant summaries
- `GET /api/genomics/callsets` — redacts `sampleId` and `objectUri` unless
  authorized
- `GET /api/genomics/callsets/{id}/object` — **403** unless `authorized` +
  Bearer token
- Genomics handlers apply the IP rate limit **before** the audit write
- Privileged allow decisions return **503** when no durable audit sink is
  configured (unless `LACUNA_ALLOW_UNAUDITED_PHI=1`) or when every configured
  sink fails to persist. Denied de-identified downloads stay **403**.
- `GET /api/genomics/markers` — static disease-marker catalog (no PHI)

All genomics reads emit `[patient-data-audit]` JSON logs. When `CLICKHOUSE_URL`
is set, events are also persisted to the `audit_events` table (migration
`002_audit_events.sql`) with **hashed client IP** — no raw `sample_id` or VCF
paths in audit rows.

### Why ClickHouse (not Postgres)

| Factor         | ClickHouse                      | Postgres                    |
| -------------- | ------------------------------- | --------------------------- |
| Co-location    | Same store as variant summaries | Separate from genomics path |
| Access pattern | Append-only audit time series   | OLTP row inserts            |
| Vercel demo    | Optional — console fallback     | Would need `DATABASE_URL`   |

ClickHouse keeps compliance logs beside genomics data without mixing PHI into
the M&A Postgres schema. Apply with `npm run clickhouse:migrate`.

| Column       | Notes                                                |
| ------------ | ---------------------------------------------------- |
| `timestamp`  | ISO-8601 access time                                 |
| `action`     | `read_summary` / `read_identifiers` / `download_raw` |
| `resource`   | Route key only (sanitized)                           |
| `actor_hash` | SHA-256 of IP + `LACUNA_AUDIT_SALT`                  |
| `allowed`    | 0 or 1                                               |
| `mode`       | `blocked` / `de_identified` / `authorized`           |

## Ingest governance

VCF ingest runs on the **standalone ingest worker** — not Vercel serverless.
`POST /api/genomics/ingest` returns 501. See
[INGEST_WORKER.md](./INGEST_WORKER.md).

```bash
# Demo seed — no consent ref required
npm run clickhouse:seed

# Real cohort — consent ref mandatory (worker or CLI)
LACUNA_INGEST_CONSENT_REF=IRB-2024-001 npm run ingest:worker -- \
  --file ./cohort.vcf.gz --callset-id c1 --study-id brca --sample-id S1
```

## HIPAA checklist (operator)

- [ ] BAA with cloud vendors (AWS S3, ClickHouse Cloud, Vercel if applicable)
- [ ] Encryption at rest (S3 SSE, ClickHouse TLS)
- [ ] Encryption in transit (HTTPS only)
- [ ] Access logging enabled
- [ ] Minimum necessary API responses (default `de_identified`)
- [ ] Workforce training + incident response plan

## GDPR checklist (operator)

- [ ] Lawful basis documented (`LACUNA_INGEST_CONSENT_REF`)
- [ ] Data processing agreement with subprocessors
- [ ] Right to erasure procedure (delete callset row + S3 object + variant
      partition)
- [ ] Retention schedule per study
- [ ] EU data residency if required (ClickHouse/S3 region pinning)

## Vercel demo

`LACUNA_VARIANT_STORE=off` — variant APIs return 503; no patient data paths
active.

## Related

- [GENOMICS_VARIANT_STORE.md](./GENOMICS_VARIANT_STORE.md)
- [DATA_AND_LLM_USAGE.md](./DATA_AND_LLM_USAGE.md)
