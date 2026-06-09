# Local variant object storage (dev)

Place large VCF/gVCF blobs here when `LACUNA_OBJECT_STORAGE=local` (default).

Production uses S3-compatible object storage (`LACUNA_OBJECT_STORAGE=s3`). ClickHouse holds queryable variant **summaries**; multi-GB files stay in object storage.
