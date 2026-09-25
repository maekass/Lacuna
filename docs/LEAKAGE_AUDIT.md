# Leakage audit — `AcquisitionPredictor` driver scores

**Scope**: `src/lib/quant/predictionEngines.ts` lines 96–108 and
`DRIVER_WEIGHTS` in `src/lib/quant/priors.ts`. The tree-provable contamination
(`"acquired"` → `fda_approved`, and the ExitPredictor target-membership bonus)
has been removed. Weights and remaining cut points stay **unknown**.

**Verdict vocabulary** (only these three):

- `clean — pre-outcome inputs only`
- `contaminated — reads post-outcome data`
- `unknown — provenance not recoverable from the tree`

A `clean` verdict requires a cited line proving the input predates the outcome.
None of the rows below meet that bar.

Live path: `adaptQuantCompany` (`src/lib/quant/adaptQuantCompany.ts`) is the
only adapter that feeds this engine from `dataset.verified.json`.
`annualRevenue`, `targetMarketSize`, `clinicalEfficacy`, and `teamMetrics` are
left undefined (`adaptQuantCompany.ts:106-107`).

---

## Driver scores

| Driver              | Inputs (file:line)                                                                                                                                                       | Post-outcome risk | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Verdict                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| clinicalValidation  | `company.clinicalStage` at `predictionEngines.ts:32-45`; optional `company.clinicalEfficacy` at `:42-44`                                                                 | no (fixed)        | `proxyClinicalStage` (`adaptQuantCompany.ts`) now strips acquisition-outcome phrases and returns `null` for `"Acquired by … (year)"`. `predictAcquisition` then returns `missingInput` instead of scoring the row (`predictionEngines.ts`). `clinicalEfficacy` is still never populated on the live path. The remaining funding-stage → clinical-stage mapping is still a coarse proxy with unknown authoring history — that is not post-outcome membership.                                                | unknown — provenance not recoverable from the tree |
| marketTiming        | `company.raisedToDate` at `predictionEngines.ts:49-50`; `company.annualRevenue` at `:51`; `company.targetMarketSize` at `:52`; `company.geographicFocus.length` at `:53` | unknown           | `raisedToDate` is `view.totalFunding ?? 0` (`adaptQuantCompany.ts:94,102`). The dataset does not carry an as-of date on `totalFunding`. Whether a disclosed total was recorded after an announcement cannot be recovered from the tree. `annualRevenue` and `targetMarketSize` are undefined on the live path. `geographicFocus` is inferred from HQ (`adaptQuantCompany.ts:48-70,104`) — HQ itself has no vintage. Cut points (`< 10`, `> 50`, `> 10`, `> 1000`, `length > 2`) have no derivation in-repo. | unknown — provenance not recoverable from the tree |
| teamQuality         | `company.teamMetrics.founderSerialEntrepreneur` at `predictionEngines.ts:60`; `advisorStrength` at `:61`; `retentionRisk` at `:62`                                       | unknown           | `teamMetrics` is undefined on the live path (`adaptQuantCompany.ts:106-107`). Every catalog company therefore receives the default `score = 5` (`predictionEngines.ts:58`). The tree does not say whether that default, or the +3 / advisor / retention cut points, were chosen by looking at which companies were acquired.                                                                                                                                                                                | unknown — provenance not recoverable from the tree |
| strategicFit        | `classifyValuationType(company.sector)` at `predictionEngines.ts:70`; `company.geographicFocus` at `:71`; unconditional `score += 2` at `:69`                            | unknown           | Sector is a catalog label with no as-of date. `classifyValuationType` (`priors.ts:63-78`) reads only the sector string. The unconditional +2 (`predictionEngines.ts:69`) and the biotech +2 / Africa +1 increments have no derivation. The tree does not show whether any of these were tuned on observed exits. `geographicFocus` is the HQ proxy noted above.                                                                                                                                             | unknown — provenance not recoverable from the tree |
| geographicArbitrage | `company.geographicFocus` at `predictionEngines.ts:77-81`                                                                                                                | unknown           | Reads only the HQ-inferred region list (`adaptQuantCompany.ts:48-70,104`). HQ is not itself an outcome, but there is no vintage and no evidence the +5 / +3 / +2 increments were chosen without looking at exits.                                                                                                                                                                                                                                                                                           | unknown — provenance not recoverable from the tree |

---

## DRIVER_WEIGHTS

