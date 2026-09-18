# Reimbursement layer audit — Phase 1

Status of existing reimbursement files relative to the evidence engine in
`docs/REIMBURSEMENT_EVIDENCE_ENGINE.md`. Illustrative heuristics stay isolated
from decision-grade evidence.

## Decision-grade path (evidence engine)

| Path                                            | Role                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| `src/lib/reimbursement/schema.ts`               | Canonical issue / claim / source / rate / review contract |
| `src/lib/reimbursement/workflow.ts`             | `source_verified → specialist_reviewed → approved`        |
| `src/lib/reimbursement/validation.ts`           | Ledger integrity and publishability gates                 |
| `src/lib/reimbursement/observations.ts`         | Vintage-aware CMS normalization; missing ≠ 0              |
| `src/lib/reimbursement/payment.ts`              | Deterministic PFS formula from explicit inputs            |
| `src/lib/reimbursement/sourceManifest.ts`       | Public-source ingestion provenance                        |
| `src/lib/reimbursement/ingestion.ts`            | Python + DuckDB / Parquet → TypeScript contract           |
| `src/lib/reimbursement/lineage.ts`              | SA051 hop-order checks; no economics on investigation     |
| `src/data/reimbursement-evidence-sa051.ts`      | SA051 investigation target (no economics)                 |
| `src/data/reimbursement-source-manifest.ts`     | Public CMS catalog URLs only                              |
| `scripts/reimbursement/ingestion_contract.py`   | Python sidecar producer for the TypeScript adapter        |
| `src/app/api/reimbursement/evidence/route.ts`   | Read-only ledger + publishability status                  |
| `src/components/ReimbursementEvidencePanel.tsx` | Investigation card on `/intelligence`                     |

The Intelligence workspace already uses `InvestmentGradeReimbursementIntel`,
which reads verified deals only. The SA051 panel is investigation status, not
payment.

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
live reimbursement section is verified-deal context plus the SA051 investigation
card.

## Guardrails encoded in code

- Evidence-engine modules must not import `valuation-premium-calculator` or
  `cpt-code-matcher`.
- Keyword CPT-presence premiums return
  `premiumProvenance: "illustrative_heuristic"` and
  `isDecisionGradeReimbursementPremium()` is always false.
- SA051 is seeded as `machine_proposed` with no sources, rates, or dollar claims
  until a reviewer attaches a vintage-specific public file.
- `GET /api/reimbursement/evidence` reports `publishable: false` for the seed.
