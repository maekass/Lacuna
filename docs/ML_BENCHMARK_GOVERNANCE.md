# Clinical trials ML benchmark governance

## Purpose

This document governs the optional TensorFlow challenger in
`ml/clinical_trials/`. The benchmark exists to answer one narrow question: does
a small neural network add repeatable held-out value over the simpler logistic
completion proxy?

It does **not** authorize a production model, a clinical claim, an approval
forecast, an M&A forecast, or an investment decision.

## Model roles

- **Champion:** hybrid TF-IDF + numeric logistic regression.
- **Challenger:** `completion-tensorflow-benchmark-v1`.
- **Outcome:** ClinicalTrials.gov operational status, `COMPLETED` versus stopped
  early. This is not efficacy or endpoint success.
- **Serving:** TensorFlow remains offline. No TensorFlow or TF.js dependency is
  added to the Next.js runtime.

## Data controls

The benchmark must run on an explicit frozen
`ml/clinical_trials/data/cached_training.json` snapshot or a user-supplied
snapshot. It does not silently fetch new data and does not fall back to the
synthetic seed. The cache must also have a matching provenance sidecar attesting
that it was produced from the ClinicalTrials.gov API; hash mismatch or a
synthetic source fails closed.

Every run records:

- a SHA-256 hash of the model-relevant registry rows;
- a SHA-256 hash of the exact train/development/validation/test split;
- the public NCT identifiers assigned to each split;
- class balance, start-year ranges, and train/test sponsor overlap;
- the Git commit and resolved scientific-Python package versions.

Duplicate NCT identifiers fail the run.

### Known data limitations

The current cache is a **current registry snapshot**, not a versioned
point-in-time reconstruction of every trial field. In particular, enrollment can
reflect information updated after trial initiation. The condition-query assembly
is also not a population sampling frame. These remain explicit production
blockers even if the challenger wins statistically.

## Split discipline

The preferred test design is a start-year temporal holdout:

- training rows have `start_year <= cutoff`;
- test rows have `start_year > cutoff`;
- the test cohort is never used for preprocessing, epoch selection, or model
  fitting.

If the data cannot support that design, the code uses a stratified random
fallback only to keep the research harness executable. A random fallback is
automatically ineligible for model-risk advancement.

Inside the training cohort, a fixed stratified development/validation split is
used to select the TensorFlow epoch count. The challenger is then rebuilt from
scratch and refit on the full pre-test training cohort for the selected number
of epochs before the test cohort is scored.

## Reproducibility

The default TensorFlow seeds are fixed in advance: 17, 42, and 89. Seed 42 is
the canonical saved artifact when model saving is enabled. The code does not
select the best-performing seed.

TensorFlow random seeds are set explicitly and deterministic operations are
requested where the installed backend supports them. The run manifest records
the runtime versions and platform because exact bitwise reproducibility can
still depend on hardware and TensorFlow kernels.

TensorFlow guidance:

- https://www.tensorflow.org/api_docs/python/tf/keras/utils/set_random_seed
- https://www.tensorflow.org/api_docs/python/tf/config/experimental/enable_op_determinism

## Evaluation

The baseline and canonical TensorFlow challenger are evaluated on the **same**
untouched test rows.

Reported metrics include:

- ROC AUC and PR AUC for discrimination;
- Brier score and log loss as proper probability scoring rules;
- expected calibration error and reliability bins;
- accuracy, precision, recall, and F1 at the disclosed 0.50 threshold;
- mean, sample standard deviation, minimum, and maximum across declared
  TensorFlow seeds.

Brier score alone is not treated as a complete calibration diagnostic. The
benchmark therefore reports separate reliability information as well.

Reference:

- https://scikit-learn.org/stable/modules/calibration.html

## Paired uncertainty

The primary architecture comparison uses a paired nonparametric bootstrap on the
same test observations. It reports 95% intervals for:

- TensorFlow minus logistic ROC AUC;
- TensorFlow minus logistic PR AUC;
- TensorFlow minus logistic Brier score;
- TensorFlow minus logistic log loss.

Positive deltas favor TensorFlow for ROC AUC and PR AUC. Negative deltas favor
TensorFlow for Brier score and log loss.

## Advancement gate

A run is only a **candidate for formal model-risk review** when all of the
following are true:

1. the snapshot is non-synthetic;
2. the primary test is a temporal holdout;
3. no NCT identifier appears in both train and test;
4. each test class contains at least 20 observations;
5. the 95% paired interval for ROC AUC improvement is above zero;
6. the 95% paired intervals for Brier and log-loss deltas are below zero; and
7. every predeclared TensorFlow seed improves both ROC AUC and Brier score
   versus the logistic baseline.

Passing this gate does **not** authorize production serving. The emitted
`production_authorized` field remains `false`.

Before any production claim, separate work would still be required for
point-in-time feature reconstruction, a defensible population frame, external
validation, monitoring, and an explicit use-case review.

## Run artifacts

A governed run writes only to the gitignored benchmark output directory:

- `metrics.json` — baseline, seed runs, calibration, bootstrap comparison, and
  advancement gate;
- `split.json` — exact NCT allocations and split hash;
- `run-manifest.json` — Git SHA, runtime versions, data/split hashes, and
  artifact hashes;
- `.keras` — canonical-seed challenger artifact, when requested.

The run manifest hashes the metrics and saved model so a reviewer can verify
that an artifact has not changed after evaluation.

## Completion-proxy v3 promotion

`completion-proxy-v3` uses a separate, simpler rule for the sklearn challenger
(HistGradientBoosting) in `lacuna_ct/completion_production.py`: the challenger
becomes the served champion only if the paired bootstrap 95% CI for the ROC AUC
delta is above zero **and** it passes the conjunction export gate. Otherwise the
calibrated logistic baseline stays. Both models are Platt-calibrated on a
stratified 20% slice of the training cohort; the temporal test cohort is never
used for fitting or calibration. The first run kept the baseline (ΔAUC −0.055
[−0.093, −0.018]). The production blockers listed above still apply.

## Completion decision gate (pre-registered)

For the triage use case the export gate is `decision-gate-v1`, fixed in
`ml/clinical_trials/preregistration/completion-decision-v1.json` (plus
addendum-1 for the version-0 features) and committed before any test-set
evaluation: ROC AUC CI lower > 0.55, Brier < base-rate Brier, ECE ≤ 0.05, and
lift@10% CI lower > 1.0 against random review. Accuracy vs majority is no longer
a gate check (kept as `legacy_accuracy_gate`). The same promotion rule applies
to the point-in-time candidate `4.0.0-logreg-pit`, plus a pre-registered leakage
alarm (single new feature with holdout AUC > 0.75 either way blocks promotion).
Result: v4 promoted, ΔAUC +0.050 [0.032, 0.069]. The thresholds must not be
edited after results; a new gate needs a new pre-registration file. See
[`ML_COMPLETION_DECISION.md`](ML_COMPLETION_DECISION.md).

## CI scope

Ordinary CI does **not** install or train TensorFlow. CI runs the statistical,
split, hashing, and governance-control tests without TensorFlow. Empirical
TensorFlow training remains a deliberate offline action on a frozen snapshot.
