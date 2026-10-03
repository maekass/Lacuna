# Reproductive Biopharma Classification

## Purpose

Lacuna uses a reproductive-biopharma sieve to define a **research universe**,
not to assert that a company, asset, financing, or clinical program is
attractive, institutionally investable, clinically effective, or regulatorily
approved.

The sieve exists because the raw reproductive/fertility transaction universe
contains materially different businesses: therapeutics and drug-development
companies, clinical-care providers, consumer applications, wellness products,
diagnostics, devices, and other services. Treating those records as one
homogeneous denominator can create misleading counts, false zeros, and unusable
research views.

The classification layer therefore sits between the source/transaction universe
and downstream analysis:

    Source records
        ↓
    Entity resolution / normalization
        ↓
    Reproductive-biopharma classification
        ↓
    Included / Review / Excluded
        ↓
    Research universe and downstream metrics

## Operational definition

For Lacuna, a **reproductive-biopharma asset** is a development or commercial
asset for which:

1. **Reproductive relevance** is materially connected to the reproductive
  system, reproductive function, reproductive disease, reproductive
  endocrinology, fertility, pregnancy-related complications, or another
  explicitly reproductive indication/mechanism; and
2. **Biopharma modality** is evidenced by a bona fide drug/biologic/therapeutic
  development modality, such as a small-molecule drug, biologic, therapeutic
  protein, monoclonal antibody, cell therapy, gene therapy, or pharmaceutical
  program.

This is deliberately narrower than **women's health** and narrower than
**reproductive health services**.

FDA describes drugs as including articles intended for diagnosis, cure,
mitigation, treatment, or prevention of disease and recognizes biological
products as a distinct class that includes products such as therapeutic
proteins, monoclonal antibodies, cells, and gene therapies. Lacuna uses those
regulatory concepts as an anchoring reference for the modality side of the
classification, while recognizing that a text classifier cannot itself establish
a formal FDA product classification. See the FDA's Drugs@FDA glossary and
Biological Product Definitions.

NIH defines reproductive health around the reproductive systems and related
functions across the life course. Lacuna operationalizes that concept for
transaction research rather than attempting to reproduce a clinical taxonomy.
See NIH/NIEHS Reproductive Health and the NCBI MeSH entry for Reproductive
Health.

## What is not sufficient by itself

The following are **evidence attributes, not defining criteria**:

- inpatient or hospital integration;
- surrogate biomarkers;
- reimbursement or billing pathway;
- nursing workload;
- strategic investor participation;
- clinical-trial stage;
- regulatory pathway;
- disclosed financing size;
- company type labels without supporting evidence.

In particular, an asset does not become reproductive biopharma merely because it
is used in a hospital, and it does not cease to be reproductive biopharma
because it is outpatient or because biomarker evidence is not yet available.

## Classification states

### included

Use when the available record contains evidence for both:

- reproductive relevance; and
- a bona fide therapeutic/biopharma modality.

### review

Use when only one side is established, the language is ambiguous, the modality
is unclear, or the record requires source-level verification.

review is preferable to manufacturing a binary decision from weak text evidence.

### excluded

Use when the record is sufficiently characterized as a
consumer/care-service/wellness offering without evidence of a
therapeutic/biopharma asset.

Exclusion is therefore **not** equivalent to "not healthcare" or "not relevant."
It means the record does not belong in this particular reproductive-biopharma
research universe under the current definition.

## False-positive controls

Keyword-only classification is inherently noisy. The implementation therefore:

- requires signals from both the reproductive and therapeutic dimensions for
  inclusion;
- treats consumer/service language as an exclusion signal rather than an
  automatic override when strong therapeutic evidence is also present;
- preserves inpatient and biomarker fields as evidence rather than hard gates;
- records the definition version with every classification;
- records matched evidence terms and the classification reason;
- leaves ambiguous cases in review.

The classifier must not infer clinical efficacy, regulatory approval,
reimbursement, valuation, investment quality, or strategic intent from these
signals.

## Point-in-time and versioning

The classification definition is versioned as:

    2026-10-reproductive-biopharma-v1

Counts such as 57, 59, or 60 should therefore be treated as **derived outputs of
a versioned classification universe**, not immutable facts about the healthcare
market.

When the definition or evidence set changes, Lacuna should preserve:

- the prior definition version;
- the prior classification state;
- the source evidence;
- the reason for reclassification;
- and the resulting count change.

A future count should be explainable as:

    prior included set
    + newly included records
    - newly excluded records
    ± entity-resolution changes
    = current included set

This prevents a revised count from silently rewriting historical research.

## Known limitations

This classifier is an evidence-first triage layer, not a clinical ontology or
regulatory determination.

The current implementation is intentionally conservative but still relies on
textual signals. It can miss assets whose public descriptions omit their
modality or reproductive indication, and it can produce false positives when a
company uses ambiguous terminology.

The next methodological improvement should therefore be **source-backed
entity-level evidence**, not an ever-growing keyword list: company/product
records, trial identifiers, regulatory identifiers, scientific literature, and
explicit indication evidence should progressively replace free-text inference
where available.

That distinction is central to Lacuna's evidence architecture: the sieve
determines what deserves inclusion in a research universe; it does not
manufacture facts that the source record does not establish.
