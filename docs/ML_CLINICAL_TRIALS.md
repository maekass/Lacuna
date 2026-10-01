# Clinical trials ML (Tier 1 + v2)

Lacuna trains small models on ClinicalTrials.gov text and structured fields. The
product-serving path remains classical and auditable: **no neural network runs
in the browser**, and none of these models are M&A deal predictors.

TensorFlow is available as an **offline benchmark** for the completion-proxy
task. It exists to test whether a nonlinear model adds measurable held-out value
over the simpler logistic baseline, not to add an AI label to the stack.

## What ships

### Women's health trial relevance (`wh-relevance-v1`)

- **Input:** trial title, condition, interventions, sponsor
- **Model:** TF-IDF (1–2 grams) + logistic regression
- **Output:** probability + boolean WH-relevant label
- **UI:** WH % badge on each trial card in Research → Clinical Trials

### Completion proxy (`completion-proxy-v2`)

- **Label:** `COMPLETED` vs stopped early (`TERMINATED`, `WITHDRAWN`,
  `SUSPENDED`) — operational status, **not** primary-endpoint success
- **Features (new trains):** text + `phase_num` + `enrollment_log10`. The
  committed `completion-proxy-v2` artifact still serves four numeric features
  (`intervention_count`, `has_results_flag` included) via name mapping.
- **Model:** hybrid TF-IDF + numeric logistic regression
- **Export gate (conjunction):** bootstrap 95% AUC CI lower bound > 0.55 **and**
  accuracy > majority-class baseline **and** Brier < base-rate Brier. The
  committed seed artifact fails the conjunction (accuracy 0.568 ≤ majority
  0.614) — it was exported under the former AUC-only gate. UI still withholds
  percentages while `publishMetrics` is false or `trainingSource` is
  `synthetic_seed`.
- **UI:** Complete % badge only when scores are released; metrics panel on
  Research page

## Offline TensorFlow benchmark

`completion-tensorflow-benchmark-v1` is an offline challenger for the same
completion-status task. It never runs in the browser and never overwrites the
serving artifact.

The institutional benchmark now enforces:

1. a frozen CT.gov snapshot by default, with no silent refresh or synthetic
   fallback;
2. a start-year temporal test holdout when the cohort supports it;
3. a separate development/validation split used only for epoch selection;
4. a full-train refit after epoch selection, before the untouched test is
   scored;
5. predeclared TensorFlow seeds (17, 42, 89), with no best-seed cherry-picking;
6. paired bootstrap 95% intervals for ROC AUC, PR AUC, Brier, and log-loss
   deltas versus logistic regression;
7. reliability bins and expected calibration error in addition to Brier and log
   loss;
8. snapshot, split, Git, environment, metrics, and model hashes; and
9. an explicit advancement gate that can only nominate a run for model-risk
   review. It never authorizes production.

The benchmark also records known production blockers. Current CT.gov data are a
current registry snapshot rather than a historical reconstruction of every
feature, the condition-query cohort is not a population sampling frame, and
there is no external validation cohort.

See [ML_BENCHMARK_GOVERNANCE.md](./ML_BENCHMARK_GOVERNANCE.md).

## Training

```bash
pip install -r ml/clinical_trials/requirements.txt

npm run ml:ct:seed     # ~1200 synthetic records (CI / offline fallback)
npm run ml:ct:ingest   # bulk CT.gov fetch → ml/clinical_trials/data/cached_training.json
npm run ml:ct:train    # train WH + completion; writes shipped JSON artifacts
npm run ml:ct:corpus   # JSONL for future LLM fine-tuning (does not train an LLM)

npm test -- __tests__/lib/ml/clinicalTrials/inference.test.ts
npm run ml:ct:test
```

**No LLM API key.** CT.gov is public REST. Set a descriptive `User-Agent` in
fetch scripts. Some CI/sandbox environments return 403 — classical training can
fall back to `cached_training.json` or `training_seed.json`.

Retrain on a machine with CT.gov access for honest hold-out metrics:

```bash
npm run ml:ct:ingest -- --max-pages 10
npm run ml:ct:train
```

Run the optional TensorFlow comparison from the same Python environment:

