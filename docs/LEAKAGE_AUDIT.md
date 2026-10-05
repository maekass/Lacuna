# Driver-score leakage assessment

Audit artifact for the five `AcquisitionPredictor` driver scores. This document
does not change weights, features, or labels, and it does not certify the scores
as valid. The repository outcome is **confirmed leakage** in
`clinicalValidation`. The other four drivers are not certified free of leakage.

Census figures below are counts from `src/data/dataset.verified.json`
(provenance `datasetVersion` v9, `lastUpdated` 2026-09-20; 150 companies, 59
acquisitions) and the current rows in `src/data/evidence.verified.json`.

## Verdict vocabulary

Each driver has one classification:

| Classification                                 | Meaning in this document                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| confirmed leakage                              | The current code or catalog shows the driver reading a post-outcome attribute, or reading the outcome label itself                                 |
| possible leakage                               | A plausible path exists (usually a missing vintage, or a scorer that ignores a vintage) and the tree does not show the input predates a score date |
| insufficient evidence                          | The tree does not contain the record needed to decide                                                                                              |
| no identified leakage from repository evidence | The live inputs are visible and do not read the outcome, a deal field, or a post-outcome attribute. This is not a certificate of no leakage        |

A correlation, a feature-importance number, or an unflagged timing row is not
used as evidence of no leakage.

## Intended score time

`AcquisitionPredictor.predictAcquisition` takes a `QuantCompany` and no cutoff.
`docs/MODEL_CARD.md` states that the published similarity index has no time
horizon. `timelineMonths` is a stage lookup (60 / 48 / 24 / 12) returned beside
the index and not multiplied into it.

Because no intended prediction date is defined, this assessment cannot place an
undated field "before" or "after" prediction time. The only dated comparison
available is the one a caller supplies to `diagnoseDriverScoreTiming`. Deal
`announcedDate` is an event date. It is not a feature vintage. The evidence
ledger says the same thing: `economicEvidenceAtDecisionDate` requires the
field's own `publicAsOfDate`.

## Outcome, dates, and fields that are not driver inputs

| Item                                        | Definition in the tree                                                                                                                                                                                                                 | Driver input?                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Acquisition label                           | `deriveOutcomeType` in `src/lib/data/selectionProvenance.ts`: `acquired` when the company id is in `acquisitions`, otherwise `unknown`. The enum also lists `ipo`, `shutdown`, and `still-private`; this function does not assign them | No                                                      |
| Second acquired predicate                   | `empiricalPriors.ts` `acquiredCompanyIds`: target id, or `stage` containing `"acquired"`                                                                                                                                               | Used in the index base rate, not inside the five scores |
| `announcedDate`                             | Required `YYYY-MM-DD` on every acquisition (59/59)                                                                                                                                                                                     | No                                                      |
| `closedDate`                                | Present on 55/59 deals. None are earlier than `announcedDate`                                                                                                                                                                          | No                                                      |
| `dealValue`                                 | Present on 50/59 deals                                                                                                                                                                                                                 | No                                                      |
| `preDealValuation` / `preDealValuationDate` | 49/59 deals have both. No `preDealValuationDate` is after `announcedDate`                                                                                                                                                              | No                                                      |
| `computedPremium`                           | Present on 47/59 deals                                                                                                                                                                                                                 | No                                                      |
| `lastKnownValuation`                        | Evidence-ledger field. On targets, 17 current `publicAsOfDate` values are after `announcedDate`, 31 fall on that day, 1 is earlier, and 10 are missing. Several of the later figures equal `dealValue`                                 | No. The panel's Disclosed column reads it               |
| `catalogEntryDate`                          | Null on all 150 companies                                                                                                                                                                                                              | No                                                      |
| `catalogEntryReason`                        | `deal-list` for all 59 targets                                                                                                                                                                                                         | No                                                      |
| `outcomeType`                               | `acquired` for 59 companies, `unknown` for 91                                                                                                                                                                                          | No                                                      |

The published similarity index is `baseRate × weightedScore × sectorAdjustment`
(`composeAcquisitionIndex`). `baseRate` is the leave-one-out catalog exit share
(`leaveOneOutExitRate`). `sectorAdjustment` is
`clamp(sectorShare × 5, 0.8, 1.2)`. Leave-one-out removes the company being
scored from that share. It still uses other companies' outcomes, and it has no
time split. That is label information in the published index. It is not, by
itself, proof about the five drivers, and it is not proof that the drivers are
free of leakage.

## Driver evidence

