# Completion proxy as a triage decision tool

This doc covers the decision layer on top of the completion-proxy models
(`completion-proxy-v3` family, served by `services/python-api`): the decision
metric and gate, the v4 point-in-time model, censoring, the external check,
explanations, and shadow mode. All numbers come from
[`decision_evaluation.json`](../services/python-api/model_registry/completion/decision_evaluation.json).
None come from `training_seed.json`.

## The decision

A reviewer looks at the **top k% of trials ranked by risk** and nobody else,
where `risk_stopped = 1 - probability_completed`. Stopped means TERMINATED,
WITHDRAWN or SUSPENDED. The primary k is **10%**; 5% and 20% are also reported.
Ties are broken by `nct_id` and the reviewed count is `ceil(k * n)`.

For each k the evaluation reports recall@k (the share of stopped trials that
land in the reviewed set), precision@k (the share of reviewed trials that
stopped) and lift@k (precision@k divided by the stopped prevalence, so random
review scores 1.0). Each comes with a bootstrap 95% CI (2,000 resamples, seed
42). A net-benefit table covers threshold probabilities 0.05 to 0.30 on
`risk_stopped`.

## Pre-registration and order of work

The gate, thresholds, v4 recipe, censoring rule, external cohort and subgroups
were committed before any test-set evaluation:

| Order | Commit     | What                                                                                                                                                                                                                 |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `4fa3f6a3` | [`completion-decision-v1.json`](../ml/clinical_trials/preregistration/completion-decision-v1.json): gate `decision-gate-v1`, k, bootstrap, v4 rule, censoring, external queries, subgroups                           |
| 2     | `3a47a11a` | corrects the `registered_at_utc` timestamp to the commit time (content unchanged)                                                                                                                                    |
| 3     | `24a597f6` | [`addendum-1`](../ml/clinical_trials/preregistration/completion-decision-v1-addendum-1.json): fixes the five version-0 features after the history endpoint turned out to be reachable, before any labels were joined |
| 4     | `f066f31b` | all evaluation code, committed before the evaluation ran                                                                                                                                                             |
| 5     | `b107bd0c` | first evaluation run, committed exactly as produced                                                                                                                                                                  |
| 6     | later      | re-run with identical metrics. It only fixes the `direction` labels on the paired deltas (they said "tensorflow"), adds per-version rank thresholds and v4 serving metadata, and updates the registry                |

**Decision gate `decision-gate-v1`** (all four must pass on the temporal
holdout): ROC AUC 95% CI lower > 0.55; Brier < base-rate Brier; ECE ≤ 0.05;
**lift@10% 95% CI lower > 1.0**. This gate replaces the accuracy-vs-majority
check. That check stays recorded as `legacy_accuracy_gate` and still fails for
v3 (0.874 = majority 0.874).

## Results (temporal holdout, start year > 2023, n = 1,540, 194 stopped)

| Metric                   | v3 `3.0.0-logreg`    | v4 `4.0.0-logreg-pit` |
| ------------------------ | -------------------- | --------------------- |
| ROC AUC [95% CI]         | 0.711 [0.670, 0.752] | 0.761 [0.720, 0.800]  |
| Brier (base rate 0.1101) | 0.1020               | 0.0976                |
| ECE                      | 0.031                | 0.042                 |
| lift@5% [CI]             | 4.12 [3.15, 5.05]    | 5.05 [4.23, 6.00]     |
| lift@10% [CI]            | 2.94 [2.39, 3.53]    | 3.92 [3.28, 4.47]     |
| lift@20% [CI]            | 2.19 [1.88, 2.53]    | 2.60 [2.29, 2.95]     |
| recall@10% (stopped)     | 0.294 (57/194)       | 0.392 (76/194)        |
| precision@10%            | 0.370                | 0.494                 |
| Net benefit @ pt 0.10    | 0.0534 (all: 0.0289) | 0.0602 (all: 0.0289)  |
| Net benefit @ pt 0.20    | 0.0214 (all: −0.093) | 0.0304 (all: −0.093)  |
| **decision-gate-v1**     | **pass**             | **pass**              |

Paired bootstrap v4 − v3 (2,000 resamples): ΔAUC **+0.050 [0.032, 0.069]**,
ΔBrier −0.0045 [−0.0059, −0.0030].

**Promotion.** The existing rule is: paired ΔAUC CI lower > 0, the candidate
passes the gate, and no new-feature leakage alarm. v4 meets all three, so **v4
is champion**. v3 stays servable with `?version=3.0.0-logreg`.