```bash
pip install -r ml/clinical_trials/requirements-tensorflow.txt
npm run ml:ct:train:tensorflow
```

The benchmark writes only to
`ml/clinical_trials/output/tensorflow-completion-benchmark-v1/`, which is
gitignored. Use `npm run ml:ct:train:tensorflow -- --no-save-model` to write
metrics without the Keras model.

## Artifacts

| File                                                                       | Purpose                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/data/ml/clinical-trials/wh-relevance-v1.json`                         | WH relevance weights + vocabulary                      |
| `src/data/ml/clinical-trials/completion-proxy-v2.json`                     | Completion proxy (when gate passes)                    |
| `src/data/ml/clinical-trials/model-card.json`                              | Metrics, training source, version, export-gate honesty |
| `__tests__/lib/ml/clinicalTrials/parityFixtures.json`                      | sklearn vs TS probabilities                            |
| `ml/clinical_trials/data/training_seed.json`                               | Synthetic fallback (committed)                         |
| `ml/clinical_trials/data/cached_training.json`                             | Live ingest cache (gitignored)                         |
| `ml/clinical_trials/data/llm_corpus.jsonl`                                 | LLM training export (gitignored)                       |
| `ml/clinical_trials/output/.../metrics.json`                               | Governed holdout comparison + advancement gate         |
| `ml/clinical_trials/output/.../split.json`                                 | Exact public NCT split allocations + split hash        |
| `ml/clinical_trials/output/.../run-manifest.json`                          | Git/runtime/data/artifact provenance                   |
| `ml/clinical_trials/output/.../completion-tensorflow-benchmark-v1-*.keras` | Canonical-seed Keras model; not shipped                |

Commit `src/data/ml/clinical-trials/*` only when retraining the existing serving
models. TensorFlow benchmark artifacts are intentionally not committed or
served.

## Inference

```typescript
import { scoreClinicalTrial } from "@/lib/ml/clinicalTrials/scoreClinicalTrial";

const scores = scoreClinicalTrial({
  title: trial.title,
  condition: trial.condition,
  sponsor: trial.sponsor,
  interventions: trial.interventions,
  phase: trial.phase,
  status: trial.status,
  enrollment: trial.enrollment,
  hasResults: trial.hasResults,
});
// scores.whRelevance.probability, scores.completionProxy?.probability
```

## Relationship to other "models"

| Component                           | Type                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Evidence Maturity Dashboard         | Rule-based (`evidenceMaturityCalculator.ts`)                                   |
| Exit Similarity Explorer            | Hand-set weights on verified deals                                             |
| AI Insights panel                   | External LLM (optional)                                                        |
| **Clinical trials serving ML**      | **Offline sklearn → JSON → TS inference**                                      |
| **TensorFlow completion benchmark** | **Offline Python/Keras comparator; no runtime serving**                        |
| Therapeutics `ClinicalTrial`        | Registry normalization. Not this classifier and not an endpoint-success score. |
| `export_llm_corpus.py`              | Data prep only — not an LLM                                                    |
| Removed TF.js `ensemblePredictor`   | Untrained browser stub — remains removed                                       |

## Citation guidance

For shipped scores:

> Clinical trial scores use TF-IDF + logistic regression trained on
> ClinicalTrials.gov excerpts (Lacuna `wh-relevance-v1`, optional
> `completion-proxy-v2`). Descriptive tagging only — not clinical advice,
> efficacy prediction, or approval forecasting.

For a local TensorFlow run, cite the generated `metrics.json` with its
`training_source`, cohort sizes, split policy, and both model metric blocks. Do
not cite TensorFlow benchmark performance from synthetic seed data; the runner
refuses that path by design.

## Roadmap

- AACT PostgreSQL bulk ingest (`ml/clinical_trials/data/aact/README.md`)
- Phase transition modeling with results-section outcome labels
- Sponsor ↔ Lacuna company entity linking
- Decide whether any TensorFlow result merits a reproducible promotion gate;
  default is to keep the simpler logistic model
- ONNX export if artifact size grows
- Actual LLM fine-tuning on `llm_corpus.jsonl`
