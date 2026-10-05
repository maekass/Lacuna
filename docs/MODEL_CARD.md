# Model Card: Exit Similarity Explorer

**Card revised**: 2026-10-05\
**Components**: `ExitPredictor.tsx` and `QuantValuationPanel.tsx` (lazy-loaded
from `src/app/lazyDashboard.tsx`; mounted on `/deals#quant-valuation` and
`/deals#similarity-indicators` via `src/app/sections/DealsPage.tsx`)\
**Type**: Hand-set scores on a curated catalog. Not a fitted or calibrated
predictive model.\
**Dataset last updated**: 2026-09-20 (`provenance.lastUpdated`)\
**Dataset version**: v9 (`src/data/computed-dataset-summary.json`
`provenance.datasetVersion`, also `dataset.verified.json`)\
**Verified acquisitions**: 59 (`headline.verifiedDeals`)\
**Canonical dataset hash**:
`a6ef9998a42fd5835cf5b3c6b43613b179218c699b450b91faf3358bcbd1f050`

That hash is `hashDataset()` in `src/lib/lineage/datasetHash.ts` applied to the
materialized dataset (verified JSON plus the economic evidence ledger). The same
value is stored on `computed-dataset-summary.json`. It is not the SHA-256 of the
raw `dataset.verified.json` bytes.

---

## Methodology status

Both on-screen quantities are **score-based estimates**. Neither is a fitted
model, a calibrated probability, or a time-to-exit forecast.

1. **Exit Similarity Explorer** adds fixed weights when a disclosed factor is
   present, clamps the sum to [0, 1], and shows an ordinal band (Low / Moderate
   / High). The weights are literals in `buildPredictions`. They are not
   estimated from co-occurrence counts.
2. **Historical acquisition-pattern similarity** multiplies a weighted driver
   score by a historical catalog exit share and by a clamped sector-share factor
   (`composeAcquisitionIndex`). The share's numerator is catalog companies that
   are acquisition targets, or whose stage string contains "acquired". The
   scored company is removed when it is in the catalog. Multiplying a hand-set
   score by that share does not fit or calibrate a predictive model.

`AcquisitionPredictor` also returns `timelineMonths`: 60, 48, 24, or 12 from a
stage lookup in `predictAcquisition`. That number is not rendered, and it is not
multiplied into the index. The preclinical entry is 60 months. That constant is
not an estimated five-year exit probability. The product does not show a
five-year horizon label.

No held-out test, calibration plot, or external validation is implemented for
either score. Do not cite them as causal effects or as a forecast of who will be
acquired, or when.

---

## Counts

These counts are different measurements. A matching integer does not make two
definitions the same count.

| Quantity                               |     Value | Definition                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Companies                              |       150 | `companies.length`. `headline.companiesInNetwork`.                                                                                                                                                                                                                                |
| Acquirers                              |        38 | `acquirers.length`. `headline.acquirerCount`.                                                                                                                                                                                                                                     |
| Verified acquisitions (events / deals) |        59 | `acquisitions.length`. `headline.verifiedDeals`. 59 distinct `targetId` values, each present in `companies`.                                                                                                                                                                      |
| In-sample acquired companies           |        59 | Companies that are an acquisition target, or whose stage string contains "acquired" (`deriveEmpiricalPriors`). In this snapshot that equals the deal count: every target is in the catalog, and no extra company is stage-acquired without a deal. The definitions stay separate. |
| Valuation disclosures                  |        58 | `disclosure.companiesWithValuation`. Companies with a numeric `lastKnownValuation` after `evidence.verified.json` is applied. Raw company objects in `dataset.verified.json` do not store that field. Not the deal count.                                                         |
| Deals with a numeric price             |        50 | `disclosure.dealsDisclosed` (`dealValue` is a number). 9 acquisitions have no numeric price.                                                                                                                                                                                      |
| Companies with no founded year         |        47 | `founded` is null and `foundedPrecision` is `"unknown"`. 103 companies have year precision. 47/150 is 31.3% to one decimal. A company-year panel exists only for those 103 rows.                                                                                                  |
| Acquisition-target sectors             |        13 | Distinct `sector` values among the 59 targets. Mean 59/13, about 4.5 deals. Three of those sectors have one deal: Mental Health, Contraception, Dermatology. The company catalog has 24 sectors. 13 is not the catalog sector count.                                              |
| External coverage reference            |    59/276 | Verified deals divided by `headline.coverageDenominator` for "AOA Dx Follow the Exits (2000–2025)". 21.4% to one decimal (`coverageRate`). Not a Lacuna population rate.                                                                                                          |
| In-sample catalog share                |    59/150 | 39.3% to one decimal. `overallExitRateEstimate`. The quant panel note rounds it to 39% and prints the acquired-company and company counts. It includes the company in each row. It is not the index base rate for a catalog company, and it is not a population exit rate.        |
| Hazard cohort                          | 58 events | `src/data/ml/hazard/acquisition-time-v1.json`: 150 companies, 47 excluded for a missing founded year, 103 analyzed, 58 events, 45 censored. The 58 events are acquired companies with a founded year. They are not the 58 valuation disclosures: 49 companies are in both sets.   |

