# AACT bulk ingest (optional)

[AACT](https://aact.ctti-clinicaltrials.org/) provides a full ClinicalTrials.gov PostgreSQL dump — best for training at scale.

## Steps

1. Register at https://aact.ctti-clinicaltrials.org/ and download the flat files or use their hosted DB.
2. Place `studies.txt` (or export) under `ml/clinical_trials/data/aact/` (gitignored).
3. Run a future `ingest_aact.py` script (roadmap) or load into Lacuna Postgres via `docker compose`.

For now, use live API ingest:

```bash
npm run ml:ct:ingest -- --max-pages 10
npm run ml:ct:train
```

## Labels (completion proxy)

| Label | Definition |
|-------|------------|
| `label_completed = 1` | `overallStatus = COMPLETED` |
| `label_completed = 0` | `TERMINATED`, `WITHDRAWN`, `SUSPENDED` |
| `null` | Still recruiting / unknown |

This is an **operational** proxy, not primary-endpoint success.
