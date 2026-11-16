# Model card — `completion-proxy-v3`

Generated from `evaluation.json` and `manifest.json` in this directory. Every
number below is measured on the frozen snapshot listed under Data; none are
estimates.

## Task

Probability that a ClinicalTrials.gov record ends as `COMPLETED` (1) rather than
`TERMINATED`, `WITHDRAWN`, or `SUSPENDED` (0). **This is an operational-status
proxy. It does not predict efficacy, endpoint success, regulatory approval, or
investment value.** Trials that are still running are not labeled and are not
part of training or evaluation.

## Served version

| Field         | Value                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| Champion      | `3.0.0-logreg` — TF-IDF + numeric logistic regression, Platt-calibrated |
| Not served    | `3.0.0-hgb` — HistGradientBoosting on TF-IDF→SVD(100) + numeric, Platt  |
| Artifact hash | `artifact_sha256` in `manifest.json` (checked before every load)        |
| Runtime       | scikit-learn 1.9.x (loader refuses a different minor version)           |
| API           | `GET /v1/models/completion`, `POST /v1/models/completion/predict`       |
| Export gate   | **Fails** (accuracy at 0.50 equals the majority-class rate; see below)  |

## Data

- Source: ClinicalTrials.gov API v2, `npm run ml:ct:ingest -- --max-pages 10`
  (23 condition queries × up to 10 pages × 100 studies), pulled
  2026-11-16T02:54Z.
- Snapshot: 18,923 trials; `snapshot_file_sha256`
  `2f6a310097e96f32f21323b74834d79c4c5d0628c49ab62ddf9eb31c164433a9`;
  `canonical_record_sha256`
  `ad2da67d8fd285cbac32006d802f2b9353b118fa91334d3dd734cf20693c62f9`.
- Labeled rows with a start year: 8,879 (25 labeled rows without a start year
  dropped).
- The raw snapshot is gitignored; `split.json` lists every NCT id per split.

## Split (pre-declared)

The repository's existing temporal rule (`train.py`, `tensorflow_benchmark.py`):
cutoff = start year at the 75th percentile of labeled rows → **2023**.

| Cohort      | Rule                         | N     | Completed / stopped |
| ----------- | ---------------------------- | ----- | ------------------- |
| Fit         | start ≤ 2023, 80% stratified | 5,871 | —                   |
| Calibration | start ≤ 2023, 20% stratified | 1,468 | —                   |
| Test        | start 2024–2028 (untouched)  | 1,540 | 1,346 / 194         |

Train + calibration class counts: 6,405 completed / 934 stopped. Split hash
`690b5d0ba045a511ba56ba258c685e3f56cb24d264c2758da5045a8281cdbf10`. No NCT id
overlap; 59.2% of test rows have a lead sponsor also seen in training.

## Holdout results (n = 1,540)

95% intervals are nonparametric bootstrap (2,000 resamples). ECE uses 10
equal-width bins.

| Model                          | ROC AUC [95% CI]     | PR AUC | Brier [95% CI]       | Log loss [95% CI]    | ECE   | Accuracy@0.5 |
| ------------------------------ | -------------------- | ------ | -------------------- | -------------------- | ----- | ------------ |
| **Logistic, Platt (champion)** | 0.711 [0.670, 0.752] | 0.934  | 0.102 [0.090, 0.114] | 0.347 [0.315, 0.380] | 0.031 | 0.874        |
| HistGB, Platt (challenger)     | 0.656 [0.614, 0.698] | 0.921  | 0.105 [0.094, 0.117] | 0.360 [0.329, 0.392] | 0.015 | 0.874        |
| Base rate (train p = 0.873)    | 0.500                | —      | 0.110                | 0.379                | 0.001 | 0.874        |
| Majority class (always 1)      | 0.500                | —      | 0.126                | 2.030                | —     | 0.874        |

Paired bootstrap, challenger − baseline (same 1,540 rows):

| Delta    | Point  | 95% CI           | Favors   |
| -------- | ------ | ---------------- | -------- |
| ROC AUC  | −0.055 | [−0.093, −0.018] | baseline |
| PR AUC   | −0.013 | [−0.028, 0.001]  | neither  |
| Brier    | +0.003 | [+0.002, +0.005] | baseline |
| Log loss | +0.013 | [+0.006, +0.020] | baseline |

