# Lacuna clinical trials ML (Tier 1)

Offline training for ClinicalTrials.gov — separate from M&A models. The models
served by the Next.js app remain small scikit-learn models. TensorFlow is an
optional **offline benchmark** only and is not bundled into the product.

## Models

| Model                                  | Task                                                                         | Status                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **wh-relevance-v1**                    | Women's health trial relevance (title + condition + interventions + sponsor) | Shipped (scores withheld in UI while `trainingSource` is `synthetic_seed`)            |
| **completion-proxy-v2**                | COMPLETED vs stopped early — operational status, not endpoint success        | Artifact committed; new trains must pass the conjunction export gate before overwrite |
| **completion-tensorflow-benchmark-v1** | Same completion-proxy task, nonlinear TensorFlow comparator                  | Offline benchmark only; never exported to the Next.js runtime                         |

Inference runs in the **Next.js app** via exported JSON artifacts in
`src/data/ml/clinical-trials/` (TF-IDF + logistic — no Python or TensorFlow at
runtime).

## Train (no API key)

ClinicalTrials.gov API v2 is public. Lacuna uses a descriptive User-Agent.

```bash
npm run ml:ct:seed    # offline synthetic seed (CI fallback)
npm run ml:ct:train   # fetch CT.gov → train → write shipped sklearn artifacts
```

Requirements: Python 3.11+.

```bash
pip install -r ml/clinical_trials/requirements.txt
```

If CT.gov blocks automated fetch (403), the shipped sklearn pipeline can fall
back to `ml/clinical_trials/data/training_seed.json`. **Re-run locally** for
live-data artifacts before citing metrics.

### TensorFlow benchmark

The TensorFlow path is a governed champion/challenger benchmark. It compares a
small neural network with the existing hybrid logistic baseline on the **same
held-out cohort**. The benchmark requires a frozen CT.gov snapshot by default,
uses predeclared TensorFlow seeds, and refuses synthetic benchmark metrics.

```bash
pip install -r ml/clinical_trials/requirements.txt
pip install -r ml/clinical_trials/requirements-tensorflow.txt

npm run ml:ct:ingest   # writes cached_training.json + provenance sidecar
npm run ml:ct:train:tensorflow
```

Outputs are written under
`ml/clinical_trials/output/tensorflow-completion-benchmark-v1/` and are
gitignored. The directory contains `metrics.json`, `split.json`,
`run-manifest.json`, and, unless disabled with `--no-save-model`, the
canonical-seed Keras model.

Promotion is intentionally manual: the benchmark does **not** overwrite
`completion-proxy-v2.json`, alter the public model card, or create a browser
TensorFlow dependency. Paired bootstrap intervals, calibration diagnostics, seed
robustness, snapshot hashes, and explicit production blockers are emitted for
model-risk review.

## Layout

```
ml/clinical_trials/
  lacuna_ct/                         # fetch, classical train/export, TF benchmark
  scripts/train_all.py
  scripts/train_tensorflow.py
  requirements.txt
  requirements-tensorflow.txt
  data/training_seed.json
  output/                            # local benchmark artifacts; gitignored
src/lib/ml/clinicalTrials/            # TypeScript inference
src/data/ml/clinical-trials/          # committed sklearn artifacts + model card
docs/ML_CLINICAL_TRIALS.md
```

## Honest limits

- The completion task is an **operational status proxy**, not endpoint efficacy.
- TensorFlow does not turn the task into an FDA approval or clinical-success
  predictor.
- The TensorFlow benchmark is not an M&A model and does not use
  `dataset.verified.json`.
- Benchmarking requires real/cached CT.gov labels; synthetic seed is for
  pipeline CI only.
- Current CT.gov rows are not historical field snapshots. Enrollment and other
  registry fields can therefore lack point-in-time provenance for a prospective
  prediction claim.
- Does not replace Evidence Maturity scores (`evidenceMaturityCalculator.ts`).

See [docs/ML_CLINICAL_TRIALS.md](../../docs/ML_CLINICAL_TRIALS.md) and
[docs/ML_BENCHMARK_GOVERNANCE.md](../../docs/ML_BENCHMARK_GOVERNANCE.md).