`dataset.verified.json` is 179,580 bytes. SHA-256 of those bytes:
`110d42236c6f02d64d5a6dc71f6df9c4083b352ceefadfc92616084e43496bb2`.

The hazard artifact records `datasetSha256`
`9257bf1b828456aa399d6f4ad5bc0dac1b66e5b06174c5ab70cd89dd759a4f44` (`fittedAt`
2026-09-21, `datasetVersion` v9). That field is the raw-byte hash at export
(`dataset_sha256` in `ml/hazard/lacuna_hazard/export.py`). It is not the
canonical hash above, and it is not the SHA-256 of the current file. The cohort
counts still match a recount of the current file. This card does not treat the
artifact as re-exported from these bytes.

---

## Intended use / Out of scope

**Intended use:** retrieval and ranking of comparable companies for analyst
review inside this educational catalog. With 59 acquisition events in a
150-company catalog, the repository does not contain a fitted, validated
predictive model.

**Out of scope** (do not use the scores for):

- probability of acquisition
- any time-horizon claim, including a five-year exit probability
- ranking unacquired companies as takeout targets
- any decision threshold, investment advice, or forecast

---

## User-visible strings

Labels that render these quantities:

| Surface                  | String                                                                                                                               | File                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Deals section title      | "Comparable context & historical acquisition-pattern similarity"                                                                     | `DealsPage.tsx`, `QuantValuationPanel.tsx` |
| Deals section note       | "Not a calibrated probability and not a five-year forecast."                                                                         | `DealsPage.tsx`                            |
| Quant panel subtitle     | "not a trained model and not investment advice"                                                                                      | `QuantValuationPanel.tsx`                  |
| Quant panel column       | "Heuristic est." — valuation consensus, not the similarity index                                                                     | `QuantValuationPanel.tsx`                  |
| Quant panel column       | "Historical acquisition-pattern similarity"                                                                                          | `QuantValuationPanel.tsx`                  |
| Quant panel cell         | unitless 0–100 index (`Math.round(similarityIndex * 100)`), no `%`; "—" when the clinical-stage proxy is withheld                    | `QuantValuationPanel.tsx`                  |
| Quant panel column       | "Stage (proxy)" — funding-stage proxy, or "withheld"                                                                                 | `QuantValuationPanel.tsx`                  |
| Quant panel column       | "Top driver" — largest of the five hand-scored drivers, not a fitted importance                                                      | `QuantValuationPanel.tsx`                  |
| Quant panel note         | in-sample catalog share as a percent, labeled separately from the leave-one-out index                                                | `QuantValuationPanel.tsx`                  |
| Quant panel footer       | "Heuristic estimate uses verified comparable-deals anchors only."                                                                    | `QuantValuationPanel.tsx`                  |
| Similarity section title | "Exit Similarity Explorer"                                                                                                           | `DealsPage.tsx`, `ExitPredictor.tsx`       |
| Similarity section note  | "Ordinal bands from fixed, disclosed factor weights. Not a fitted model and not a time-to-exit forecast."                            | `DealsPage.tsx`                            |
| Explorer badge           | "Descriptive · {n} companies" — company count, not the event count                                                                   | `ExitPredictor.tsx`                        |
| Explorer footer          | "Factor weights are fixed and hand-set. They are not estimated from the {n} verified acquisitions."                                  | `ExitPredictor.tsx`                        |
| Explorer column / CSV    | "Similarity band" (Low / Moderate / High). CSV file `lacuna-similarity-band-leaderboard.csv`                                         | `ExitPredictor.tsx`                        |
| Explorer chip            | same ordinal band, subtitle "descriptive factor band"                                                                                | `ExitPredictor.tsx`                        |
| Explorer column          | "Precedent acquirer" (internal field `predictedAcquirer`)                                                                            | `ExitPredictor.tsx`, `PitchBrief.tsx`      |
| Explorer / Pitch brief   | "Data coverage and assumption completeness" — High / Medium / Low, not a confidence interval                                         | `ExitPredictor.tsx`, `PitchBrief.tsx`      |
| Pitch brief              | "Similarity band:"                                                                                                                   | `PitchBrief.tsx`                           |
| Pitch brief              | "Stage group:" — `getMarketPosition` on the mapped funding stage (Emerging, Growth, Late-stage, or Unspecified). Not a k-means label | `PitchBrief.tsx`                           |
| Factor row               | signed integer of `weight × 100`, no percent sign. Title: "Contribution in factor-score points. Not a probability."                  | `ExitPredictor.tsx`                        |
| Shared boundary          | `DETERMINISTIC_COMPARISON_BOUNDARY` in `src/lib/research/evidenceBoundaries.ts`                                                      | both panels and the pitch brief            |

