# Clinical trials ML (Tier 1 + v2)

Lacuna trains **small classical models** on ClinicalTrials.gov text and
structured fields — not neural networks in the browser, and not M&A deal
predictors.

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
  percentages while `trainingSource` is `synthetic_seed`.
- **UI:** Complete % badge only when scores are released; metrics panel on
  Research page

## Training

```bash
pip install -r ml/clinical_trials/requirements.txt

npm run ml:ct:seed     # ~1200 synthetic records (CI / offline fallback)
npm run ml:ct:ingest   # bulk CT.gov fetch → ml/clinical_trials/data/cached_training.json
npm run ml:ct:train    # train WH + completion; writes JSON artifacts
npm run ml:ct:corpus   # JSONL for future LLM fine-tuning (does not train an LLM)

npm test -- __tests__/lib/ml/clinicalTrials/inference.test.ts
```

**No LLM API key.** CT.gov is public REST. Set a descriptive `User-Agent` in
fetch scripts. Some CI/sandbox environments return 403 — training falls back to
`cached_training.json` or `training_seed.json`.

Retrain on a machine with CT.gov access for honest hold-out metrics:

```bash
npm run ml:ct:ingest -- --max-pages 10
npm run ml:ct:train
```

## Artifacts

| File                                                   | Purpose                                                |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `src/data/ml/clinical-trials/wh-relevance-v1.json`     | WH relevance weights + vocabulary                      |
| `src/data/ml/clinical-trials/completion-proxy-v2.json` | Completion proxy (when gate passes)                    |
| `src/data/ml/clinical-trials/model-card.json`          | Metrics, training source, version, export-gate honesty |
| `__tests__/lib/ml/clinicalTrials/parityFixtures.json`  | sklearn vs TS probabilities (`                         |
| `ml/clinical_trials/data/training_seed.json`           | Synthetic fallback (committed)                         |
| `ml/clinical_trials/data/cached_training.json`         | Live ingest cache (gitignored)                         |
| `ml/clinical_trials/data/llm_corpus.jsonl`             | LLM training export (gitignored)                       |

Commit `src/data/ml/clinical-trials/*` after retraining. Bump `model-card.json`
`version` when metrics change materially.

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

| Component                          | Type                                         |
| ---------------------------------- | -------------------------------------------- |
| Evidence Maturity Dashboard        | Rule-based (`evidenceMaturityCalculator.ts`) |
| Exit Predictor                     | Hand-set weights on verified deals           |
| AI Insights panel                  | External LLM (optional)                      |
| **Clinical trials ML**             | **Offline sklearn → JSON → TS inference**    |
| `export_llm_corpus.py`             | Data prep only — not an LLM                  |
| Quarantined `ensemblePredictor.ts` | Untrained TF.js stub — superseded            |

## Citation guidance

> Clinical trial scores use TF-IDF + logistic regression trained on
> ClinicalTrials.gov excerpts (Lacuna `wh-relevance-v1`, optional
> `completion-proxy-v2`). Descriptive tagging only — not clinical advice,
> efficacy prediction, or approval forecasting.

## Roadmap (not built)

- AACT PostgreSQL bulk ingest (`ml/clinical_trials/data/aact/README.md`)
- Phase transition modeling with results-section outcome labels
- Sponsor ↔ Lacuna company entity linking
- ONNX export if artifact size grows
- Actual LLM fine-tuning on `llm_corpus.jsonl`
