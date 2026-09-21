# Model Card: Acquisition similarity indicators

**Components**: `ExitPredictor.tsx` and `QuantValuationPanel.tsx` (lazy-loaded
from `src/app/lazyDashboard.tsx`; mounted on `/deals#quant-valuation` and
`/deals#similarity-indicators` via `src/app/sections/DealsPage.tsx`)\
**Type**: Deterministic weighted indicators (not a fitted/trained model)\
**Last updated**: 2026-09-20\
**Dataset version**: v9 (`src/data/computed-dataset-summary.json`
`provenance.datasetVersion`)\
**Verified acquisitions**: 59 (`headline.verifiedDeals`)\
**Dataset hash**:
`185c97cedaace8a9bc0a5ae65e4a2d62e1c3efed06dc94234e7fca4d06b521b4`

The number **58** in `computed-dataset-summary.json` is
`disclosure.companiesWithValuation` (the valuation-disclosure count: 58/150). It
is **not** the acquisition count. Prior analyses, including this card through
June 2026, conflated the two.

---

## Intended use / Out of scope

**Intended use:** retrieval and ranking of comparable companies for analyst
review inside this educational catalog. The scores are descriptive of this
catalog, not a predictive model. With 59 acquisitions total (and a subset
available as priors for any given candidate), there is insufficient data to
train, validate, or claim statistical predictive power.

**Out of scope** (do not use the scores for):

- probability of acquisition
- any time-horizon claim (including five-year exit odds)
- ranking unacquired companies as takeout targets
- any decision threshold, investment advice, or forecast

---

## User-visible strings

Every user-visible label that renders these quantities, with file:line against
this tree:

| Surface                    | String                                                                                   | File:line                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Quant valuation heading    | "Quant valuation & similarity index (heuristic)"                                         | `QuantValuationPanel.tsx:117`                                 |
| Quant valuation column     | "Heuristic est."                                                                         | `QuantValuationPanel.tsx:159`                                 |
| Quant valuation column     | "Similarity index"                                                                       | `QuantValuationPanel.tsx:162`                                 |
| Quant valuation cell       | unitless 0–100 index (`Math.round(similarityIndex * 100)`), no `%`                       | `QuantValuationPanel.tsx:216-218`                             |
| Quant valuation footer     | "Heuristic estimate uses verified comparable-deals anchors only."                        | `QuantValuationPanel.tsx:240`                                 |
| ExitPredictor heading      | "Acquisition similarity indicators"                                                      | `ExitPredictor.tsx:350`                                       |
| ExitPredictor column       | "Similarity band" (Low / Moderate / High)                                                | `ExitPredictor.tsx:558`                                       |
| ExitPredictor chip         | same ordinal band                                                                        | `ExitPredictor.tsx:481`                                       |
| ExitPredictor / PitchBrief | "Factor coverage" — High / Medium / Low label of the factor-coverage heuristic, not a CI | `ExitPredictor.tsx:496-500`, `:564`; `PitchBrief.tsx:148-151` |

Internal code still uses `AcquisitionPredictor.predictAcquisition()`
(`predictionEngines.ts:99`) and a `probability` field (`types.ts:99`). Those
names are implementation identifiers, not UI copy.

---

## Surface 1 — ExitPredictor factor score

**File**: `src/components/ExitPredictor.tsx` (`buildPredictions`, :64-207)

For each company in the verified set, the panel sums hand-set weights for
factors that are present:

| Factor                                         | Weight | Direction | File:line                   |
| ---------------------------------------------- | ------ | --------- | --------------------------- |
| Sector has prior verified exits                | +0.25  | Positive  | `ExitPredictor.tsx:135-139` |
| Late-stage funding (Series C+)                 | +0.25  | Positive  | `ExitPredictor.tsx:140-144` |
| Valuation ≥ median prior-exit valuation        | +0.20  | Positive  | `ExitPredictor.tsx:145-149` |
| Age within 3 years of median prior-exit age    | +0.15  | Positive  | `ExitPredictor.tsx:150-154` |
| Already public (acquisition less typical path) | −0.15  | Negative  | `ExitPredictor.tsx:155-159` |

Final score = sum of weights for present factors, clamped to [0, 1]
(`ExitPredictor.tsx:162-169`). **Weights are fixed, hand-set, and disclosed.**
They are not learned from data.

The UI renders the score as an ordinal **similarity band**
(`indicatorBands.ts`): Low `< 0.25`, Moderate `[0.25, 0.50)`, High `≥ 0.50`. It
does not render a one-decimal percentage.

A separate `confidence` number (`ExitPredictor.tsx:178-186`) is **not** a
confidence interval. It is a factor-coverage heuristic:

`0.35 + 0.1 × (count of present positive-weight factors) + min(similarPriorExits × 0.05, 0.2)`,
clamped to [0.35, 0.95] (`exitFactorCoverage.ts`). Outcome membership is not an
input. Peer medians exclude the company being scored.

The UI label is **Factor coverage** and shows only the High / Medium / Low
mapping from `getConfidenceLabel` (`PitchBrief.tsx:37-41`): High `≥ 0.75`,
Medium `≥ 0.55`, otherwise Low. No second percentage is rendered.

---

## Surface 2 — QuantValuationPanel similarity index

**Files**: `src/components/QuantValuationPanel.tsx`;
`src/lib/quant/predictionEngines.ts` (`AcquisitionPredictor`);
`src/lib/quant/priors.ts` (`DRIVER_WEIGHTS`);
`src/lib/quant/acquisitionIndex.ts`

This is a **different** heuristic from Surface 1.

1. Five driver scores (`predictionEngines.ts:99-105`) are combined with
   `DRIVER_WEIGHTS` (`priors.ts:53-59`) and divided by 10
   (`predictionEngines.ts:107-111`).
