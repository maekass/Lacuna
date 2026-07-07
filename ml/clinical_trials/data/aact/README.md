# AACT bulk ingest (Tier 2)

[AACT](https://aact.ctti-clinicaltrials.org/) provides a full ClinicalTrials.gov
PostgreSQL dump — best for training at scale.

## Quick start

```bash
# Register free at https://aact.ctti-clinicaltrials.org/
export AACT_USERNAME=you@example.edu
export AACT_PASSWORD=your-password

npm run download:aact
# Or schema/docs only:
npm run download:aact -- --pipe-only
```

Place downloaded files here (gitignored). Then load into local Postgres:

```bash
docker compose up -d
npm run db:migrate
# pg_restore per CTTI docs — filename varies by snapshot date
```

Retrain ML models after loading:

```bash
npm run ml:ct:train
```

## Live API fallback (Tier 1)

When AACT is unavailable, use live REST ingest:

```bash
npm run ml:ct:ingest -- --max-pages 20
npm run ml:ct:train
```

## Labels (completion proxy)

| Label                 | Definition                             |
| --------------------- | -------------------------------------- |
| `label_completed = 1` | `overallStatus = COMPLETED`            |
| `label_completed = 0` | `TERMINATED`, `WITHDRAWN`, `SUSPENDED` |
| `null`                | Still recruiting / unknown             |

Operational status only — not primary-endpoint success.