The leaderboard bar width is the 0–1 factor score. The printed text is the band,
not a percentage.

Internal names that are not UI copy: `AcquisitionPredictor.predictAcquisition`,
`probability`, `timelineMonths`, `modelCaveats` (returned, not rendered),
`exitProbability` (the factor score), `predictedAcquirer`, `confidence`, and
`modelEstimate` (the valuation shown as "Heuristic est.").

---

## Surface 1 — Exit Similarity Explorer factor score

**Code**: `buildPredictions` in `src/components/ExitPredictor.tsx`. Stage
strings are mapped by `mapStage` in `src/lib/data/verifiedDatasetAdapters.ts`
before the weights are applied. `mapStage` strips acquisition and license
phrasing, so an "Acquired by …" label does not itself become Public or Late
Stage.

| Factor (UI label)                                            | Weight | Rule                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sector has prior verified exits (n)`                        |  +0.25 | Another acquired company, excluding the row itself, has the same sector. `n` is that count. The weight does not change with `n`.                                                                                                                                                                                                                                 |
| `Late stage funding (Series C+)`                             |  +0.25 | Mapped stage is `Series C`, `Series D`, `Series F`, or `Late Stage`. Mapped `Late Stage` includes source strings with series E, series G, "late", or "pre-ipo".                                                                                                                                                                                                  |
| `Valuation ≥ median prior-exit valuation`                    |  +0.20 | Present only when this company's valuation and the peer median are both finite. Peers are other acquired companies. No stand-in value. Marked unavailable otherwise.                                                                                                                                                                                             |
| `Age within 3 yrs of median age at acquisition announcement` |  +0.15 | Absolute difference at most 3 years. The peer median is age at announcement for other acquired companies with year-precision founding dates (`peerExitAgeMedian`). For a target, this row's age is announcement year minus founded year. For a company that is not a target, the age is the current UTC year minus founded year. Unavailable ages add no weight. |
| `Already public (acquisition less typical path)`             |  −0.15 | Mapped stage is `Public`.                                                                                                                                                                                                                                                                                                                                        |

The displayed late-stage label says "Series C+". The code does not test that
phrase. It tests the mapped stage list above. `mapStage` does not emit `Pre-IPO`
(those source strings become `Late Stage`), so the `Pre-IPO` entry in the
factor's stage array is unused.

Final score = sum of weights for present factors, clamped to [0, 1]. **Weights
are fixed, hand-set, and disclosed.** They are not learned from data.

Bands (`indicatorBand` in `src/lib/quant/indicatorBands.ts`): Low `< 0.25`,
Moderate `[0.25, 0.50)`, High `≥ 0.50`. The score is not shown as a one-decimal
percentage.

`factorCoverageScore` in `src/lib/quant/exitFactorCoverage.ts` is a separate
coverage heuristic, not a confidence interval:

`0.35 + 0.1 × (count of present positive-weight factors) + min(similarPriorExits × 0.05, 0.2)`,
clamped to [0.35, 0.95]. Outcome membership is not an input. The UI shows only
`getConfidenceLabel` (`PitchBrief.tsx`): High `≥ 0.75`, Medium `≥ 0.55`,
otherwise Low.

---

## Surface 2 — Historical acquisition-pattern similarity

**Code**: `AcquisitionPredictor.predictAcquisition` in
`src/lib/quant/predictionEngines.ts`; `DRIVER_WEIGHTS` in
`src/lib/quant/priors.ts`; `composeAcquisitionIndex` and `SECTOR_SHARE_SCALE` in
`src/lib/quant/acquisitionIndex.ts`; `indexExitRate` in
`src/lib/quant/leaveOneOutExitRate.ts`; company fields from `adaptQuantCompany`
in `src/lib/quant/adaptQuantCompany.ts`.

This is a **different** heuristic from Surface 1.

1. Five driver scores, each on a roughly 0–10 scale, are combined as
   `Σ(score × DRIVER_WEIGHTS) / 10`. The weights are `clinicalValidation` 0.25,
   `marketTiming` 0.20, `teamQuality` 0.20, `strategicFit` 0.20,
   `geographicArbitrage` 0.15. They sum to 1 and are not learned. Clinical
   points are preclinical 1, phase 2 is 4, phase 3 is 7, and `fda_approved` is
   10.
2. On the live path, revenue, target market size, clinical efficacy, and team
   metrics are absent, so team quality stays at its default of 5 and market
   timing stays at 5 except for the disclosed-funding adjustment (`raisedToDate`
   under 10 adds 1; over 50 subtracts 2). Strategic fit starts at 5, then always
   adds 2, plus 2 when `classifyValuationType` returns biotech and 1 when the
   geography proxy includes Africa. Geographic focus is inferred from
   headquarters (`inferGeographicFocus`). Africa, Asia, and LatAm are detected
   from the headquarters string; every other headquarters, including Europe and
   a missing headquarters, is placed in the US bucket. On that path the
   geography score is 5 for an Africa headquarters and 2 for the US bucket.
   Clinical stage is `proxyClinicalStage`: a funding-stage proxy, not an
   observed clinical stage. A stage string that is empty after the
   acquisition-phrase strip is withheld. Residual words ("assets", "majority
   stake") and license wording the stripper does not remove still map to
   `phase2`. Public, series D/E/F, late stage, and pre-IPO map to
   `fda_approved`; series B and C map to `phase3`; series A maps to `phase2`;
   seed and student map to `preclinical`; other non-empty strings map to
   `phase2`. When the proxy is null, the index is withheld and the cell is "—".
3. The weighted score is multiplied by a leave-one-out exit share and by
   `clamp(sectorDealShare × SECTOR_SHARE_SCALE, 0.8, 1.2)` with
   `SECTOR_SHARE_SCALE = 5`. The scored company is removed from the numerator
   when it is in the acquired set, and always removed from the denominator. The
   sector's company-level exit share is used as that base rate only when the
   sector still has at least `MIN_SECTOR_SAMPLE` (5) companies after the
   exclusion; otherwise the overall leave-one-out share is used. The deal-count
   multiplier is separate: it applies whenever the sector has a prior, including
   sectors with a single deal. The in-sample catalog share (59/150) stays on
   `overallExitRateEstimate` and is labeled as in-sample. It is not the index
   base rate for a catalog company. A company outside the catalog keeps the
   labeled in-sample share, because there is no row to remove.
4. The product is rendered as a unitless 0–100 index. It is not a probability
   and has no time horizon. Values below `REPORTABLE_RESOLUTION` (0.01) are
   withheld.

The interval on that result rescales the exit-share interval from
`gatedProportionCi` (a BCa bootstrap of the 0/1 sample in
`src/lib/quant/estimators.ts`) by the same weighted score and sector adjustment.
Driver-score uncertainty is not in the interval. The interval is not shown in
the table.

`timelineMonths` is the unused stage lookup described above. No five-year rate
is computed.

"Heuristic est." is the valuation consensus from `ValuationEngine` when a
verified input exists. Comparable-deal anchors are verified transactions. The
quantity is still a heuristic, not a fitted valuation model. It is not the
similarity index.

---

## What neither surface does

- Does not use a trained neural network or any fitted model in the live app
- Does not produce a calibrated probability
- Does not estimate a five-year, or any other, exit horizon
- Does not generalize beyond the companies in this dataset
- Does not constitute investment advice or a forecast
- Does not model when an acquisition might occur

`PortfolioOptimizer` in `predictionEngines.ts` is not mounted on a page.

The acquirer panel's "Descriptive overlap index"
(`AcquirerPredictionDashboard.tsx`) is a different historical-profile score. It
is not either quantity above.

The Kaplan–Meier chart on `/deals#survival-analysis` (`SurvivalCurve.tsx`) is a
separate descriptive curve for a subset of companies with a founding year after
1990 in the top sectors. It is not an input to these scores, it is not a
forecast, and it is not a company-year panel.