Live adapter: `adaptQuantCompany` in `src/lib/quant/adaptQuantCompany.ts`.
Scores: `AcquisitionPredictor` in `src/lib/quant/predictionEngines.ts`. Weights:
`DRIVER_WEIGHTS` in `src/lib/quant/priors.ts`. UI: `QuantValuationPanel` reads
`driverScores` for the Top driver column and `probability` for Historical
acquisition-pattern similarity.

| Driver              | Classification                                 | Live inputs                                                                                    | Timestamp                                                                                                      | Outcome relationship                                                                                                                                                                                                                               | Missing data                                                                                         | Weight evidence                                                                                   |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| clinicalValidation  | confirmed leakage                              | `clinicalStage` from `proxyClinicalStage(stage)`; optional `clinicalEfficacy`                  | `stage` has no as-of. `clinicalEfficacy` is never set                                                          | Outcome phrases and one public-listing stage still determine the score. See the confirmed rows below                                                                                                                                               | Null stage → score 0 and the index is withheld. Any other non-empty remainder → `phase2` (score 4)   | `0.25`. Heuristic constant. See Weights                                                           |
| marketTiming        | possible leakage                               | `raisedToDate` ← `totalFunding`; `annualRevenue`; `targetMarketSize`; `geographicFocus.length` | `totalFunding.publicAsOfDate` exists and is ignored by the scorer. The other three inputs are unset or undated | The scorer will use a funding total whose publication day is after a cutoff. On this catalog, no target funding row has a `publicAsOfDate`, so none are shown to fall after `announcedDate`. That gap is not evidence the totals predate the deals | Absent funding is omitted (no `?? 0`). Absent `targetMarketSize` is compared as 0 and adds no points | `0.20`. Heuristic constant. Thresholds `< 10` and `> 50` have no fitted derivation                |
| teamQuality         | no identified leakage from repository evidence | `teamMetrics` (`founderSerialEntrepreneur`, `advisorStrength`, `retentionRisk`)                | No team field and no timestamp exist                                                                           | The live score is the constant 5. It does not read `outcomeType`, `stage`, deal value, or valuation                                                                                                                                                | `teamMetrics` is never assigned, so the inner branch does not run                                    | `0.20`. Heuristic constant. The constant 5 has no separate derivation                             |
| strategicFit        | possible leakage                               | `sector` via `classifyValuationType`; `geographicFocus`; an unconditional `+2`                 | `sector` and HQ have no as-of                                                                                  | The score does not read the acquisition label. Sector and HQ can still be catalog text written with knowledge of later events; the tree does not date them                                                                                         | No sector imputation. Missing HQ is handled in the geography adapter                                 | `0.20`. Heuristic constant. The `+2` / biotech `+2` / Africa `+1` steps have no fitted derivation |
| geographicArbitrage | possible leakage                               | `geographicFocus` from `inferGeographicFocus(hq)`                                              | HQ has no as-of                                                                                                | HQ is not the acquisition label. The score uses whatever HQ is on the row, including HQ inferred when the field is missing                                                                                                                         | Missing or non-matching HQ becomes `["US"]` (46 companies, all non-targets)                          | `0.15`. Heuristic constant. The `+5` / `+3` / `+2` steps have no fitted derivation                |

### clinicalValidation — confirmed leakage

`scoreClinicalValidation` maps `preclinical → 1`, `phase2 → 4`, `phase3 → 7`,
`fda_approved → 10`, and a missing stage to 0. `clinicalEfficacy` would add `+2`
when `africanRepresentation > 0.2` and `+1` when `populationDiversity > 0.7`.
The adapter never sets `clinicalEfficacy`.

`proxyClinicalStage` strips a phrase matching `acquired (by …) (year)` and
returns null when nothing remains. It then maps `public`, `series d|e|f`,
`late stage`, and `pre-ipo` to `fda_approved`; series B and C to `phase3`;
series A to `phase2`; seed or student to `preclinical`; every other non-empty
remainder to `phase2`.

Confirmed on the current catalog:

| Company                     | Id  | `stage`                                      | Resulting clinical score | Index withheld? |
| --------------------------- | --- | -------------------------------------------- | ------------------------ | --------------- |
| 54 targets                  | —   | `Acquired by … (year)` only                  | 0                        | Yes             |
| Invitae Reproductive Health | c54 | `Assets acquired by Natera (2024)`           | 4 (`phase2`)             | No              |
| Indira IVF                  | c73 | `Majority stake acquired by BPEA EQT (2023)` | 4 (`phase2`)             | No              |
| TherapeuticsMD              | c55 | `Products licensed to Mayne Pharma (2023)`   | 4 (`phase2`)             | No              |
| Talkspace                   | c14 | `Public (SPAC 2021)`                         | 10 (`fda_approved`)      | No              |

