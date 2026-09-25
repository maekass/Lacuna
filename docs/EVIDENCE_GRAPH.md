# US Evidence Graph

**Status:** first vertical slice; source-backed research infrastructure, not a
complete US market dataset.

The Evidence Graph is the US-first research layer for Lacuna. It connects
regulatory, surveillance, claims, trial, epidemiology, funding, pricing, and
workforce observations without merging those observations into
`dataset.verified.json`.

## Why this exists

The M&A dataset answers transaction questions. The Evidence Graph answers a
different question:

> What was publicly knowable about a health market, product, care pathway, or
> deployment constraint at a particular point in time?

The first vertical slice uses ferric carboxymaltose (Injectafer) because the
September 2026 FDA safety communication demonstrates the architecture clearly:
a product can have clinical utility while postmarket evidence introduces a
monitoring requirement that matters for care-pathway design and eventual
cross-market translation.

## Observation contract

`src/lib/evidenceGraph/schema.ts` requires each observation to preserve:

- a stable subject and metric;
- the observed value and any comparator such as `lt`;
- the primary source, locator, publication date, and retrieval date;
- source class;
- geography and population when known;
- point-in-time `asOf` semantics;
- evidence kind;
- limitations.

The graph currently permits observed, derived, and proxy evidence. Analyst
assumptions are intentionally excluded from this layer; they belong in explicit
scenario models such as the market-access workbench.

## Point-in-time rule

`assessEvidenceAt()` uses publication date to determine whether evidence was
publicly knowable at a requested snapshot. An earlier event date does not make a
later publication historically admissible.

A source with an unknown publication date is not silently treated as historical
evidence.

## Ferric carboxymaltose vertical slice

`src/data/evidence/ferricCarboxymaltoseUs.ts` currently records two FDA-backed
observations:

1. the August 2026 supplement approval adding a boxed warning for symptomatic
   hypophosphatemia; and
2. FDA's September 2026 statement that Sentinel data showed serum phosphate
   testing in fewer than 20% of ferric-carboxymaltose administration episodes.

The second observation is represented as `value: 0.2` with `comparator: "lt"`.
It must not be displayed or modeled as an exact 20% rate.

The Sentinel observation must not be generalized to pregnancy or to another
country without separate applicability evidence.

## Next connectors

The next useful ingestion targets are source-specific rather than a generic web
scraper:

1. FDA PMR/PMC downloadable database;
2. FDA 522 postmarket surveillance studies;
3. FDA CDRH real-world-evidence regulatory examples;
4. openFDA device 510(k), PMA, event, recall, and UDI endpoints;
5. FDA Drug Trials Snapshots;
6. CMS utilization and drug-spending datasets;
7. NIH RePORTER;
8. CDC/NCHS and HRSA burden/workforce data.

Each connector should emit the same observation contract while retaining its
source-specific identifiers and limitations.

## Translation boundary

US evidence can inform a future target-market translation case, but a US
observation must never silently become a target-market parameter.

Examples:

- an FDA label can establish US regulatory history;
- a US clinical or surveillance result can inform a deployment question subject
  to population applicability;
- US reimbursement cannot become a non-US price;
- US utilization cannot become non-US uptake;
- US monitoring requirements can become requirements to test against the target
  health system.

This boundary is intentional and should be enforced before any automated
US-to-target-market scoring is introduced.