---

## Known limitations

| Limitation                     | Detail                                                                                                                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Score, not a fitted model**  | Weights, band cuts, coverage constants, `DRIVER_WEIGHTS`, `SECTOR_SHARE_SCALE`, and `timelineMonths` are hand-set. `SECTOR_SHARE_SCALE` has no in-tree derivation.                                                                                                |
| **In-sample catalog share**    | 59/150 remains the labeled in-sample event fraction of an outcome-selected catalog, not a population rate. The index base rate leaves out the company being scored.                                                                                               |
| **Catalog coverage**           | 59/276 of the AOA Dx reference denominator. The series has its own definitions.                                                                                                                                                                                   |
| **Missing founding years**     | 47/150 companies have no founded year. Observed years span 1948–2022, not an eight-year window. A company-year panel is not constructible. See [FOUNDING_YEAR_PROVENANCE.md](FOUNDING_YEAR_PROVENANCE.md). Time-to-event summaries cannot cover the missing rows. |
| **Small sector samples**       | 13 target sectors, about 4.5 events each; 3 sectors have a single event. The company-level sector exit share is not used when fewer than 5 companies remain after leave-one-out. The deal-count multiplier can still apply.                                       |
| **No held-out test**           | Weights are not validated against unseen data.                                                                                                                                                                                                                    |
| **Circular catalog**           | Peer valuation and age medians, and the exit share, come from the same catalog being scored. Leave-one-out removes the scored company from the exit share and from those peer medians. Age for a company that is not a target uses the current year.              |
| **No time horizon**            | `timelineMonths` is computed and unused. Neither score is a time-to-exit model.                                                                                                                                                                                   |
| **Interval scope**             | The index interval rescales the exit-share bootstrap interval only.                                                                                                                                                                                               |
| **Clinical stage is a proxy**  | `proxyClinicalStage` reads the funding-stage string. Strings that are empty after stripping an acquisition phrase are withheld. Residual outcome wording and a public-listing string still produce a stage, including `fda_approved` for public.                  |
| **58 is two different sets**   | 58 valuation disclosures and 58 hazard events overlap in 49 companies. Neither is the 59-deal count.                                                                                                                                                              |
| **Hazard file is older bytes** | The artifact hash is not the current file hash. See Counts.                                                                                                                                                                                                       |

