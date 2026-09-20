# Acquisition-time hazard (descriptive)

Offline Cox partial-likelihood summary of **time to a verified acquisition**
among companies in `dataset.verified.json` that disclose a founded year.

This is **not** a forecast of future M&A, **not** an acquisition probability,
and **not** investment advice. Missing founded year is exclusion, not
imputation. Current `stage` is unused because acquired labels leak the event.

| Path                                          | Role                |
| --------------------------------------------- | ------------------- |
| `ml/hazard/`                                  | Python package      |
| `ml/hazard/tests/`                            | Self-check suite    |
| `scripts/run_hazard.py`                       | Phase runner        |
| `scripts/check_claim_consistency.py`          | Claim-language gate |
| `src/lib/scoring/hazard.ts`                   | Typed consumer      |
| `src/data/ml/hazard/acquisition-time-v1.json` | Committed artifact  |

See [ml/hazard/README.md](../ml/hazard/README.md).