The stripper removes `acquired by Natera (2024)` and leaves `assets`. It removes
`acquired by BPEA EQT (2023)` and leaves `majority stake`. The license sentence
does not match the acquisition regex. All three remain acquisition targets
(`outcomeType: acquired`) and still receive a clinical stage, so
`predictAcquisition` still emits an index. Talkspace is not an acquisition
target; `outcomeType` stays `unknown` because `deriveOutcomeType` only marks
acquisition targets. The stage string is a completed SPAC listing, and the
`public` branch maps it to the maximum clinical score.

The 54 pure `Acquired by …` rows are the path that returns null and withholds
the probability (`missingInput`: acquisition outcome labels are not used as a
stage proxy). The driver object still contains `clinicalValidation: 0`, and
`QuantValuationPanel` still displays a top driver for those rows. The score is a
function of the outcome sentence.

History, from git, not a guess about motive: commit `c7bdae0` (2026-06-11)
mapped `stage` containing `acquired` to `fda_approved`. Commit `cb3293a`
(2026-09-20, "fix: stop scoring acquisition outcomes as FDA-approved") removed
that mapping. The residual rows and the `public` branch are what the current
functions still do.

These funding-stage strings also map to `fda_approved` and are not, by
themselves, the acquisition sentence: `Private (Late Stage)`,
`Private (Series D)`, `Private (Series D+)`, `Private (Series F)`. Maven Clinic
(c4, `Series D+`) and Kindbody (c7, `Series D`) are acquisition targets whose
stage text is still a round label. The tree has no vintage for those strings.
That part is possible leakage, not a second confirmed mechanism.
`Private (Series G)` misses the `series d|e|f` pattern and falls through to
`phase2`.

### marketTiming — possible leakage

Base score 5. Then `raisedToDate < 10` adds 1, `raisedToDate > 50` subtracts 2,
`annualRevenue > 10` adds 2, `(targetMarketSize ?? 0) > 1000` adds 2, and
`geographicFocus.length > 2` adds 1. The result is clamped to `[1, 10]`.

On the live path `annualRevenue` and `targetMarketSize` are unset, so those
branches do not add points. `inferGeographicFocus` returns one region, so
`length > 2` does not fire.

`raisedToDate` is the current `totalFunding` value when that value is a number.
The scorer does not call `atDecisionDate` or `economicEvidenceAtDecisionDate`.

Current `totalFunding` ledger (40 active rows):

| Fact                                                            | Count |
| --------------------------------------------------------------- | ----- |
| `publicAsOfDate` null                                           | 22    |
| Dated, `datePrecision` `month`                                  | 17    |
| Dated, `datePrecision` `year`                                   | 1     |
| Dated, `datePrecision` `day`                                    | 0     |
| Target companies with a funding row                             | 12    |
| Those 12 with `publicAsOfDate` set                              | 0     |
| Target funding rows with `publicAsOfDate` after `announcedDate` | 0     |

All 12 target funding rows fail the replay gate's provenance check because
`publicAsOfDate` is null. Apostrophe (c74, value 7, `valueBasis`
`unstated_conflict`) and Gennev (c79, value 4.5, same basis) are below 10, so
the scorer adds 1. The tree does not say whether those totals were known before
a score date.

