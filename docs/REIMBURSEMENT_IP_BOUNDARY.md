# Reimbursement Evidence Engine — IP and Architecture Boundary

## Purpose

This document defines the technical boundary between the reusable Lacuna
reimbursement evidence engine and any future organization-specific deployment.
It is an engineering boundary, not a substitute for a signed commercial or IP
agreement.

## Sovereign Lacuna core

The following are designed as reusable Lacuna platform capabilities and should
remain organization-neutral:

- reimbursement evidence schemas and versioning;
- evidence-state and reviewer workflow logic;
- source/provenance models;
- code-rate observation contracts;
- deterministic validation and publishability gates;
- fee-schedule calculation primitives;
- public-source ingestion contracts;
- economic-unit definitions;
- issue/claim/source/review abstractions;
- audit-log and lineage structures;
- portable import/export schemas;
- test fixtures and quality-assurance rules;
- generic reviewer and administrative interfaces;
- generic AI-assisted extraction interfaces and safety boundaries.

These capabilities must not contain a customer's branding, confidential data,
credentials, proprietary taxonomy, private prompts, reviewer identities, or
organization-specific business rules.

## Deployment-specific layer

A future customer or partner implementation may provide configuration and data
through an adapter boundary. Examples include:

- organization-specific issue taxonomy;
- branding and presentation;
- internal workflow labels;
- private reviewer assignments;
- organization-owned datasets and annotations;
- credentials and deployment configuration;
- organization-specific API integrations;
- licensed third-party content available only to that organization;
- organization-specific prompts or policy instructions.

The presence of deployment-specific configuration must not change ownership or
source-of-truth semantics of the reusable core.

## Dependency direction

The dependency direction is one-way:

```text
organization adapter / deployment
            |
            v
      Lacuna core contract
            |
            v
 public / licensed source interfaces
```

The Lacuna core must never import from a customer-specific adapter.

## Repository rule

Until a separate deployment is intentionally created:

1. No customer name appears in `src/lib/reimbursement/**`.
2. No customer credentials or confidential data are committed to this repo.
3. No private customer taxonomy becomes a required core enum.
4. Generic improvements are implemented in the core first.
5. Customer-specific behavior is supplied later through configuration or an
   adapter interface.
6. Public-source examples are labeled as fixtures or investigation targets until
   validated through the evidence workflow.

## Data and content rights

Source metadata should record storage and redistribution constraints. In
particular:

- public source URLs may be referenced with provenance;
- copyrighted descriptions or licensed code-set content should not be copied
  into distributable datasets unless the applicable license permits it;
- customer-owned data remains outside generic fixtures;
- missing data is never silently converted to zero;
- model-generated text is not treated as a source.

## Commercial boundary

A future deployment package should be constructed from:

1. a versioned Lacuna core release or API contract;
2. a separate organization-specific adapter/configuration package; and
3. an explicit license or commercial agreement governing permitted use.

The deployment package should not require transferring ownership of the Lacuna
core, its generic methods, schemas, algorithms, or reusable improvements.

## Current legal-license note

The repository's legal license is authoritative. This architecture document does
not modify it. The current `LICENSE` should be reviewed separately before a
commercial deployment, particularly its Licensor placeholders and automatic
Change License date.
