# Reimbursement ingestion contract

Python + DuckDB (or an equivalent producer) emits a sidecar JSON document that
`src/lib/reimbursement/ingestion.ts` validates before any row enters the
evidence ledger.

Parquet is optional. When `output.format` is `parquet`, `output.parquetPath`
must be set; the TypeScript app does not read Parquet inside the Next.js
runtime.

## Emit an empty SA051 catalog batch

```bash
python3 scripts/reimbursement/ingestion_contract.py --emit-example
```

The example contains **no rate rows**. Missing RVU or payment is omitted, never
zero.

## Required fields

- `contractVersion`: `1.0.0`
- `sourceManifest` matching `REIMBURSEMENT_SOURCE_MANIFEST_VERSION`
- `producer.runtime`: `python-duckdb` or `typescript`
- every observation: `code`, `codeSystem`, `dataYear`, `payer`,
  `placeOfService`, `sourceArtifactId`
- null/absent for unknown numerics

DuckDB is not required to emit the sidecar. A later producer may `COPY` a
validated table to Parquet and point `parquetPath` at that file.