### Provisional choices

Kept on purpose in this documentation pass, and not claimed as estimated
parameters: the Surface 1 weights and band cuts, the coverage formula, the five
driver weights, `SECTOR_SHARE_SCALE = 5`, the month lookup, the funding-stage
clinical proxy, and the headquarters geography proxy.
| Limitation                           | Detail                                                                                                                                                                                                                                                        | Evidence                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **In-sample catalog share**          | 59/150 = 39.3% remains the labeled in-sample event fraction of an outcome-selected catalog, not a population rate. The acquisition index base rate leaves out the company being scored                                                                        | `empiricalPriors.ts` `overallExitRateEstimate`; `leaveOneOutExitRate.ts`           |
| **Catalog coverage**                 | 59/276 = 21.4% of the AOA Dx "Follow the Exits" 2000–2025 series                                                                                                                                                                                              | `computed-dataset-summary.json` `coverageDenominator` 276, `coverageReferenceName` |
| **Missing founding years**           | 47/150 companies (31.3%) have no `founded` year; a company-year panel is not constructible                                                                                                                                                                    | `dataset.verified.json`                                                            |
| **Small sector n**                   | 13 sectors, averaging 4.5 events; 3 sectors have a single event                                                                                                                                                                                               | measured against `acquisitions`                                                    |
| **No held-out test set**             | Weights are not validated against unseen data                                                                                                                                                                                                                 | this card                                                                          |
| **Circular priors**                  | Median valuation/age (ExitPredictor) are still derived from the same catalog being scored. The acquisition-index exit share no longer includes the scored company. Age uses announcement year minus founding year for dated peers, with missing ages withheld | `ExitPredictor.tsx`; `src/lib/quant/exitAge.ts`; `leaveOneOutExitRate.ts`          |
| **No time dimension**                | Neither surface models when an acquisition might occur                                                                                                                                                                                                        | `predictionEngines.ts:139-144` unused in the index                                 |
| **Interval understates uncertainty** | Quant engine interval rescales the base-rate CI only; driver-score uncertainty is not propagated                                                                                                                                                              | `acquisitionIndex.ts` `composeAcquisitionIndex`                                    |
| **Driver-score leakage**             | `clinicalValidation` still has confirmed leakage from outcome-phrased stage text and from `Public (SPAC …)` → `fda_approved`. The other four drivers are not certified free of leakage. Weights remain heuristic constants. See the leakage assessment.       | `docs/LEAKAGE_AUDIT.md`; `proxyClinicalStage`; `scoreClinicalValidation`           |
| **58 vs 59**                         | `disclosure.companiesWithValuation` is 58; `headline.verifiedDeals` is 59                                                                                                                                                                                     | `computed-dataset-summary.json`                                                    |

