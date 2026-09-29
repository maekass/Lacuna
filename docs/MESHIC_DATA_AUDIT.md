# MeshIC Data Audit — Lacuna

**Audit date:** 2026-09-10

This audit applies a decision-grade evidence lens to Lacuna: provenance
strength, field-level sourceability, vintage, calculation semantics, model
uncertainty, and escalation to human/primary-source diligence.

## Pull-request gate

`.github/workflows/meshic-data-integrity.yml` runs
`scripts/meshic-data-gate.ts --strict` and `npm run verify:computed` on data,
ledger, lineage, similarity, and claim-doc changes. The job is read-only:
`contents: read`, no commit, no promotion, no LLM call, no production secret.

Lacuna stays a descriptive evidence and similarity tool. The gate asks whether a
pull request can introduce a factual claim, a current metric, or a historical
as-of result that is unsupported, inconsistent, stale, or misleadingly precise.

Three dates stay distinct:

| Name             | Question it answers                    |
| ---------------- | -------------------------------------- |
| Source citation  | Where did the claim come from?         |
| `effectiveDate`  | When did the underlying value apply?   |
| `publicAsOfDate` | When was that value publicly knowable? |

A citation does not prove knowability. A deal announcement date is not a funding
or valuation vintage. `publicAsOfDate: null` keeps the fact in the current
catalog and out of historical replay.

### What a clean current-only record looks like

This record is structurally valid, and it is still a strict-gate failure:
`publicAsOfDate` is null and there is no source URL. Do not invent either value
to turn the check green. Add the real URL and publication day, or leave the pull
request blocked.

```json
{
  "id": "c1:totalFunding:v1",
  "companyId": "c1",
  "field": "totalFunding",
  "value": 155,
  "unit": "USD_M",
  "sourceCitation": "Crunchbase - crunchbase.com/organization/modern-fertility",
  "effectiveDate": null,
  "publicAsOfDate": null,
  "datePrecision": "unknown",
  "verificationStatus": "reported",
  "recordedAt": "2026-09-20"
}
```

A correction appends a successor. It does not edit `v1`:

```json
{
  "id": "c1:totalFunding:v2",
  "companyId": "c1",
  "field": "totalFunding",
  "value": 160,
  "unit": "USD_M",
  "sourceCitation": "Company Series C release",
  "effectiveDate": "2024-03-12",
  "publicAsOfDate": "2024-03-12",
  "datePrecision": "day",
  "verificationStatus": "verified",
  "recordedAt": "2026-09-25",
  "supersedesId": "c1:totalFunding:v1"
}
```

After that append, only `v2` is active. Replay on `2021-05-18` still cannot use
`v1`, because its `publicAsOfDate` is null. Replay on `2024-03-12` can use `v2`.

### Blocking versus reported

Each line from `scripts/meshic-data-gate.ts` names the rule, the path, why it
failed, and the smallest safe fix.

Blocking (strict mode exits 1):

```text
[RED] ledger.supersession (blocking integrity failure) c-test:totalFunding: More than one active record (c-test:totalFunding:v1, c-test:totalFunding:conflict). Remediation: Append one successor with supersedesId. Do not leave two live values.
[RED] replay.dealDateSubstitution (blocking integrity failure) src/lib/data/example.ts: A deal announcement or close date is assigned as a funding or valuation vintage. Remediation: Leave publicAsOfDate null until the economic source has its own publication date.
[RED] claim.predicted (blocking integrity failure) src/components/ExitPredictor.tsx: User-facing text says "Predicted". Remediation: Reframe as precedent, similarity, or a descriptive heuristic.
```

These also fail `--strict`. They are not cleared by inventing a date or a URL:

```text
[RED] quality.completenessUpgradesEvidence (blocking integrity failure) src/data: 11 company records have composite grade A without source-quality A.
[RED] vintage.missingAsOf (blocking integrity failure) src/data: 133/135 primary economic numbers lack a dedicated as-of date (98.5%).
[RED] ledger.citationWithoutUrl (blocking integrity failure) evidence.verified.json: 98 active records have a citation and no source URL.
[RED] replay.coercion (blocking integrity failure) src/lib/quant/adaptQuantCompany.ts: A descriptive path coerces a missing economic value to zero or a default.
[RED] ledger.replayEligibility (blocking integrity failure) evidence.verified.json: 98/98 active economic records have publicAsOfDate null and are current-only.
```