Commit `c7bdae0` used `view.totalFunding ?? 0`, which made a missing total
satisfy `< 10`. Commit `111cda3` (PR #243) stopped that coercion. Absence now
leaves the base score at 5.

`economicEvidenceAtDecisionDate` returns `imprecise-date` before it compares the
day, whenever `datePrecision` is not `day`. `diagnoseDriverScoreTiming` does the
opposite order for its single flag: a real `publicAsOfDate` after the cutoff is
`after-cutoff` even when precision is `month` or `year`, because the ledger
stores the last day of that window. An unflagged imprecise date is still not
replay-eligible.

### teamQuality — no identified leakage from repository evidence

`scoreTeam` starts at 5. With `teamMetrics` it would add 3 for
`founderSerialEntrepreneur`, add `advisorStrength`, and subtract
`0.5 × retentionRisk`, then clamp to `[1, 10]`. The adapter's comment states
that `teamMetrics` is left undefined. No other caller assigns it. The live score
is 5 for every company. That constant does not read the outcome.

This classification covers the live inputs only. It does not show that the
constant 5, or the dormant `+3` / advisor / retention steps, were chosen without
inspecting exits. That question is in the weight section and the open questions.

### strategicFit — possible leakage

`scoreStrategicFit` starts at 5, adds 2 for every company, adds 2 when
`classifyValuationType(sector)` is `biotech`, and adds 1 when `geographicFocus`
contains `Africa`, then caps at 10.

`classifyValuationType` returns `biotech` when the lower-cased sector contains
`biotech`, `therap`, `pharma`, `drug`, or `gene`. On this catalog that branch
matches 14 companies: 4 `Biotech`, 3 `Therapeutics`, and 7 `General Wellness`.
`General Wellness` matches because the substring `gene` occurs inside `general`.
That is what the current function does. It is not an outcome read.

No company has an Africa HQ, so the Africa step does not fire here. Sector and
HQ have no vintage, so the tree cannot show they were known at a score date.

In `c7bdae0` the unconditional `+2` was commented "maternal health is an active
acquisition theme" and the biotech `+2` was commented "IP appeal". Those
comments are not in the current function. They are a stated rationale in that
commit, not a fit to outcomes, and they are not evidence the steps were frozen
before anyone looked at the exit list.

### geographicArbitrage — possible leakage

Score starts at 0. `Africa` adds 5, and `Africa` plus `US` adds another 3.
Otherwise `US` adds 2. The adapter returns exactly one region, so the combined
Africa-and-US step does not run. Current HQ inference: 149 companies become `US`
(including 46 with no HQ, all non-targets) and 1 becomes `Asia` (Indira IVF,
c73, `Udaipur, India`). None become `Africa` or `LatAm`.

Missing HQ is imputed to `US` by the final `return ["US"]`. That imputation does
not read `outcomeType`. It does assign the US score of 2 when the location is
unknown. HQ has no vintage.

## Weights

| Weight              | Value | Where applied                                        | What the repository shows                                   |
| ------------------- | ----- | ---------------------------------------------------- | ----------------------------------------------------------- |
| clinicalValidation  | 0.25  | `DRIVER_WEIGHTS`; multiplied in `predictAcquisition` | Hardcoded. Unchanged since `c7bdae0`                        |
| marketTiming        | 0.20  | same                                                 | Hardcoded. Unchanged since `c7bdae0`                        |
| teamQuality         | 0.20  | same                                                 | Hardcoded. On the live path it always scales the constant 5 |
| strategicFit        | 0.20  | same                                                 | Hardcoded. Unchanged since `c7bdae0`                        |
| geographicArbitrage | 0.15  | same                                                 | Hardcoded. Unchanged since `c7bdae0`                        |

`c7bdae0` (2026-06-11, message "feat: add quant valuation & exit-likelihood
section") introduced the five numbers and the class comment "NOT a trained
classifier — weights are heuristic". The returned caveats included "Driver
weights are heuristic, not learned from outcome data." That sentence is still
returned by `acquisitionModelCaveats` in `src/lib/quant/presentation.ts`. Commit
`34c7cd7` (PR #111, 2026-07-13) moved the object to `DRIVER_WEIGHTS` while
splitting the quant module. No commit message, comment, or script in the tree
shows a regression, grid search, or other estimator that produced these five
numbers.

Weight provenance for every driver is **insufficient evidence** if the question
is whether a person inspected outcomes before typing the constants. The
heuristic sentence is a statement in the source. It is not a procedure log, and
it is not proof the cut points were frozen first. The weights sum to 1. That
identity does not answer the question.

## Downstream uses

| Consumer                  | What it reads                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuantValuationPanel`     | All five `driverScores` (top driver) and `probability` (similarity index)                                                                           |
| `composeAcquisitionIndex` | `weightedScore` times the leave-one-out exit share and the sector-share adjustment                                                                  |
| Risk-factor strings       | `clinicalValidation < 5`, `teamQuality < 5`, absence of `US`, `geographicArbitrage < 2`                                                             |
| `PortfolioOptimizer`      | `predictAcquisition(...).probability`, coerced with `numericOrNull(...) ?? 0`. This path constructs `AcquisitionPredictor` without empirical priors |

`PortfolioOptimizer` is not the homepage panel. The panel passes
`deriveEmpiricalPriors`.

## Authoring-history search

Searched: `git log -S` / `--follow` on `DRIVER_WEIGHTS`,
`scoreGeographicArbitrage`, `proxyClinicalStage`, and `totalFunding ?? 0`;
commit messages containing `leakage`, `D11`, and `acquired`;
`docs/LEAKAGE_AUDIT.md`, `docs/MODEL_CARD.md`, and the 2026-09-20 council note
`docs/reviews/2026-09-20-council-review-claude-fable-5.md`. `gh` was not
available in this environment, so GitHub issue bodies were not read beyond the
PR numbers already stored in commit subjects (`#111`, `#218`, `#243`, `#245`).

Records that exist:

| Record                     | What it establishes                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c7bdae0`                  | Introduces the five weights, the stage-score table, the thresholds, and the heuristic caveat                                                                   |
| `34c7cd7` / `#111`         | Moves the weights into `priors.ts`. No new derivation                                                                                                          |
| `a37b7f9`                  | Prior audit: the `acquired` → `fda_approved` path was tree-provable contamination; weights and cut points were unknown                                         |
| `cb3293a`                  | Stops mapping an acquisition phrase to `fda_approved`; factor coverage no longer adds a target-membership bonus; peer medians exclude the company being scored |
| `111cda3` / `#243`         | Stops coercing missing `totalFunding` to 0; adds the evidence-ledger replay gate                                                                               |
| `87299c2` / `#245`         | Leave-one-out exit share for the index base rate                                                                                                               |
| Council review, 2026-09-20 | Names point-in-time features as an open gap. It does not derive these weights                                                                                  |

No personal intent is inferred from the absence of a note.

## Timing diagnostic

`diagnoseDriverScoreTiming` in `src/lib/quant/driverScoreTiming.ts` is
deterministic and is not called by `predictAcquisition`. It flags a score row
only when `raisedToDate` is a finite number and `fundingPublicAsOfDate` is a
real calendar day strictly after the caller-supplied `cutoff`.

| Status              | Meaning                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `after-cutoff`      | The funding day is later than the cutoff. `flagged` is true         |
| `not-after-cutoff`  | The funding day is on or before the cutoff. This is not a clearance |
| `missing-timestamp` | The scorer would use a funding total that has no `publicAsOfDate`   |
| `invalid-date`      | The cutoff or the stored day is not a real `YYYY-MM-DD`             |
| `feature-absent`    | `raisedToDate` is unset, so the funding thresholds do not run       |
| `no-dated-field`    | That driver has no timestamped input in this repository             |

The report always includes `DRIVER_TIMING_LIMIT`: a missing flag does not
certify the absence of leakage. Stage, sector, HQ, and team inputs cannot be
flagged by this function because they have no feature timestamp to compare.

## Questions that need authoring history

1. What date is a driver score supposed to be valid as of? The code does not
   define one.
2. Were `DRIVER_WEIGHTS`, the stage scores `1/4/7/10`, and the steps `< 10`,
   `> 50`, `> 0.2`, `> 0.7`, `+2`, `+3`, and `+5` written before any inspection
   of which companies had been acquired?
3. For the 54 `Acquired by …` stage strings, what pre-deal funding stage was
   replaced, and where is that earlier string recorded?
4. Are Maven Clinic's `Series D+` and Kindbody's `Series D` the last rounds
   known before announcement?
5. Are the 12 target `totalFunding` totals, all with `publicAsOfDate: null`,
   pre-deal totals? In particular Apostrophe (7) and Gennev (4.5), which
   currently add 1 to market timing.
6. Is Talkspace's `Public (SPAC 2021)` stage intended to mean FDA-approved
   clinical status?
7. Should `Assets acquired …`, `Majority stake acquired …`, and
   `Products licensed …` withhold clinical stage the same way a pure
   `Acquired by …` string does?
8. When was each HQ recorded — founding, catalog entry, or last edit? Forty-six
   missing headquarters are scored as `US`.
9. Was the unconditional strategic-fit `+2` chosen because every catalog company
   is in this women's-health collection, and was the exit list already in view?

## Limitations

The code and the two JSON files can show which fields the five functions read,
which of those fields have dates, how nulls are treated, and which current stage
strings still produce a clinical score. They can show that the five weights are
constants accompanied by a heuristic caveat, and that no in-repo estimator
writes those constants.

They cannot show the author's draft order, spreadsheets, or conversations. They
cannot show that an undated sector, HQ, stage, or funding total was known on a
date the product never defined. They cannot treat `announcedDate` as the vintage
of `totalFunding` or `lastKnownValuation`. A funding row with
`publicAsOfDate: null` is not a row that has been shown to predate the deal.

Closing each open question needs contemporaneous authoring notes or a
pre-registered spec for items 1, 2, 6, 7, and 9, and source documents that date
the replaced stage strings, the two late-stage rounds, the 12 undated funding
totals, and the HQ field for items 3, 4, 5, and 8.

## What this assessment does not claim

The scores are not relabeled, refit, or described as validated. The removed
`acquired` → `fda_approved` mapping is history. The current `clinicalValidation`
path still has the confirmed rows in the table above. `teamQuality`'s live
constant is the only driver whose inputs, as written, do not read outcome or
post-outcome fields. That sentence is limited to those inputs.