A strong naive reference, found after the fact: a constant score with the
pre-registered `nct_id` tie-break reviews the oldest-registered holdout trials
first, and it gets lift@10% 3.40 [2.86, 4.03]. That beats v3 and overlaps v4's
CI. Old registrations with a start date in 2024 or later are mostly long-delayed
trials, so registration age carries signal. The gate compares against random
(1.0) as pre-registered, and this reference is reported, not used to tune
anything.

### Censoring (minimum follow-up 24 months, n = 696, 70 stopped)

| Metric        | v3                   | v4                   |
| ------------- | -------------------- | -------------------- |
| ROC AUC [CI]  | 0.738 [0.675, 0.800] | 0.773 [0.706, 0.836] |
| lift@10% [CI] | 3.12 [2.11, 4.04]    | 4.26 [3.11, 5.19]    |
| Brier         | 0.0837               | 0.0799               |
| ECE           | 0.030                | 0.030                |

Paired ΔAUC +0.035 [0.004, 0.065]. The gate uses the unfiltered holdout, as
pre-registered.

### Sensitivity: holdout rows with a usable version 0 (n = 1,109)

ΔAUC +0.063 [0.043, 0.082]. Both models **fail the ECE ≤ 0.05 check on this
subset** (v3 0.058, v4 0.059). The excluded 431 rows were first registered with
a terminal status or had no version 0.

### External cohort (different condition queries, report-only)

The cohort uses 8 queries that are not in training (asthma, migraine, multiple
sclerosis, heart failure, osteoarthritis, major depressive disorder, obesity,
HIV), with training NCT ids removed: 7,258 records, of which 2,683 are labeled
(346 stopped).

| Metric            | v3                   | v4                   |
| ----------------- | -------------------- | -------------------- |
| ROC AUC [CI]      | 0.609 [0.579, 0.638] | 0.651 [0.622, 0.678] |
| lift@10% [CI]     | 1.30 [1.03, 1.72]    | 1.90 [1.50, 2.23]    |
| Brier             | 0.1112               | 0.1093               |
| ECE               | 0.021                | 0.015                |
| Gate (if applied) | pass                 | pass                 |

Paired ΔAUC +0.042 [0.023, 0.061]. For the later window (start year > 2023, n =
882), v3 has lift@10% 1.52 [0.97, 2.12] and would fail the lift check; v4 has
2.24 [1.65, 2.97]. Both models discriminate clearly worse outside the training
conditions.

### Subgroup calibration (holdout, groups with n ≥ 30)

Both models overpredict completion for early phases. For PHASE1 (n = 145) the
observed rate is 0.731 against a mean predicted 0.87 (v4 ECE 0.136). For PHASE2
(n = 117) it is 0.744 against 0.86 (ECE 0.124). PHASE3 (n = 74) has ECE 0.108.
NA/NOT_APPLICABLE and PHASE4 are within 0.03. By sponsor class, v4's ECE is
academic 0.034, industry 0.054 and other 0.054. The full tables, including the
external cohort, are in `subgroup_calibration`.

## Point-in-time features (v4)

Version history: the official API v2 has no history endpoint
(`/api/v2/studies/{nct}/history` returns 404). The website endpoint
`/api/int/studies/{nct}/history` returns 403 without a session cookie and 200
JSON once the client holds the `ncbi_sid` cookie that any v2 request sets.
11,562 of 11,562 version-0 requests returned 200 (2026-11-16, 07:30–07:57 UTC).

- **Version 0 (as first registered):** `v0_enrollment_log10`,
  `v0_site_count_log1p`, `v0_not_yet_recruiting`, `v0_planned_duration_months`,
  `v0_registration_lead_months`. A missing or terminal version 0 is imputed with
  training-fit medians.
- **Sponsor track record:** prior trials of the same lead sponsor whose outcome
  was public (`LastUpdatePostDate`) strictly before
  `min(StartDate, StudyFirstSubmitDate)`. Uses `log1p(n)`, a smoothed stop rate
  (α = 5, p0 = 0.127) and a has-prior flag.
- **Excluded:** amendment count, start slips and status changes over the full
  history. All three are post-outcome. On the holdout the full-history amendment
  count alone scores AUC 0.694 (inverted), shown as a leakage demo only.

Leakage audit: the pre-registered alarm is a single-feature holdout AUC

> 0.75 in either direction. No feature triggered it. The highest were
> `v0_registration_lead_months` at 0.732 and `v0_planned_duration_months` at
> 0.703 (both inverted). On the training-fit rows the same features score 0.573
> and 0.583. The jump on the right-censored holdout is the main caveat for v4.
> The 24-month follow-up subset still favors v4 (ΔAUC CI lower 0.004), but by
> less. Unit tests in `ml/clinical_trials/tests/test_completion_decision.py`
> check each feature for leakage, for example that future outcomes, outcome
> fields and current-record fields never change a row.

