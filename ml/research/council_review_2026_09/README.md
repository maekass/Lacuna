# Council review, September 2026: reproducible checks

Supporting material for
`docs/reviews/2026-09-20-council-review-claude-fable-5.md` and
`docs/plans/evidence-to-decision-roadmap.md`.

## Contents

| File                     | Purpose                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reproduce_council.py`   | Recomputes the review's numerical examples from stated inputs: prior-correction intercept shifts, Riley et al. (2019) minimum sample sizes for the four stated scenarios, and the Hanley–McNeil AUC interval for a 12-event validation set. Ships with unit tests. |
| `verify_sources.py`      | Fetches the repository files and clinical success-rate papers cited in the roadmap and extracts the specific facts relied upon. Requires the `pplx_sdk` environment; not part of the app build.                                                                    |
| `verified_sources.jsonl` | Output of `verify_sources.py` from 2026-09-20, pinned to commit `5bddc415`.                                                                                                                                                                                        |

## Run

```bash
python3 ml/research/council_review_2026_09/reproduce_council.py
```

## What these numbers are and are not

Every output is a scenario calculation conditional on the review's stated
inputs. None is an observed performance metric, a calibrated probability, or
evidence that any Lacuna model is valid. The Riley sample sizes depend on the
assumed Cox–Snell R² and predictor count; the AUC interval assumes a
hypothetical AUC of 0.70 with 12 events and 40 non-events. See the roadmap's
"Corrections before implementing the council recommendations" section before
using any figure.

This folder is research documentation. It is not imported by `src/`,
`ml/clinical_trials/`, or `ml/lacuna_ml/`, and it must not be used to re-enable
anything under `src/lib/ml/_quarantine/`.
