# Founding-year provenance

Human-reviewed backfill for missing `companies[].founded` values. This workflow
does not guess years and does not make a company-year panel analysis-ready.

The company record can store an integer `founded` and a `foundedPrecision` of
`year`, `estimated`, or `unknown`. It does not store a field-level source URL,
source name, access date, evidence locator, confidence, reviewer, or review
status for that year. Company-level `sources[]` are free-text citations for the
row, not a founding-year attestation. Those fields live in the review ledger
`src/data/foundingYearReview.json`.

## Completeness

Computed from `src/data/dataset.verified.json` and the review ledger. Recompute
with `npm run report:founding-years`. `npm run validate:dataset` fails if the
ledger drifts from the catalog.

<!-- FOUNDING_YEAR_STATS_BEGIN -->

- Companies: **150**
- With a founded year: **103** (68.7%)
- Missing a founded year: **47** (31.3%)
- Non-null founded span: **1948–2022**
- Open founding-year review rows: **47**
- Accepted founding-year review rows: **0**

<!-- FOUNDING_YEAR_STATS_END -->

Before this ledger, the catalog already had 47 missing years and a non-null span
of 1948–2022. After this ledger, those figures are unchanged. No missing year
was filled. A company-year panel is **not analysis-ready**.

The 103 stored years are listed in `grandfatheredCompanyIds`. They predate this
gate. They are not field-certified by the ledger, and this workflow does not
re-litigate them. A new year, or a year added to a company that is missing one
today, is accepted only through an `accepted` review row.

## What must not be inferred

A missing founding year must not be inferred from company age, funding date,
product launch, domain-registration date, or model output. In this catalog,
`portfolioInitialInvestment` is a fund entry date and is also forbidden as a
founding year.

`notInferred` stays false until a reviewer attests that the recorded year was
stated by the cited source. Validation rejects an accepted year when that
attestation is false.

## Acceptable sources

Use the highest source that states the year. If two sources disagree, leave
`foundedYear` null and set `reviewStatus` to `unresolved` or `rejected` with a
note. Do not average years, prefer the newer database, or break the tie with
model output.

| Order | `sourceType`            | Accept when                                                                 |
| ----- | ----------------------- | --------------------------------------------------------------------------- |
| 1     | `official_company`      | The company's own site, about page, or investor materials state the year    |
| 1     | `filing`                | A filing or exchange document states the year                               |
| 2     | `corporate_registry`    | An authoritative registry states the incorporation or founding year         |
| 2     | `investor_materials`    | Investor or fund materials state the year and are not only a portfolio date |
| 3     | `corroborated_database` | A database states the year and a second, different URL states the same year |
| —     | none of the above       | Leave the row unresolved                                                    |

`corroboratingSourceUrl` is required for `corroborated_database` and must be
null for every other type. Crunchbase, PitchBook, and similar databases are not
a sole source. The Crunchbase CSV ingest script does not copy a founded year
into the verified catalog.

An accepted row also needs:

- `foundedYear` — integer from 1800 through the ledger `asOfYear`
- `sourceUrl` — `http` or `https`
- `sourceName`
- `sourceAccessDate` — real `YYYY-MM-DD` day the source was opened
- `evidenceLocator` — quote or locator that states the year
- `confidence` — `stated`
- `reviewStatus` — `accepted`
- `reviewer`
- `notInferred` — `true`

Until then, `foundedYear` stays null. `in_review` may record a source while the
year is still null. `unresolved` rows keep the source fields empty.

## Duplicate entities

Normalized names (portfolio marker and legal suffix removed) collide for two
missing-year rows. Both stay in the backlog, because the catalog rows still have
no `founded` value. Their review status is `blocked_entity_resolution`. Do not
copy the other row's stored year. That stored year has no field-level founding
citation.

| Missing row | Catalog name             | Other row | Other row's stored year, not certified |
| ----------- | ------------------------ | --------- | -------------------------------------- |
| `c114`      | Maven Clinic (portfolio) | `c4`      | 2014                                   |
| `c121`      | Proov (portfolio)        | `c11`     | 2016                                   |

`c44` Smith & Nephew Gynecology (Truclear) is the deal27 divestiture of a
product line, not a second Smith & Nephew company row. Leave it unresolved
unless a source states a founding year for this catalog entity. `c2` Ro is also
`acquirer-ro`; that overlap does not add a missing founding year.

No company id is duplicated. These two name collisions are the entity issue that
affects backfill. The backlog still has one row for every company that lacks
`founded` (47 rows).

## How to record a year

1. Open the company's row in `src/data/foundingYearReview.json`.
2. If `reviewStatus` is `blocked_entity_resolution`, decide whether the row is
   the same legal entity as `canonicalCompanyId`. Do not fill a year first. If
   the rows should remain separate, set `entityResolution` to `distinct`, clear
   `canonicalCompanyId`, and move the row to `in_review`.
3. Find a source in the hierarchy above that states the year.
4. Record `sourceUrl`, `sourceName`, `sourceType`, `sourceAccessDate`, and
   `evidenceLocator`. Use `in_review` while the year is still null.
5. When the citation is complete, set `foundedYear`, `confidence` to `stated`,
   `notInferred` to `true`, `reviewer`, and `reviewStatus` to `accepted`.
6. Set the same integer on the company as `founded` with `foundedPrecision`
   `year`. Remove the company id from the open backlog by keeping that accepted
   row. Do not add the id to `grandfatheredCompanyIds`.
7. Run `npm run validate:dataset`. A year without the accepted row fails. An
   accepted row that does not match `founded` fails. An open row for a company
   that already has `founded` fails.

Promotion of a new company through the review form uses the same attestation.
The draft includes `foundingYearReview`. Copy that object into the ledger when
the company is committed to `dataset.verified.json`. Postgres stores only the
integer.

## What this does not unlock

Kaplan-Meier curves and the acquisition-time hazard fit still exclude companies
without a founding year. The survival curve also keeps only top sectors with a
founding year after 1990. Neither surface is a company-year panel of all 150
companies.
