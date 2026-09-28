# Therapeutics ontology

**Status:** first reference vertical. This is not a comprehensive therapeutics
database, a valuation model, or an investment recommendation.

The verified acquisition file remains the source for deals. The therapeutics
graph lives beside it in `src/data/therapeutics/` and `src/lib/therapeutics/`.
The two are not merged.

## Why this exists

Lacuna can describe a sourced acquisition. It could not yet describe, with the
same evidence rules, what was publicly knowable about a disease, a therapeutic
asset, a trial, or a regulatory action.

The ontology is the asset-level model for that question:

Disease → population → burden evidence → care pathway → intervention class →
therapeutic asset → clinical trial → regulatory event → commercial evidence →
company → financing or transaction.

Burden evidence, care-pathway steps, financing, and transaction links are schema
room for later work. This vertical fills the disease, population, intervention
class, asset, trial, outcome, regulatory event, catalyst, and a single coding
record. It does not estimate revenue.

## Core entities

| Entity               | Role                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Disease`            | Canonical condition, aliases, sourced codes, and structured population relevance. Women's-health relevance is a sourced rationale, not a boolean.        |
| `Population`         | Age, sex, reproductive stage, geography, or ancestry only as a source-defined term.                                                                      |
| `TherapeuticAsset`   | Name, sponsor, modality, mechanism, target, route, and development status. Unsourced mechanism or target stays absent.                                   |
| `InterventionClass`  | Many-to-many with assets through a sourced link.                                                                                                         |
| `ClinicalTrial`      | One normalized ClinicalTrials.gov study. `resultStatus` is `results_posted` or `results_not_posted`. It is not success or failure.                       |
| `ClinicalOutcome`    | Endpoint, arm, comparator, effect measure, and published statistics. Separate from the trial status.                                                     |
| `RegulatoryEvent`    | Jurisdiction, regulator, event type, dates, and outcome, each sourced.                                                                                   |
| `Catalyst`           | An uncertainty-resolving event. Date role is `actual` or `expected`, with a certainty of `document_date`, `registry_estimated`, or `sponsor_announced`.  |
| `CommercialEvidence` | A numerical or coded commercial field with its own evidence classification.                                                                              |
| `EvidenceConflict`   | Competing observations or a named gap. Unresolved unless a precedence rule is recorded.                                                                  |
| `InvestmentThesis`   | Analyst reasoning: question, supporting and contradicting claim ids, unknowns, assumptions, catalysts, and kill criteria. No buy, sell, or invest score. |

Future rNPV work can attach eligible population, treated population, price,
adoption, and risk adjustment as separate objects. Those inputs are not stored
on the clinical record. Price, share, uptake, and adherence are absent here.

## Evidence rules

Sourced fields use the Evidence Graph kinds `observed`, `derived`, and `proxy`.
`assumption` is not a valid kind. Assumptions are `analyst_assumption` records
on a thesis, and `projectTherapeuticClaims()` skips theses.

Each sourced field keeps a claim id, source id, `asOf`, limitations, and, when
relevant, an event date that can differ from the publication date. Sources keep
a URL, title, publisher, source class, locator, retrieval date, and publication
date when it is known.

Derived values record the derivation. The endometriosis graph derives numeric
ages from registry age strings and maps `hasResults` to `resultStatus`.

Asset-to-trial links use a reviewed rule: `exact_intervention_name` or
`all_intervention_names`, matched case-insensitively to registry intervention
names. Partial names are rejected. The normalizer does not invent arms,
endpoints, enrollment, or asset links.

## Point-in-time behavior

`getTherapeuticStateAt(subjectId, date)` returns:

- admissible claims whose source `publishedAt` is on or before the date
- excluded future claims
- unresolved fields, including sources with no publication date and registry
  fields the snapshot did not contain
- conflicts in scope, without choosing a winner

Admissibility uses `assessPublicationAt()`. An event date does not admit a later
document. A ClinicalTrials.gov study JSON is dated by `lastUpdatePostDate`, not
by `studyFirstPostDate`, because this payload is the current study rather than a
historical version. An openFDA `submission_status_date` is an event date. The
API snapshot has no publication date, so it stays unresolved in historical
views.

Unknown publication dates do not count as historical evidence. Examples in this
vertical: the 2018 Orilissa label's modality and target text, and ICD-10 N80.

## Endometriosis reference vertical

Disease id: `disease-endometriosis`.

ICD-10 N80 and MeSH D004715 are recorded. Their browser pages did not supply a
publication date, so those codes stay unresolved in snapshots. SNOMED CT is not
recorded.

| Asset                                                       | Sponsor on the record                                                             | What is connected                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| elagolix (Orilissa)                                         | AbbVie Inc.                                                                       | US NDA 210450 approval letter (2018-07-23). Mechanism text from the 19 May 2017 NEJM paper. EM-I `NCT01620528` and EM-II `NCT01931670`. Four EM-I primary responder rows. S-009 labeling supplement letter dated from the PDF CreationDate 2023-06-06.                                                    |
| relugolix, estradiol, and norethindrone acetate (MYFEMBREE) | Myovant Sciences GmbH, with Pfizer named from the 5 August 2022 announcement      | SPIRIT 1 `NCT03204318` and SPIRIT 2 `NCT03204331`. Endometriosis approval announcement 2022-08-05. Supplement letter PDF CreationDate 2022-08-08. Fibroid wording is taken from that 2022 announcement and is not back-dated to 2021.                                                                     |
| linzagolix                                                  | Kissei Pharmaceutical Co., Ltd. on `NCT03992846`; Theramex on the EU announcement | Phase 3 registry record. EU endometriosis timing is an unresolved conflict between the Theramex 20 December 2024 announcement ("December 2024") and the G-BA resolution of 5 June 2025 (marketing authorisation 22 November 2024). US status is a missing-primary-confirmation gap, not an FDA rejection. |
| HMI-115                                                     | Hope Medicine (Nanjing) Co., Ltd                                                  | `NCT05101317`. Registry text supports a human monoclonal antibody. Target and intervention class are unresolved. The record is not labeled non-hormonal.                                                                                                                                                  |
| dichloroacetate                                             | University of Edinburgh                                                           | `NCT04046081` (EPiC). Phase is `NA` on the registry. Mechanism is unresolved.                                                                                                                                                                                                                             |
| vipoglanstat                                                | Gesynta Pharma AB                                                                 | `NCT07260669` (NOVA), recruiting. Oral route is the registry phrase "orally". Primary completion `2027-06` is `registry_estimated`, not an actual date. Mechanism and class are unresolved.                                                                                                               |

Normalized outcomes are limited to EM-I dysmenorrhea and non-menstrual pelvic
pain responder percentages at month 3. EM-II, SPIRIT, linzagolix, and HMI-115
results sections are not transcribed. Registry status `COMPLETED` is not treated
as endpoint success.

Commercial evidence is the ICD-10 code N80 only. There is no price, market
share, diagnosis rate, or adherence rate.

Organizations are not linked to `dataset.verified.json` company ids. None of
these sponsors were matched into that acquisition file for this vertical.

Diagnostic inspection, noindex: `/therapeutics/endometriosis`.

## Known limitations

- One disease, six assets, eight trials, five regulatory events, four conflicts,
  and one thesis.
- No label diff between the 2018 Orilissa label and supplement S-009. The
  conflict is recorded and left unresolved.
- The current ClinicalTrials.gov JSON is not a version history. Claims from a
  trial become knowable at `lastUpdatePostDate`.
- openFDA sponsor names are not written backward onto approval-day state.
- EU linzagolix authorisation and the US development stage are not resolved.
- Non-hormonal classification was not copied from secondary articles.
- No rNPV, eligible-population count, or price assumption.
- No composite Lacuna score.

## Explicitly not supported yet

- Full clinical-results ingestion for every linked trial
- Historical ClinicalTrials.gov version reconstruction
- Automated conflict resolution
- Acquisition prediction, portfolio scoring, or a buy/sell score
- Synthetic epidemiology or fabricated market sizes
- Merging this graph into `dataset.verified.json`
