# Reimbursement Evidence Engine

## Purpose

Extend Lacuna's existing reimbursement work with a source-traceable, reviewable
evidence layer for women's-health policy and payment questions.

This layer is intentionally separate from the older illustrative
reimbursement-premium logic. It does **not** infer valuation premiums from code
presence, and it does **not** treat fuzzy product-to-code matches as
decision-grade evidence.

## Product thesis

The existing product already supports reimbursement context and public-source
intelligence. The next layer should make each reimbursement claim auditable
across the full chain:

`source document -> issue -> claim -> code/input lineage -> payment mechanics -> reviewer state -> action -> next rule cycle`

AI may propose candidate extractions or contradictions. Structured source
records, deterministic payment logic, and human review remain authoritative.

## Evidence states

Core workflow:

`machine_proposed -> source_verified -> specialist_reviewed -> approved -> published`

Terminal / exception states:

- `rejected`
- `superseded`
- `insufficient_evidence`

A model must never write directly to `approved` or `published`.

## Core entities

The first domain model lives in `src/lib/reimbursement/evidence.ts`.

- `ReimbursementIssue` — business/policy question being investigated
- `ReimbursementClaim` — atomic statement with explicit source and economic unit
- `ReimbursementSource` — source metadata and locator
- `CodeRateObservation` — code-level valuation/payment observation by year,
  payer, locality, and setting
- `ReviewDecision` — human review state and disposition

## Phase 1 — Foundation

Goal: reproduce public reimbursement evidence reliably.

### Inputs

- CMS Physician Fee Schedule / RVU files
- CMS proposed/final rule materials
- HCPCS public files
- licensed / permitted CPT references where applicable
- peer-reviewed literature
- existing Lacuna reimbursement observations

### Controls

- one explicit data vintage per calculation
- field-level source linkage
- no missing-data-to-zero coercion
- CPT descriptions are not republished without appropriate rights
- modeled exposure must be labeled as modeled, with assumptions preserved
- public data only; no PHI/ePHI in phase one

### Deliverables

- canonical source manifest
- normalized public reimbursement observations
- deterministic validation checks
- Python + DuckDB / Parquet ingestion contract into the TypeScript app
- CPT licensing boundary (code numbers and Lacuna labels only unless licensed)
- first evidence-ledger seed records (investigation targets, not conclusions)

## Ingestion contract

Tabular CMS files are processed outside the Next.js runtime. A Python + DuckDB
producer writes Parquet (or JSON) that `src/lib/reimbursement/ingestion.ts`
validates before any row enters the evidence ledger.

Required sidecar fields:

- `contractVersion` (`1.0.0`)
- `sourceManifest` (provenance, storage policy, redistribution)
- explicit `dataYear` vintage on every observation
- null for missing RVU / payment fields — never coerced to zero

Parquet batches point at `output.parquetPath`; JSON batches inline
`observations`. Unknown `sourceArtifactId` values fail closed.

## Phase 2 — Evidence intelligence

Goal: link each finding to a source, code/input, rule cycle, and reviewer
decision.

### Capabilities

- source passage / locator links
- issue + rule-cycle status
- code and practice-expense input lineage
- contradiction detection
- reviewer queue
- approval / rejection / insufficient-evidence disposition

### AI boundary

Permitted:

- propose source extraction
- suggest classifications
- identify possible contradictions
- summarize already-linked evidence

Not permitted:

- directly approve or publish claims
- invent missing reimbursement inputs
- collapse different economic units into one "gap"
- calculate practice-level losses without explicit utilization and payment
  assumptions

## Phase 3 — Product integration

Goal: surface approved evidence inside Lacuna's existing Intelligence workspace.

Potential outputs:

- issue-level evidence cards
- code/input lineage view
- proposed-rule -> final-rule change history
- reviewed payment-mechanics explanations
- policy-cycle monitoring
- analyst export / Tableau layer if useful

## First issues to trace

Start with a small number of live reimbursement questions rather than a broad
platform rewrite.

Suggested sequence:

1. pelvic exam supply-pack / SA051 input lineage
2. same-day E/M + procedure payment logic
3. gynecologic valuation comparisons
4. maternity-code rule-cycle changes
5. well-woman component economics

These are investigation targets, not pre-validated conclusions.

## Technical path

Initial implementation should stay lightweight:

- TypeScript domain model inside Lacuna
- Python + DuckDB / Parquet for source ingestion and reproducible analysis where
  tabular CMS files are easier to process outside the web runtime
- PostgreSQL / Supabase only when persistence and reviewer workflow justify it
- GitHub Actions for scheduled ingestion / QA
- optional semantic retrieval only where exact source lookup is insufficient

## Migration note

The existing `docs/REIMBURSEMENT_INTELLIGENCE.md` and related code contain
illustrative business-model and valuation-premium assumptions. Before those
outputs are used in decision-grade workflows, they should be audited and either:

1. replaced with source-supported observations,
2. clearly isolated as illustrative heuristics, or
3. removed from the production intelligence path.

The evidence engine should become the authoritative reimbursement layer over
time.
