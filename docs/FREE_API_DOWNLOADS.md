# Free public API batch downloads

Lacuna can enrich verified-dataset entities from **free** government and open
sources — no PitchBook/CapIQ license required.

## Quick start

```bash
cp .env.example .env.local
# SEC_EDGAR_USER_AGENT and NCBI_TOOL_EMAIL are pre-filled in .env.example

npm run download:free-apis              # full run
npm run download:free-apis -- --limit 5 # smoke test
```

Output: `data/exports/free-apis/<timestamp>/` (gitignored).

## Optional AWS S3 evidence archive

Add `--archive-s3` to save the downloaded public API bundle to a private S3
bucket. Local exports still contain the manifest and per-entity JSON. The AWS
archive stores the original manifest and records in one JSON envelope labeled
`public_api_enrichment_not_verified_ma`. Source URLs, fetch timestamps, skipped
sources and errors are preserved as returned by the downloader.

The downloader reads shell environment variables. To configure the archive:

```bash
export LACUNA_EVIDENCE_S3_BUCKET=your-private-evidence-bucket
export AWS_REGION=us-east-1
export AWS_PROFILE=lacuna-research
# Authenticate that profile with your organization's AWS SSO configuration.
npm run download:free-apis -- --sources wikidata --limit 1 --archive-s3
```

The bucket must already exist in the configured region. The AWS SDK uses its
standard credential chain (for example, a signed-in local profile or a workload
IAM role). Do not commit credentials or use browser-exposed `NEXT_PUBLIC_`
variables. The CLI does not provision AWS resources, change bucket permissions,
or schedule uploads. S3 storage and requests are billable; no free allowance is
assumed. Without the flag, it does not initialize an S3 client or resolve AWS
credentials.

Grant the uploader only `s3:PutObject` and `s3:GetObject` on
`arn:aws:s3:::YOUR_BUCKET/lacuna-evidence/free-apis/*`. No bucket listing or
deletion is required. Keep S3 Block Public Access enabled. Use a bucket
configured for SSE-S3 encryption: uploads explicitly request `AES256`; buckets
requiring a customer KMS key need a separate configuration change. Enable bucket
versioning if version IDs are required in the receipt.

The SHA-256 of the complete UTF-8 snapshot determines its object key:
`lacuna-evidence/free-apis/sha256/<hash>.json`. Uploads send the checksum and
use `If-None-Match: *`. On a duplicate-key response, the stored object is
downloaded and hashed before an `already_present` receipt is issued. Any other
AWS error or hash mismatch fails the command; local export files remain
available. A receipt is written only after success, at `s3-archive-receipt.json`
in the export folder, with the object URI, hash, byte count, status and version
ID when available.

These protections apply to this uploader. They do not prevent a different IAM
principal from changing or deleting objects. This is not S3 Object Lock or a
retention guarantee. Hash verification proves byte integrity, not source truth,
publication approval, complete coverage, or historical availability before the
recorded fetch. Enrichment stays outside verified deal data. This integration
does not use patient records or the optional genomics storage configuration.

AWS references:
[conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html),
[PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html),
[SDK credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

## Sources

| Source                      | Flag                  | Requires                         |
| --------------------------- | --------------------- | -------------------------------- |
| SEC submissions             | `sec_submissions`     | Ticker + `SEC_EDGAR_USER_AGENT`  |
| SEC company facts (XBRL)    | `sec_company_facts`   | Ticker + `SEC_EDGAR_USER_AGENT`  |
| ClinicalTrials.gov          | `clinical_trials_gov` | —                                |
| openFDA                     | `openfda`             | —                                |
| NIH RePORTER                | `nih_reporter`        | —                                |
| PubMed                      | `pubmed`              | `NCBI_TOOL_EMAIL` (recommended)  |
| PatentsView                 | `patentsview`         | `PATENTSVIEW_API_KEY` (optional) |
| Wikidata                    | `wikidata`            | —                                |
| EU Clinical Trials Register | `eu_clinical_trials`  | —                                |

CMS bulk files are **not** automated — download from
[data.cms.gov](https://data.cms.gov).

## In the app

- **Deals workspace** → **Data pipelines** panel shows SEC ingest status and
  latest free-API export metadata.
- `GET /api/ingest/sec/status` — latest SEC cron run (needs Postgres).
- `GET /api/ingest/free-apis/status` — latest on-disk export manifest.
- `GET /api/enrichment/company?name=…` — on-demand CT.gov + openFDA + NIH
  RePORTER.

See [PUBLIC_RECORDS_INGEST.md](./PUBLIC_RECORDS_INGEST.md) for Form D, EFTS,
AACT, and CMS bulk scripts.

## Code layout

| Path                                     | Role                         |
| ---------------------------------------- | ---------------------------- |
| `scripts/download-free-apis.ts`          | CLI entry                    |
| `src/lib/ingestion/freeApi/`             | Fetch clients + orchestrator |
| `src/lib/ingestion/secIngestPipeline.ts` | SEC 8-K ingest (cron + CLI)  |

See also [SEC_INGESTION.md](./SEC_INGESTION.md) and
[INFRASTRUCTURE.md](./INFRASTRUCTURE.md).
