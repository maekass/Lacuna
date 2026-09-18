# CPT / HCPCS licensing boundary

Phase 1 of the reimbursement evidence engine stores **code numbers** and
**Lacuna-authored plain-language labels** only, unless a recorded license
permits more.

## What may be stored now

- HCPCS Level II / CPT **code numbers** (for example `SA051`, `99213`)
- Lacuna-authored issue titles, claim statements, and lineage questions
- Public CMS payment-mechanics fields copied from a dated public file after
  source verification (RVU components, GPCI, conversion factor, locality,
  setting)
- Source **URLs** and retrieval timestamps (`storagePolicy: link_only`)
- HCPCS Level II public-file metadata that CMS redistributes as public data

## What must not be republished without a license

- AMA CPT long or short descriptors
- CPT codebook instructional notes
- Licensed CPT relative-value editorial text
- Copyrighted code-set content copied into distributable JSON/Parquet

Until an AMA license is recorded on the source artifact:

- keep `storagePolicy` at `link_only` or `metadata_only`
- never mark AMA material `full_text_allowed`
- do not copy CPT descriptors into `dataset.verified.json` or evidence fixtures

## Product copy

UI and fixtures should say “pelvic-exam supply-pack (code SA051)” rather than
reproducing a copyrighted descriptor. Code numbers are identifiers; prose is
Lacuna-authored investigation language.

## Related

- Architecture:
  [REIMBURSEMENT_EVIDENCE_ENGINE.md](./REIMBURSEMENT_EVIDENCE_ENGINE.md)
- Source manifest: `src/lib/reimbursement/sourceManifest.ts`
