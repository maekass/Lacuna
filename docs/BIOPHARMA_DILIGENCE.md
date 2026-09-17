# Biopharma diligence workbook

Lacuna now has a **research-only**, source-gated modeling module at
`src/lib/biopharma/diligenceModel.ts`. It turns one reviewed public-company
dossier into a clinical-pipeline table, annual drug revenue forecast, asset
rNPVs, catalyst list, sensitivity grid, and thesis inputs. It does not populate
the verified M&A dataset or imply that trial search results are verified deals.
No company has been modeled by this change; there are no seeded drug sales,
approval probabilities, or target prices.

## Work one company at a time

1. Pick a public therapeutics issuer relevant to women's health. Record the
   valuation date and issuer in a local JSON dossier. Keep the dossier outside
   `src/data/dataset.verified.json`.
2. For each **asset × indication**, identify NCT study IDs, the endpoint,
   comparator/standard of care, prior results, and the regulatory question.
   Start with ClinicalTrials.gov and primary trial papers, sponsor filings, and
   FDA/EMA records. An NCT ID is an identifier, not proof of efficacy.
3. Build an annual patient funnel: eligible patients (after geography,
   incidence/prevalence, biomarker, and line-of-therapy restrictions), diagnosis
   rate, treatment rate, and market share. Add annual gross price, gross-to-net,
   treatment-year fraction (duration/discontinuation), and a reviewed operating
   cash-flow margin. Capture competition, exclusivity expiry, and label
   expansion in the year-by-year assumptions; model different indications as
   separate assets and avoid overlapping eligible populations.
4. Document the probability of technical **and** regulatory success (PTRS) as a
   reviewed analyst assumption with evidence, not a stage-default constant.
   Record R&D/development costs in the years incurred, including planned burn.
5. Link each catalyst to an asset and primary source. The existing
   [`intel/biopharma-weekly/catalysts.csv`](../intel/biopharma-weekly/catalysts.csv)
   is a _discovery watchlist_. Confirm the event date and meaning against its
   primary source before entering the dossier; preserve date precision and
   basis. A watchlist row never sets PTRS automatically.
6. Write the variant perception, supporting evidence, disconfirming risks, and
   what the next catalyst must establish. Obtain a human specialist review of
   both numerical assumptions and scientific interpretation.

## Input contract

Run `npm run biopharma:model -- path/to/reviewed-dossier.json` to validate the
inputs and print the full calculation plus its evidence/assumptions as JSON. The
`--markdown` option produces a readable draft containing the four artifacts:
`npm run biopharma:model -- --markdown path/to/reviewed-dossier.json`. Keep the
JSON beside the report for every numerical input's source or reviewed
assumption. Both modes require a complete reviewed dossier. The schema
`dossierSchema` is exported for tooling. All dollar inputs are **USD**, not
millions; patient and share counts are counts, not millions.

| Level              | Required fields                                                                                                                                                                            | Provenance                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dossier            | `company`, `ticker`, `asOf`, `valuationYear`, `discountRate`, `cashUsd`, `debtUsd`, `dilutedShares`, `assets[]`, `catalysts[]`, `thesis`                                                   | Numeric values carry provenance individually. Cash/debt/shares should use same filing vintage as valuation date.                        |
| Asset × indication | `assetId`, `drug`, `indication`, `stage`, `trialIds[]`, `endpoint`, `standardOfCare`, `clinicalEvidence[]`, `ptrs`, `launchYear`, `forecast[]`                                             | Each clinical source has HTTPS URL, title, access date, and precise locator. PTRS and launch year must be reviewed analyst assumptions. |
| Forecast year      | `year`, `eligiblePatients`, `diagnosisRate`, `treatmentRate`, `marketShare`, `annualGrossPriceUsd`, `grossToNetDiscount`, `treatmentYearFraction`, `operatingMargin`, `developmentCostUsd` | A complete row is required for each modeled year; missing values fail validation. Zero must be deliberate and sourced or reviewed.      |
| Catalyst           | `assetId`, `event`, `scheduledDate`, `datePrecision`, `dateBasis`, `decisionCriterion`, `bullInterpretation`, `bearInterpretation`, `source`                                               | For approximate dates, use a representative ISO date plus `datePrecision`; do not imply day certainty.                                  |
| Thesis             | `variantPerception`, `evidenceForDifference[]`, `whatChangesTheDebate`, `risks[]`, `author`, `reviewedBy`                                                                                  | Human interpretation, separated from observed facts and numerical assumptions.                                                          |

A numeric field is either `{"kind":"observed","value":...,"source":{...}}` or
`{"kind":"analyst_assumption","value":...,"rationale":"...",`
`"reviewedBy":"...","reviewedAt":"YYYY-MM-DD","evidence":[...]}`. A source is
`{ "url": "https://...", "title": "...", "accessedAt":
"YYYY-MM-DD", "publishedAt": "YYYY-MM-DD", "locator": "page/table/section" }`;
`publishedAt` is optional. Source citations establish traceability, not
independent verification. An analyst assumption remains an assumption even when
accompanied by primary evidence.

## Calculation and interpretation

For each forecast year:

```text
treated patients = eligible patients × diagnosis rate × treatment rate × share
net revenue = treated patients × annual gross price × (1 − gross-to-net)
              × treatment-year fraction
success cash-flow proxy = net revenue × operating margin
year contribution = (PTRS × success cash-flow proxy − development cost)
                    ÷ (1 + discount rate)^(year − valuation year)
asset rNPV = sum(year contribution)
equity value = sum(asset rNPV) + as-of cash − as-of debt
implied value/share = max(0, equity value) ÷ as-of diluted shares
```

The optional `financingScenario` takes `proceedsUsd` and `newShares`, each with
provenance; it returns an **at-valuation-date pro forma** value per share
`max(0, equity value + proceeds) / (diluted shares + new shares)`. It is a
scenario for cash burn/dilution discussion, not a forecast that financing has
occurred. Do not also put its proceeds into as-of cash. Annual development costs
are already subtracted; do not subtract the same burn again.

`sensitivity(dossier, assetId, ptrsValues, shareMultipliers)` reruns the same
case for explicit PTRS and share assumptions and returns an implied value per
share grid. State the chosen scenario assumptions next to the grid. The model
caps multiplied market share at 100%.

The calculation omits terminal value, taxes, working capital, contingent
milestones, royalties, partnership economics, and branch-specific development
costs. `operatingMargin` is a reviewed cash-flow proxy. PTRS is applied once to
operating cash flow, while all listed development costs are treated as certain.
Each dossier must disclose these simplifications before anyone uses the output
as an investment thesis. Neither outputs nor catalysts are live investment
recommendations.

## First reviewed case and acceptance

Choose a real issuer and complete a source ledger from 10-K/10-Q, sponsor
materials, ClinicalTrials.gov, FDA/EMA documents, primary papers, and competitor
trials. Confirm the name and ticker, each clinical classification, patient
funnel, annual price and share path, burn, diluted shares, and PTRS with a
specialist. Compare base/bull/bear scenarios and explain which assumption drives
the thesis. Publish a case only after review; do not backfill missing facts with
illustrative values. The tests use synthetic arithmetic fixtures only and never
ship them as research data.
