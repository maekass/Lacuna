# Reimbursement layer audit — Phase 1

Status of existing reimbursement files relative to the evidence engine in
`docs/REIMBURSEMENT_EVIDENCE_ENGINE.md`. Illustrative heuristics stay isolated
from decision-grade evidence.

## Decision-grade path (evidence engine)

| Path                                                  | Role                                                      |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/reimbursement/schema.ts`                     | Canonical issue / claim / source / rate / review contract |
| `src/lib/reimbursement/workflow.ts`                   | `source_verified → specialist_reviewed → approved`        |
| `src/lib/reimbursement/validation.ts`                 | Ledger integrity and publishability gates                 |
| `src/lib/reimbursement/observations.ts`               | Vintage-aware CMS normalization; missing ≠ 0              |
| `src/lib/reimbursement/payment.ts`                    | Deterministic PFS formula from explicit inputs            |
| `src/lib/reimbursement/sourceManifest.ts`             | Public-source ingestion provenance                        |
| `src/lib/reimbursement/ingestion.ts`                  | Python + DuckDB / Parquet → TypeScript contract           |
| `src/data/reimbursement-evidence-prototype.ts`        | SA051 investigation target (no economics)                 |
| `src/data/reimbursement-source-manifest-prototype.ts` | Public CMS catalog URLs only                              |
| `src/lib/reimbursement/lineage.ts`                    | SA051 hop order; flags economic assertions                |
| `src/app/api/reimbursement/evidence/route.ts`         | Read-only GET; never publishable for the Phase 1 seed     |
| `src/components/ReimbursementEvidencePanel.tsx`       | Intelligence investigation card                           |
| `scripts/reimbursement/ingestion_contract.py`         | Python sidecar example (catalog-only, no rates)           |

The Intelligence workspace already uses `InvestmentGradeReimbursementIntel`,
which reads verified deals only.

## Illustrative / heuristic — not decision-grade

These modules remain in the repo for historical matching experiments. They must
not feed published evidence, deal economics, or dual-source badges.

| Path                                                    | Why it is not decision-grade                           |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `src/data/valuation-premium-calculator.ts`              | Invented CPT-presence multipliers (1.8× / 1.4× / 0.7×) |
| `src/data/reimbursement-intelligence-integration.ts`    | Wires fuzzy matches into those multipliers             |
| `src/data/cms-reimbursement-connector.ts`               | Local snapshot + product-to-code heuristics            |
| `src/data/cpt-code-matcher.ts`                          | Fuzzy product → CPT matching                           |
| `src/components/ReimbursementIntelligenceDashboard.tsx` | Unused lazy export; still renders heuristic premiums   |
| `src/components/business-model-classifier.tsx`          | Unused lazy export over the same calculator            |
| `docs/REIMBURSEMENT_INTELLIGENCE.md`                    | Documents 5.2× / 2.8× / 1.5× rule-of-thumb tables      |

`ReimbursementIntelligenceDashboard` and `BusinessModelClassifier` are exported
from `src/app/lazyDashboard.tsx` but are **not mounted** on `/intelligence`. The
live reimbursement section is the SA051 investigation card plus verified-deal
context. Neither path publishes heuristic premiums.

## Guardrails encoded in code

- Evidence-engine modules must not import `valuation-premium-calculator` or
  `cpt-code-matcher`.
- Keyword CPT-presence premiums return
  `premiumProvenance: "illustrative_heuristic"` and
  `isDecisionGradeReimbursementPremium()` is always false.
- SA051 is seeded as `machine_proposed` with lineage hops but no sources, rates,
  or dollar claims until a reviewer attaches a vintage-specific public file.
- CPT descriptors are out of scope until licensed. See
  [REIMBURSEMENT_CPT_LICENSING.md](./REIMBURSEMENT_CPT_LICENSING.md).
