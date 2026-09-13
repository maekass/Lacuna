# MeshIC Data Audit — Lacuna

**Audit date:** 2026-09-10

This audit applies a decision-grade evidence lens to Lacuna: provenance
strength, field-level sourceability, vintage, calculation semantics, model
uncertainty, and escalation to human/primary-source diligence.

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