---

## Company Similarity Engine

**Component**: `CompanySimilarity.tsx`\
**Code**: `buildObservedFeatures` in
`src/lib/similarity/observedFeatureSimilarity.ts`\
**Type**: Pairwise-complete cosine similarity over hand-built features

Features, in order: one indicator per catalog sector; `log10(valuation + 1) / 4`
when valuation is disclosed; `log10(funding + 1) / 3` when funding is disclosed;
age as years since a year-precision founding year divided by 15, capped at 1,
using the panel's as-of year (not age at exit); a late-stage flag; a public
flag; an acquired flag. A dimension is used only when both companies observed
it. Undisclosed valuation, undisclosed funding, and founding years that are not
year-precision are omitted, not filled with zero.

The panel shows a unitless 0–100 index, not a percentage probability. The badge
is "{n} companies". This is a retrieval tool, not a classification or prediction
model, and not an investment recommendation. No training occurs. The
therapeutics ontology is not an input.

---

## Capital profile clustering

**Component**: `ClusteringAnalysis.tsx`\
**Code**: `computeCapitalClusters` in `src/lib/data/capitalClustering.ts`\
**Algorithm**: 20 iterations of nearest-centroid assignment, k=3, on
`log10(valuation + 1)` × `log10(funding + 1)`. Centroid means and the displayed
medians use `simple-statistics`. Initial centroids are fixed. Companies missing
valuation or funding are excluded and counted as unclustered.

Cluster names are fixed to those three initial slots: **Smaller Capital**, **Mid
Capital**, **Large Capital**. They are not reassigned from the final centroid,
and they are not Emerging / Growth / Late-stage. Those words are the pitch-brief
stage groups (`getMarketPosition`), not this clustering.

Labels are descriptive names for the slots, not predicted classes and not an
investment recommendation. The therapeutics ontology is not an input.

---

## Acquisition-time hazard (`src/lib/scoring/hazard.ts`)

**Type**: Descriptive Cox partial-likelihood fit (Breslow ties) on companies
with a disclosed founded year\
**Artifact**: `src/data/ml/hazard/acquisition-time-v1.json`\
**Training**: Offline `ml/hazard`. `src/lib/scoring/hazard.ts` reads the
artifact. No page imports that module, so the fit is not rendered in the app.

The fit has no covariates: `featureNames` is empty, relative hazard is 1, and
recorded concordance is 0.5. `sufficiency.fits` is true because 58 events meet
the package minimum for reporting a baseline (`MIN_EVENTS_OVERALL` is 20). That
flag is not external validation. Missing founded year is exclusion, not
imputation. Current stage is unused. The consumer returns
`insufficient_disclosed_data` rather than inventing a score when the artifact
cannot be used.

This is not a forecast of future M&A, not an acquisition probability, and not
investment advice. See [HAZARD.md](HAZARD.md). The Kaplan–Meier chart is a
separate component and does not read this artifact.

---

## Citation guidance

If referencing this tool in academic or professional contexts:

> Kass, M. (2026). _Lacuna: Network Intelligence Platform for Women's Health
> M&A_. Open-source portfolio project. The Exit Similarity Explorer applies
> hand-set factor weights to a catalog of 150 companies and 59 verified
> public-domain acquisitions (dataset v9). No fitted predictive model is
> employed. The in-sample catalog share is 59/150 and is labeled as in-sample;
> the acquisition index leaves the scored company out of that share. Coverage
> against the AOA Dx Follow the Exits 2000–2025 denominator is 59/276. Valuation
> disclosures (58) are a different count. https://github.com/maekass/Lacuna

---

## Contact

Mae Kass, MS/MPH (PsyD candidate; incoming MBA 2027) ·
[mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) ·
[github.com/maekass](https://github.com/maekass) ·
[H20 Call to Action signatory](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
(G20 & G7 HDP, Aug 2024)
