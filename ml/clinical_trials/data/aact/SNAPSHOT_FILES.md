# AACT snapshot package — what each file is

You downloaded a **CTTI AACT daily snapshot** (ClinicalTrials.gov as PostgreSQL). Typical contents:

| File | Size | What it is |
|------|------|------------|
| **`postgres.dmp`** | ~2.3 GB | **The database.** PostgreSQL custom-format dump (`pg_restore`). This is what you load and query. |
| **`data_dictionary.csv`** | ~44 KB | **Column reference** (actually Excel `.xlsx` renamed). Maps AACT table columns → descriptions. Open in Excel/Numbers. |
| **`nlm_protocol_definitions.html`** | ~92 KB | Saved ClinicalTrials.gov **website shell** (Angular SPA). Reference only — not structured schema data. |
| **`nlm_results_definitions.html`** | ~92 KB | Same — CT.gov results section UI page, not AACT SQL docs. |
| **`schema.png`** | 0 B | Empty in your download — ignore or re-download from AACT site. |

For Lacuna ML, only **`postgres.dmp`** matters for training at scale. The data dictionary helps when writing SQL against `ctgov.*` tables.

## Link your download into Lacuna

```bash
npm run ml:ct:aact:link -- /Users/maekaess/Downloads/yxlj5iw6pf7dmp2ht1pcg368mx08
```

Creates symlinks under `ml/clinical_trials/data/aact/` (gitignored).

## Load → export → train

```bash
docker compose up -d
npm run ml:ct:aact:load          # pg_restore into database `aact`
pip install psycopg2-binary      # one-time, for export script
npm run ml:ct:aact:export        # → ml/clinical_trials/data/cached_training.json
npm run ml:ct:train              # honest metrics on live CT.gov data
```

`AACT_DATABASE_URL` defaults to `postgresql://lacuna:lacuna@localhost:5432/aact`.

## Key AACT tables (from data dictionary)

| Schema | Tables used by export |
|--------|----------------------|
| `ctgov.studies` | `nct_id`, `brief_title`, `start_date`, `has_results` |
| `ctgov.conditions` | condition names (WH labeling) |
| `ctgov.sponsors` | lead sponsor |
| `ctgov.interventions` | intervention names |
| `ctgov.designs` | phase, study_type |
| `ctgov.overall_statuses` | COMPLETED / TERMINATED / … |
| `ctgov.calculated_values` | enrollment |

See [AACT documentation](https://aact.ctti-clinicaltrials.org/documentation) for full schema.

## Note on HTML files

`nlm_*_definitions.html` are **not** NLM field-definition exports — they are browser-saved copies of the public CT.gov site. For field semantics, use the data dictionary or [CT.gov API v2 docs](https://clinicaltrials.gov/data-api/about-api).