Paired bootstrap, champion − base-rate predictor: Brier −0.008 [−0.010, −0.006],
log loss −0.031 [−0.041, −0.022].

Reliability diagram: [`reliability.png`](./reliability.png). For the champion,
1,529 of 1,540 test predictions fall between 0.7 and 1.0; the 0.5–0.7 bins hold
only 11 trials, so their observed rates are noisy.

## Promotion decision

Rule: the challenger becomes champion only if the paired ROC AUC delta CI lower
bound is above 0 **and** it passes the conjunction export gate. Neither held
(ΔAUC CI [−0.093, −0.018]; gate failed), so **the calibrated logistic baseline
stays champion**. The challenger artifact is kept out of the served registry.

Export gate (`train.passes_export_gate`, unchanged): AUC CI lower > 0.55
(champion 0.670 ✔), Brier < base-rate Brier (0.102 < 0.110 ✔), accuracy >
majority-class accuracy (0.874 = 0.874 ✘). Calibrated probabilities on this
cohort almost never fall below 0.50, so thresholded accuracy cannot exceed the
87.4% majority rate. The gate was not altered. The API serves the champion but
returns `export_gate_passed: false` with every prediction, and the Next.js UI
keeps withholding completion percentages.

## Label-leakage audit

| Field                         | Finding                                                                                                                                                | Action   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `enrollment`                  | 99.4% of WITHDRAWN rows have enrollment 0; median 28 for TERMINATED vs 94 for COMPLETED (actual, post-hoc). Enrollment alone scores holdout AUC 0.877. | Excluded |
| `has_results`                 | Post-outcome. Constant `False` in this snapshot because the ingest field filter omits `resultsSection`.                                                | Excluded |
| `status`                      | Is the label.                                                                                                                                          | Excluded |
| completion dates, why-stopped | Updated or populated at closure; not ingested.                                                                                                         | Excluded |
| `start_year`                  | Split key; excluded to avoid calendar extrapolation.                                                                                                   | Excluded |
| `source_query` / `label_wh`   | Cohort-assembly artifacts, unavailable for arbitrary trials.                                                                                           | Excluded |
| Status words in text          | e.g. "terminat" appears in 16 completed / 2 stopped rows; not concentrated in stopped trials.                                                          | Kept     |

Effect: the v2 recipe (text + phase + `enrollment_log10`, uncalibrated) scores
holdout AUC **0.913** [0.885, 0.939] on the same split. Most of that comes from
the leaky enrollment field, which is why v3 drops it. The committed browser
artifact `src/data/ml/clinical-trials/completion-proxy-v2.json` still contains
enrollment and `has_results_flag` coefficients; its scores stay withheld in the
UI.

## Drift monitoring

`ml/clinical_trials/scripts/check_completion_drift.py` (weekly workflow
`.github/workflows/completion-drift.yml`) computes PSI for each numeric feature
and for the champion's score, comparing ClinicalTrials.gov trials updated in the
last 30 days against `3.0.0-logreg/drift_reference.json` (all 18,923 snapshot
rows). PSI < 0.10 is stable, 0.10–0.20 is a warning, and anything

> 0.20 fails the job. First live run (2026-11-16, 1,713 trials): every PSI ≤
> 0.077, status stable.

## Limits

- Current registry snapshot, not point-in-time features.
- Condition-query cohort, not a population sampling frame.
- The holdout is right-censored: trials that started in 2024 or later only get a
  label if they have already finished or stopped. That favors short trials and
  early withdrawals, so holdout metrics may not carry over to mature cohorts.
- 4 test rows have start years in 2027–2028 (3 WITHDRAWN, 1 SUSPENDED); these
  are anticipated start dates for trials that never started.
- No external validation cohort.

## Résumé-ready result

Calibrated logistic champion ROC AUC 0.711 [95% CI 0.670–0.752] vs
HistGradientBoosting challenger 0.656 [0.614–0.698] (paired ΔAUC −0.055 [−0.093,
−0.018]) on a 1,540-trial temporal holdout (start years 2024–2028, trained on ≤
2023), with Brier 0.102 vs 0.110 for the base rate. The leakage audit removed
post-outcome enrollment, which had inflated apparent AUC to 0.913.