| Weight              | Value | Inputs (file:line)                                    | Post-outcome risk | Evidence                                                                                                                                                                                                                  | Verdict                                            |
| ------------------- | ----- | ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| clinicalValidation  | 0.25  | `priors.ts:54`; applied at `predictionEngines.ts:109` | unknown           | Constant. No comment, commit message in this file, or derivation links it to a pre-outcome procedure. The weight multiplies a contaminated driver (see above) but the weight itself has no recoverable authoring history. | unknown — provenance not recoverable from the tree |
| marketTiming        | 0.20  | `priors.ts:55`; applied at `predictionEngines.ts:109` | unknown           | Same: a bare constant with no in-tree derivation.                                                                                                                                                                         | unknown — provenance not recoverable from the tree |
| teamQuality         | 0.20  | `priors.ts:56`; applied at `predictionEngines.ts:109` | unknown           | Same. On the live path this weight always scales the default score of 5.                                                                                                                                                  | unknown — provenance not recoverable from the tree |
| strategicFit        | 0.20  | `priors.ts:57`; applied at `predictionEngines.ts:109` | unknown           | Same.                                                                                                                                                                                                                     | unknown — provenance not recoverable from the tree |
| geographicArbitrage | 0.15  | `priors.ts:58`; applied at `predictionEngines.ts:109` | unknown           | Same. Weights sum to 1.00; that identity is not evidence they were set without looking at outcomes.                                                                                                                       | unknown — provenance not recoverable from the tree |

---

## Related path (not in the five drivers, recorded so it is not missed)

`ExitPredictor.tsx` `buildPredictions` is a separate heuristic. Peer medians and
similar-exit counts now exclude the company being scored. Factor coverage
(`src/lib/quant/exitFactorCoverage.ts`) no longer adds `+0.1` when the company
is already a target. Comparing an unacquired company's valuation to the median
of acquired peers remains an outcome-selected comparable — documented, not
removed. The surface is mounted at `/deals#similarity-indicators`.

Age comparables in that surface use the verified acquisition's **announcement
year minus a year-precision founding year** (`exitAgeAtAnnouncement`). This is
an integer-year comparison, not an exact birthday-based duration or a claim
about the closing date. Estimated/missing founding years and missing/invalid
announcements contribute no age factor; a peer median is unavailable when no
eligible dated peers remain. Acquired rows use their own event age as the
comparison age; non-acquired rows use current age only in this descriptive view.
Neither age nor the other current catalog fields establish historical
observability for a prospective experiment.

`atDecisionDate` in `src/lib/data/pointInTime.ts` is the field-level admission
gate for a future dated replay: it requires a source and the **field's own**
valid as-of date on or before the decision cutoff. It rejects unknown vintages
and later values explicitly. The catalog does not yet provide these dates for
most economic fields; the helper does not make current heuristic outputs
point-in-time valid, and no forecasting path is enabled by this change. Deal
announcement dates cannot stand in for valuation or funding vintages.

The catalog exit share itself (`empiricalPriors.ts:180-184`) is
`acquiredInDataset / companies.length`. That is the _target_, not a driver. It
is listed here only to note that the index multiplies the weighted score by an
in-sample event fraction.

---

## What the repository cannot settle

1. **Authoring history of the weights and cut points.** Nothing in the tree
   records whether `DRIVER_WEIGHTS`, the stage-score table
   (`predictionEngines.ts:33-38`), or the numeric thresholds (`< 10`, `> 50`,
   `> 0.2`, `> 0.7`, …) were chosen before looking at which companies were
   acquired. Resolving this needs the author's recollection or contemporaneous
   notes — not another code search.
2. **Vintage of `totalFunding`, `lastKnownValuation`, `stage`, and `sector`.**
   Funding and valuation now materialize from `evidence.verified.json`, but
   the initial migrated records preserve their legacy citations with
   `publicAsOfDate: null`. They remain unavailable in a point-in-time replay
   until a dated source is backfilled. Stage and sector still have no field
   vintage. A value sitting on an acquired company may be the deal price, a
   post-deal stage string, or a pre-deal figure; the catalog alone does not say.
3. **Dead branches.** `clinicalEfficacy` and `teamMetrics` never arrive from the
   verified adapter. Their cut points cannot be checked against outcomes because
   they never run. That is not evidence they are clean.

Until (1) is answered, no model built on these five drivers can be defended as
leakage-free. Treat every weight and every live cut point as **unknown**. The
one tree-provable contamination — mapping `"acquired"` to `fda_approved` — is
closed: those rows now fail closed instead of receiving the maximum clinical
score.
