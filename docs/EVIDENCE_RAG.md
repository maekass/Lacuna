# Evidence ask

**Status:** first vertical slice for US women's-health reimbursement and policy
questions. This is functioning retrieval and citation checking over a frozen
public CMS excerpt corpus. It is not a completed multi-source research platform,
and it is not a reviewed clinical or payment system.

## What this slice does

`POST /api/research/evidence/ask` accepts a question, an as-of date, and
optional geography, payer, setting, and data-year filters.

1. Validate the body, cap its size, require the same review identity used by
   other research APIs, and rate-limit the route.
2. Admit passages only after publication date, supersession, redistribution,
   review state, and scope filters. Ranking does not see excluded passages.
3. Ask the existing server inference path for a structured disposition:
   `answer`, `qualified_answer`, or `abstain`.
4. Reject citations that were not retrieved, contradicted structured records,
   treated a missing value as zero, or described unapproved evidence as
   approved.
5. Abstain when support is missing or the inference provider is unavailable.
   There is no fallback to ungrounded model knowledge.

The model cannot approve, publish, or write the reimbursement ledger.

## Lanes

| Lane             | What can be retrieved                                                          | How it is labeled                                                                 |
| ---------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `publication`    | `approved` or `published` claims only                                          | Eligible to be represented as an approved claim only when every citation resolves |
| `research_draft` | `source_verified` and `specialist_reviewed` observations, plus approved claims | Never represented as publication-approved                                         |

The frozen CMS fact-sheet excerpts are `source_verified` public text. They are
usable in the research-draft lane. They are not publication-approved Lacuna
claims. Source registration does not verify a claim.

`machine_proposed`, `rejected`, `superseded`, `insufficient_evidence`, revoked,
and non-public records are not retrieved. The SA051 ledger seed stays
machine-proposed and is not returned as evidence.

## Corpus

Dated excerpts, read on 2026-10-24:

- CMS CY 2026 PFS fact sheet, published 2025-10-31
  (https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2026-medicare-physician-fee-schedule-final-rule-cms-1832-f)
- CMS CY 2025 PFS fact sheet, published 2024-11-01
  (https://www.cms.gov/newsroom/fact-sheets/calendar-year-cy-2025-medicare-physician-fee-schedule-final-rule)

Medicare.gov cervical-screening text and NCD 210.2 coverage conditions are
stored as excerpts, but their web-page publication dates were not established.
Those passages are not historically admissible. The AMA documentation-guideline
list on the NCD page is not stored. CPT descriptor text is not stored.

Synthetic fixtures are labeled `SYNTHETIC FIXTURE` and are separate from the
public excerpts. They exist so tests can exercise revocation, contradiction,
prompt injection, and the publication gate without inventing CMS rates.

FDA, NIH/ClinicalTrials.gov, OpenAlex, and SEC connectors are named and marked
`not_implemented`.

## Retrieval

The default retriever is an in-process lexical index, version `1.0.0`, algorithm
`lexical-v1`. Tie breaks use passage id. `topK` defaults to 5 and cannot
exceed 8. No new vector database or embedding migration is included.

`db/migrations/012_evidence_rag_passages.sql` adds an optional Postgres
full-text table. `buildEvidencePassageSearch` applies the same pre-rank filters
with a bound query parameter. The ask route does not use that table until
passages are loaded. Live Postgres search was not executed in this change.

## Versions and rollback

Each response includes the source snapshot hash, model id, prompt version
(`EVIDENCE_RAG_PROMPT_VERSION`), retriever version, retrieval configuration
hash, and request id. Logs record those operational fields and passage ids. They
do not record the question or passage body.

Rollback is a code revert. Migration 012 only creates a table; it does not drop
or rewrite existing tables. Stop calling the route to stop the feature. Leaving
the unused table in place is safe.

## Evaluation

Exports use `clinicalEvidenceRunSchema` and `evaluateClinicalEvidenceRun`
without changing the scoring rules. Fixture runs keep citation judgments at
`not_assessed` and benchmark cases pending, so the evaluator does not emit
recall or citation-support rates.

Release targets, not results: every published citation resolves to an admissible
passage; tests admit no prohibited evidence; published answers contain no
unresolved citations; no known critical security failure; CI gates pass.
Recall@5 of at least 90 percent and reviewed citation support of at least 95
percent require human adjudication. This slice does not claim those rates.

## Not established

This software path is implemented and covered by fixture tests. That is not
independent verification of production inference, a migrated database, or a
researcher-adjudicated benchmark. Do not describe the CMS excerpts as a coverage
determination or a fee-schedule payment for a service.