### Census on the current ledger

`src/data/computed-quality-visibility.json` → `economicReplay`, regenerated from
the materialized dataset and `evidence.verified.json`:

| Field                    | Active | Replay-eligible | Current-only (`publicAsOfDate` missing) |
| ------------------------ | -----: | --------------: | --------------------------------------: |
| `totalFunding`           |     40 |               0 |                                      40 |
| `lastKnownValuation`     |     58 |               0 |                                      58 |
| **All economic records** | **98** |      **0 (0%)** |                           **98 (100%)** |

The report text states: missing `publicAsOfDate` means the fact is
current-catalog only. Do not invent a publication date to raise the
historical-replay share.

### What the workflow fails closed

- Malformed ledger JSON, duplicate ids, unknown companies, invalid dates, a
  public-as-of date after `recordedAt`, or a date finer than its stated
  precision.
- Orphaned `supersedesId`, a supersession cycle, two active values for one
  company and field, or an active row that supersedes a retracted row.
- A materialized funding or valuation figure that does not trace to exactly one
  active ledger record, or those fields copied onto a raw company row.
- Dated code that reads the current economic field, substitutes an acquisition
  date, or coerces a missing value to zero.
- App or `scripts/compute-*` imports of `dataset.verified.json` other than
  `src/lib/data/staticDataset.ts`.
- Computed artifacts whose `datasetHash` is not the materialized dataset hash.
- User-facing copy that calls this surface a prediction, probability, odds,
  forecast, likely exit, or guaranteed outcome. Phrases such as "not a forecast"
  pass. Any other allowance must be an entry in
  `src/lib/data/meshicClaimExceptions.ts`, and the tests require that phrase to
  remain in the file.

## P0 — block from investment inference until remediated

1. **SEC revenue ingestion** — `scripts/fetch-sec-revenue.ts` contains incorrect
   hard-coded issuer/CIK mappings. This can assign one registrant's XBRL facts
   to another company and can create post-acquisition standalone revenue
   histories. Rebuild issuer identity from SEC registrant metadata and validate
   name + CIK before accepting facts.
2. **CMS reimbursement aggregation** — `scripts/fetch-cms-utilization.ts`
   computes sector reimbursement as total services multiplied by a simple mean
   payment across codes. This must instead sum `services_i × payment_i` per
   code. Persist whether each row came from live CMS data or fallback data.
3. **Growth-rate semantics** — `scripts/compute-growth-rates.ts` labels
   annualized ratios from total funding to valuation/deal value as CAGR/company
   growth. These are not revenue or operating growth measures and should not be
   presented as such.
4. **OAIS** — current OAIS combines measured inputs, assumptions, and hand-set
   proxies into a 0–10 score without outcome calibration. Its confidence
   calculation is effectively fixed rather than evidence-derived. Keep
   research-only until rebuilt around field-level evidence objects and
   calibrated outcomes.

## P1 — repair trust layer

- Split **evidence grade** from **record completeness**. Completeness must never
  upgrade provenance quality.
- Require canonical, resolvable field-level citations for material economic
  values.
- Add dedicated `asOf` metadata for valuation/funding/economic facts.
- Rename `dealValue / totalFunding` from "MOIC" to a descriptive ratio such as
  **exit value / disclosed capital raised**. It is not fund-level MOIC.
- Strengthen dual-attestation validation beyond counting two arbitrary source
  strings.

## Strong patterns to preserve

- Small-sample gating and explicit withholding of unsupported correlations.
- Synthetic clinical-trial ML outputs are withheld from production decision
  surfaces.
- Burden fields remain `null` until an actual IHME pull exists rather than being
  backfilled with invented estimates.
- Existing lineage framework and selection-bias caveats are directionally
  strong.

## MeshIC decision rule

Material claims should be promoted to decision-grade only when the exact field
has a resolvable source, the definition/unit matches the source, a relevant
vintage is stored, computations preserve input lineage, and assumptions remain
explicitly labeled assumptions.

High materiality + high disagreement + weak evidence should trigger
human/primary-source diligence — not another model vote.