## Serving and explanations

`POST /v1/models/completion/predict` now returns:

- `risk_stopped`
- `rank_bucket` (`top_5pct` / `top_10pct` / `top_20pct` / `below_top_20pct`,
  from each version's holdout cut points)
- `model_flags_for_review` (top 10%)
- `export_gate_version`
- `top_features`: the five largest logit contributions, coefficient ×
  transformed value, before calibration. Platt scaling is monotone, so the sign
  and the ranking carry over to the probability.
- `point_in_time` (v4 audit: anchor date, sponsor counts, whether registration
  fields were imputed)

Optional request fields:

- `nct_id`
- `reviewer_decision` (`review` | `no_review`). It is logged, and the response
  sets `reviewer_override` when it disagrees with the model flag.
- the v4 inputs `start_date`, `first_submit_date`, `registered_status`
  (non-terminal only), `registered_enrollment`, `registered_site_count`,
  `registered_start_date`, `registered_completion_date`

Unknown or leaky fields still return 422. That includes `status`, `enrollment`,
`has_results`, `why_stopped`, any precomputed `sponsor_prior_*` or `v0_*` value,
and a terminal `registered_status`.

The sponsor index served with v4
(`model_registry/completion/4.0.0-logreg-pit/sponsor_history.json`, 8,904 dated
outcomes) is SHA-256-checked at load. The API's `completion_pit_features.py` is
a byte-identical copy of the training-side module. `parity_fixtures_v4.json` (12
holdout trials) pins the API rows and probabilities to the training side within
1e-9.

## Shadow mode

- **Log:**
  [`ml/clinical_trials/shadow/completion_predictions.jsonl`](../ml/clinical_trials/shadow/completion_predictions.jsonl),
  committed and append-only. Each line holds `nct_id`, `predicted_at`,
  `model_version`, `artifact_sha256`, `probability_completed`, `risk_stopped`,
  `rank_bucket`, `model_flags_for_review`, `reviewer_decision`,
  `reviewer_override`, and `prev_sha256`/`record_sha256` (a hash chain, so
  rewrites are detectable). API predictions go to the gitignored
  `services/python-api/var/completion_shadow_log.jsonl`. Set
  `COMPLETION_SHADOW_LOG=off` to disable it.
- **Seed:** `npm run ml:ct:shadow:predict -- --since-days 30` scored 385 trials
  first posted in the 30 days before 2026-11-16 (NOT_YET_RECRUITING or
  RECRUITING) with both versions, 770 records. v4 put 48 of 385 (12.5%) in
  `top_5pct`, against 5% on the holdout. Treat that shift as a drift signal. The
  current record stands in for version 0 for these new registrations.
- **Scoring:** `npm run ml:ct:shadow:score` verifies the chain, fetches current
  statuses from CT.gov API v2, scores the first prediction per (nct_id,
  version), and writes
  `ml/clinical_trials/output/shadow/completion-shadow-score.json`. Exit codes: 0
  ok, 1 tampered log, 2 fetch failed. On 2026-11-16, 0 of 385 were resolved, so
  no metrics yet. Each class needs at least 20 resolved trials.
- **Workflow:** `.github/workflows/completion-shadow-score.yml` runs weekly and
  on `workflow_dispatch`. It has `permissions: contents: read`, uses no secrets,
  runs the decision unit tests and the scorer, and uploads the report as an
  artifact. It never writes to the repo.

## Limitations

- The sponsor index is frozen at the training snapshot (2026-11-16T02:54Z).
  Later outcomes are not counted until the index is rebuilt.
- Weekly PSI drift monitors the shared v3 design features and the v3 score
  (`drift_monitor_version`). The drift job does not yet rebuild v4's version-0
  inputs.
- The external cohort is other condition queries from the same registry, not an
  independent source. Discrimination drops there (v4 AUC 0.651).
- Early-phase calibration is off by about 0.12–0.14 on the holdout.

## Commands

```sh
npm run ml:ct:decision:fetch   # supplement dates, external cohort, version-0 history (gitignored data/)
npm run ml:ct:decision         # evaluate v3 vs v4, write decision_evaluation.json, update the registry
npm run ml:ct:shadow:predict   # append predictions for new registrations to the shadow log
npm run ml:ct:shadow:score     # join realized outcomes and score the log
```
