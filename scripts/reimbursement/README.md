# Reimbursement ingestion sidecar

Python + DuckDB producers emit JSON (and optional Parquet) that
`src/lib/reimbursement/ingestion.ts` validates before any row enters the
evidence ledger.

```bash
python3 scripts/reimbursement/ingestion_contract.py --emit-example
python3 scripts/reimbursement/ingestion_contract.py --validate path/to/sidecar.json
```

Contract rules:

- `contractVersion` must be `1.0.0`
- every observation needs an integer `dataYear`
- missing RVU / payment fields stay `null` — never coerced to zero
- `sourceArtifactId` must exist on the sidecar `sourceManifest`
- Parquet output requires `output.parquetPath`

This sidecar does not fetch CMS files or invent rates. Phase 1 catalogs public
source URLs only.
