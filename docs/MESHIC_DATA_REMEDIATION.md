# MeshIC Data Remediation Status

**Branch:** `audit/meshic-data-vet`  
**Date:** 2026-09-10

This file tracks remediation after the MeshIC data audit. The goal is not to maximize the number of published metrics; it is to prevent unsupported precision from reaching investment or health-research surfaces.

## Completed on this branch

- SEC revenue ingestion now validates mapped CIKs against SEC registrant metadata before accepting XBRL facts.
- Acquired targets are prevented from carrying post-acquisition standalone revenue histories.
- CMS sector reimbursement arithmetic now uses `sum(services_i × payment_i)` and requires explicitly curated aggregate observations with source metadata; unsupported hard-coded fallbacks are removed from the decision artifact.
- Growth-rate generation now publishes like-for-like SEC revenue CAGR only; funding-to-valuation and funding-to-exit annualizations are withheld.
- Data-quality scoring separates evidence provenance grade from record completeness/utility.
- The verified-dataset validator now surfaces non-resolvable citations, same-domain pseudo-dual-attestation, and missing valuation vintages.
- Public labels for `dealValue / totalFunding` no longer call the ratio fund/investment MOIC.
- The legacy OAIS composite is removed from the product decision surface pending calibration; underlying inputs and limitations remain visible as research context.
- A strict MeshIC data-integrity gate and pull-request workflow were added.

## Intentionally withheld pending regeneration or verified input

- `computed-sec-revenue.json`
- `computed-growth-rates.json`
- `computed-cms-utilization.json`

These artifacts are invalidated/withheld on the audit branch rather than carrying forward values known to have provenance or semantic defects. They should be regenerated only after the corresponding hardened ingestion path runs against authoritative upstream data.

## Next hardening sequence

1. Backfill canonical field-level source URLs/document identifiers for material company and deal economics.
2. Add explicit `asOf` metadata to valuations and funding totals.
3. Regenerate SEC revenue through the identity-validated pipeline and inspect every accepted registrant.
4. Populate CMS utilization only from a reproducible, aggregated CMS PUF export with dataset ID, year, query/aggregation method, and source URL.
5. Re-run growth metrics from the regenerated SEC artifact.
6. Expand display-provenance coverage and make new uncovered numeric UI a CI failure.
7. Rebuild OAIS, if retained, as a calibrated evidence model rather than a hand-weighted composite.

## Merge criterion

Do not merge because the branch produces more numbers. Merge when CI is green, the strict data gate has no RED findings, and any intentionally withheld surfaces fail closed rather than silently falling back to illustrative values.
