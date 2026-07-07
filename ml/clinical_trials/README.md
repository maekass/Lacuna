# Lacuna clinical trials ML (Tier 1)

Offline **scikit-learn** training for ClinicalTrials.gov — separate from M&A
models.

## Models

| Model                   | Task                                                                         | Status                                                    |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| **wh-relevance-v1**     | Women's health trial relevance (title + condition + interventions + sponsor) | Shipped                                                   |
| **termination-risk-v1** | Terminated/withdrawn vs active/completed proxy                               | Experimental — only exported when hold-out ROC-AUC ≥ 0.55 |

Inference runs in the **Next.js app** via exported JSON artifacts in
`src/data/ml/clinical-trials/` (TF-IDF + logistic — no Python at runtime).

## Train (no API key)

ClinicalTrials.gov API v2 is public. Lacuna uses a descriptive User-Agent.

```bash
npm run ml:ct:seed    # offline synthetic seed (CI fallback)
npm run ml:ct:train   # fetch CT.gov → train → write artifacts
```

Requirements: Python 3.11+, `pip install -r ml/clinical_trials/requirements.txt`

If CT.gov blocks automated fetch (403), training falls back to
`ml/clinical_trials/data/training_seed.json`. **Re-run locally** for live-data
artifacts before citing metrics.

## Layout

```
ml/clinical_trials/
  lacuna_ct/           # fetch, train, export
  scripts/train_all.py
  data/training_seed.json
src/lib/ml/clinicalTrials/   # TypeScript inference
src/data/ml/clinical-trials/ # committed artifacts + model-card.json
docs/ML_CLINICAL_TRIALS.md
```

## Honest limits

- Not a clinical outcome predictor — WH **relevance tagging** only
- Termination model needs real CT.gov labels; synthetic seed is for pipeline CI
- Does not replace Evidence Maturity scores (`evidenceMaturityCalculator.ts`)

See [docs/ML_CLINICAL_TRIALS.md](../docs/ML_CLINICAL_TRIALS.md).
