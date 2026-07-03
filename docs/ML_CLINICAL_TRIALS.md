# Clinical trials ML (Tier 1)

Lacuna trains **small classical models** on ClinicalTrials.gov text — not neural networks in the browser, and not M&A deal predictors.

## What ships

### Women's health trial relevance (`wh-relevance-v1`)

- **Input:** trial title, condition, interventions, sponsor (same fields as `ClinicalTrialTracker`)
- **Model:** TF-IDF (1–2 grams) + logistic regression
- **Output:** probability + boolean WH-relevant label
- **UI:** WH badge on each trial card in Research → Clinical Trials

### Termination risk (experimental)

Trained in the same pipeline but **only exported** when hold-out ROC-AUC ≥ 0.55. Not shown in UI until it passes that gate on live CT.gov data.

## Training

```bash
npm run ml:ct:seed   # regenerate synthetic fallback seed
npm run ml:ct:train  # preferred: live ClinicalTrials.gov fetch
npm test -- __tests__/lib/ml/clinicalTrials/inference.test.ts
```

Python deps: `ml/clinical_trials/requirements.txt`

**No LLM API key.** CT.gov is public REST. Optional: run from a network that allows CT.gov (some CI environments return 403).

## Artifacts

| File | Purpose |
|------|---------|
| `src/data/ml/clinical-trials/wh-relevance-v1.json` | Exported weights + vocabulary |
| `src/data/ml/clinical-trials/model-card.json` | Metrics, training source, version |

Commit artifacts after retraining. Bump `model-card.json` `version` when metrics change materially.

## Inference

```typescript
import { scoreWhTrialRelevance } from "@/lib/ml/clinicalTrials/scoreClinicalTrial";

const score = scoreWhTrialRelevance({
  title: trial.title,
  condition: trial.condition,
  sponsor: trial.sponsor,
  interventions: trial.interventions,
});
// score.probability, score.label
```

## Relationship to other "models"

| Component | Type |
|-----------|------|
| Evidence Maturity Dashboard | Rule-based (`evidenceMaturityCalculator.ts`) |
| Exit Predictor | Hand-set weights on verified deals |
| AI Insights panel | External LLM (optional) |
| **Clinical trials ML** | **Offline-trained sklearn → JSON → TS inference** |
| Quarantined `ensemblePredictor.ts` | Untrained TF.js stub — superseded by this pipeline |

## Citation guidance

> Clinical trial relevance scores use TF-IDF + logistic regression trained on ClinicalTrials.gov excerpts (Lacuna `wh-relevance-v1`). Descriptive tagging only — not clinical advice or trial success prediction.

## Next steps (not built)

- Phase transition modeling with outcome labels from CT.gov results
- Sponsor ↔ Lacuna company entity linking
- ONNX export if artifact size grows