2. That weighted score is multiplied by the catalog exit share
   (`empiricalPriors.ts:180-184` = acquired-in-dataset / companies.length,
   currently 59/150) and a sector-share adjustment (`acquisitionIndex.ts`
   `SECTOR_SHARE_SCALE = 5`, an undocumented heuristic pending derivation).
3. The product is rendered as a unitless 0–100 similarity index
   (`QuantValuationPanel.tsx:216-218`). It is **not** a probability and has **no
   time horizon**.

`timelineMonths` (`predictionEngines.ts:139-144`) is a hardcoded per-stage
lookup (60/48/24/12). It is returned alongside the index and is **never
multiplied into it**. No five-year rate is computed.

Valuation column ("Heuristic est.") uses verified comparable-deals anchors only
(`QuantValuationPanel.tsx:240`). The anchors are verified; the quantity is still
a heuristic, not a fitted model.

---

## What neither surface does

- Does not use a trained neural network or any fitted model in the live app
- Does not produce statistically valid probability estimates
- Does not generalize beyond the companies in this dataset
- Does not constitute investment advice or a forecast
- Does not model _when_ an acquisition might occur

---

## Known limitations

| Limitation                           | Detail                                                                                                                                         | Evidence                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **In-sample base rate**              | 59/150 = 39.3% is the event fraction of an outcome-selected catalog, not a population rate                                                     | `empiricalPriors.ts:180-184`                                                       |
| **Catalog coverage**                 | 59/276 = 21.4% of the AOA Dx "Follow the Exits" 2000–2025 series                                                                               | `computed-dataset-summary.json` `coverageDenominator` 276, `coverageReferenceName` |
| **Missing founding years**           | 47/150 companies (31.3%) have no `founded` year; a company-year panel is not constructible                                                     | `dataset.verified.json`                                                            |
| **Small sector n**                   | 13 sectors, averaging 4.5 events; 3 sectors have a single event                                                                                | measured against `acquisitions`                                                    |
| **No held-out test set**             | Weights are not validated against unseen data                                                                                                  | this card                                                                          |
| **Circular priors**                  | Median valuation/age (ExitPredictor) and the 59/150 share (QuantValuationPanel) are derived from the same catalog being scored                 | `ExitPredictor.tsx:74-85`; `empiricalPriors.ts:180-184`                            |
| **No time dimension**                | Neither surface models when an acquisition might occur                                                                                         | `predictionEngines.ts:139-144` unused in the index                                 |
| **Interval understates uncertainty** | Quant engine interval rescales the base-rate CI only; driver-score uncertainty is not propagated                                               | `acquisitionIndex.ts` `composeAcquisitionIndex`                                    |
| **Leakage (weights unknown)**        | Driver weights and remaining cut points have no in-tree derivation. The `"acquired"` → `fda_approved` proxy is removed; those rows fail closed | `docs/LEAKAGE_AUDIT.md`; `adaptQuantCompany.ts` `proxyClinicalStage`               |
| **58 vs 59**                         | `disclosure.companiesWithValuation` is 58; `headline.verifiedDeals` is 59                                                                      | `computed-dataset-summary.json`                                                    |

---

## Company Similarity Engine

**Component**: `CompanySimilarity.tsx`\
**Type**: Cosine similarity over hand-engineered feature vectors

Each company is represented as an 8-dimensional vector encoding sector, stage,
valuation tier, age, and funding characteristics. Similarity is computed via
cosine distance. This is a **retrieval/comparison tool**, not a classification
or prediction model. No training occurs; the feature encoding is manually
defined.

---

## K-Means Clustering

**Component**: `ClusteringAnalysis.tsx`\
**Algorithm**: Lloyd's algorithm, k=3, 2D space (valuation × funding)\
**Library**: `simple-statistics`

Clusters are labeled Emerging / Growth / Late-stage based on centroid position.
Labels are descriptive post-hoc assignments, not predicted classes. Cluster
stability is low and results should be interpreted qualitatively.

---

## Acquisition-time hazard (`src/lib/scoring/hazard.ts`)

**Type**: Descriptive Cox partial-likelihood fit (Breslow ties) on companies
with a disclosed founded year\
**Artifact**: `src/data/ml/hazard/acquisition-time-v1.json`\
**Training**: Offline `ml/hazard` — not imported by the Next.js bundle

The fit has no covariates: sector dummy indicators are not used, so relative
hazard is 1 and the artifact is a Breslow / Nelson–Aalen baseline on this
curated sample. Missing founded year is exclusion, not imputation. Current stage
is unused (acquired labels leak the event). The consumer returns
`insufficient_disclosed_data` rather than inventing a score.

This is **not** a forecast of future M&A, **not** an acquisition probability,
and **not** investment advice. See [HAZARD.md](HAZARD.md).

---

## Citation guidance

If referencing this tool in academic or professional contexts:

> Kass, M. (2026). _Lacuna: Network Intelligence Platform for Women's Health
> M&A_. Open-source portfolio project. Acquisition similarity indicators use
> deterministic factor scoring derived from n=59 verified public-domain
> acquisitions (dataset v9); no fitted predictive model is employed. The
> in-sample catalog share is 59/150; coverage against the AOA Dx Follow the
> Exits 2000–2025 series is 59/276. https://github.com/maekass/Lacuna

---

## Contact

Mae Kass, MS/MPH (PsyD candidate; incoming MBA 2027) ·
[mps5cy@virginia.edu](mailto:mps5cy@virginia.edu) ·
[github.com/maekass](https://github.com/maekass) ·
[H20 Call to Action signatory](https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf)
(G20 & G7 HDP, Aug 2024)
