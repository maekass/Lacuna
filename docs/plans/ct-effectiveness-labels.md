# Plan: AACT effectiveness labels (P13)

**Status:** plan only. Do not change `ml/` or `src/` from this document.
**Source of truth for schema:**
[AACT data dictionary](https://aact.ctti-clinicaltrials.org/data_dictionary) and
field pages such as
[`studies.why_stopped`](https://aact.ctti-clinicaltrials.org/documentation/432).
**Related:** `ml/clinical_trials/lacuna_ct/labels.py`,
`ml/clinical_trials/scripts/export_from_aact.py`, `docs/ML_CLINICAL_TRIALS.md`.

## Why this is a separate wave

`label_completed` is operational status (`COMPLETED` vs
`TERMINATED`/`WITHDRAWN`/`SUSPENDED`). It is **not** primary-endpoint success. A
completed trial can miss its endpoint; a terminated trial can have been stopped
for benefit. Shipping an "effectiveness" score from status labels would be a
silent lie. This plan defines labels that can disagree with completion.

## Schema notes verified against the public dictionary (2026-09)

AACT (`ctgov`) is ~51 tables joined on `nct_id`. Relevant tables:

| Table                                                    | Domain             | Use                                                                                                                                            |
| -------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `studies`                                                | Protocol & Results | `why_stopped`, planned/actual enrollment, start / primary-completion / completion / results-first-posted dates, overall status                 |
| `calculated_values`                                      | Protocol (derived) | `number_of_facilities`, `actual_duration`, `were_results_reported`, `months_to_report_results` — **not** a substitute for `studies.enrollment` |
| `eligibilities`                                          | Protocol           | `gender`, `gender_based`, `minimum_age`, `maximum_age`, inclusion/exclusion text                                                               |
| `designs`                                                | Protocol           | allocation, intervention model, masking, primary purpose                                                                                       |
| `conditions` / `browse_conditions`                       | Protocol           | indication; NLM MeSH                                                                                                                           |
| `outcomes` / `outcome_measurements` / `outcome_analyses` | Results            | primary/secondary measures, estimates, CIs, p-values                                                                                           |
| `reported_events`                                        | Results            | SAE / AE / mortality summaries                                                                                                                 |
| `drop_withdrawals` / `milestones`                        | Results            | attrition vs started                                                                                                                           |

### Enrollment location (current export is stale)

`export_from_aact.py` reads `cv.enrollment` from `ctgov.calculated_values`. The
live dictionary describes **`studies`** as the home of "planned or actual
enrollment" and describes **`calculated_values`** as derived fields such as
`number_of_facilities` and `actual_duration`. Before writing SQL, confirm the
snapshot's `data_dictionary` (xlsx in the AACT dump) for that day's column list.
Prefer:

```sql
COALESCE(s.enrollment, cv.number_of_facilities) -- do not invent enrollment
```

If the loaded snapshot still has `calculated_values.enrollment`, keep a
compatibility `COALESCE(s.enrollment, cv.enrollment, 0)` and record which column
was non-null. Do not silently treat facility count as enrollment.

## Labels to add (none of these ship until a decisive test passes)

### 1. `why_stopped` (free text, not a score)

Copy `studies.why_stopped` onto the training record. Bucket later, never in the
first export:

- safety / AE
- futility / lack of efficacy
- slow enrollment / business
- benefit / early success
- other / blank

Use as a **feature or caveat**, not as `label_completed`. A
termination-for-benefit row must not count as operational failure in an
effectiveness model.

### 2. `label_endpoint_success` (the new target)

Boolean, nullable. Only defined when results exist.

Proposed rule (strict, documented, no invented p-value cuts in the UI):

1. Restrict to `outcomes.outcome_type = 'Primary'` (or AACT's current primary
   flag).
2. Require at least one `outcome_analyses` row with a numeric `p_value` **or** a
   point estimate + CI that does not cross the null for the pre-specified
   `param_type`.
3. Success = every primary analysis that the record marks as the
   superiority/non-inferiority test meets its stated threshold.
4. Failure = at least one primary analysis misses.
5. `null` = no results, descriptive-only outcomes, or conflicting analyses
   without a declared hierarchy.

Do **not** treat `overall_status = COMPLETED` as success. Do **not** treat
`has_results` as success.

### 3. Phase-transition label (secondary, delayed)

`label_phase_advanced = 1` when a later-phase trial exists for the same
sponsor + intervention + condition family after `primary_completion_date`. This
is a **proxy with long lag** and will miss out-licensing. Keep it off the export
gate until entity resolution exists (roadmap in `docs/ML_CLINICAL_TRIALS.md`).

### 4. Effect-size features (not labels)

From `outcome_analyses`: `param_type`, `param_value`, `ci_percent`,
`ci_lower_limit`, `ci_upper_limit`, `p_value`, `method`. Store raw values +
units from `outcomes`. Never convert mixed units into a single "effect" number
for the product UI.

### 5. Design-rigor features

From `designs` + `calculated_values`:

- randomized (`allocation`)
- blinded (`masking`)
- controlled (presence of a comparison `design_groups` / `result_groups`)
- multicenter (`number_of_facilities > 1` when that column exists)

These are covariates. They must not be presented as quality scores.

### 6. Women's-health targeting vs `eligibilities.gender`

Today WH positives come from **15 condition queries** (`WH_CONDITION_QUERIES` in
`lacuna_ct/constants.py`) plus keyword fallbacks. That is indication targeting,
not sex-of-enrollment.

`eligibilities.gender` is `Female` / `Male` / `All` (plus `gender_based`).

| Row                   | Condition query | `gender` | Keep as WH?                 |
| --------------------- | --------------- | -------- | --------------------------- |
| Endometriosis, All    | match           | All      | yes — indication            |
| Female-only migraine  | no match        | Female   | no — sex filter ≠ WH sector |
| Prostate cancer, Male | no match        | Male     | no                          |
| PCOS, Female          | match           | Female   | yes                         |

The next export must **not** replace the 15 queries with `gender = Female`. Add
`eligibility_gender` as a recorded field and a mismatch report: condition-query
WH rows that are Male-only, and Female-only rows that miss every WH query. Those
mismatches are the test that the two definitions differ.

### 7. Readout timing

From `studies`:

- `start_date`
- `primary_completion_date`
- `completion_date`
- `results_first_posted_date` (and posted-date type if split)

Features: months from primary completion to results posted
(`calculated_values.months_to_report_results` when present). Use for freshness
caveats, not as an effectiveness label.

### 8. Safety

`reported_events` (and totals if the snapshot populates
`reported_event_totals`): SAE count / at-risk, mortality. Keep as **descriptive
features**. A safety signal is not endpoint failure unless `why_stopped` or a
primary safety endpoint says so.

## Decisive test (must fail today's completion label)

Before any effectiveness artifact is committed:

1. Load a snapshot that includes results-section tables.
2. Build `label_completed` (status) and `label_endpoint_success` (results).
3. **Assert** there exists ≥ 1 trial where `label_completed == 1` AND
   `label_endpoint_success == 0` (COMPLETED, primary endpoint missed).
4. **Assert** the two labels are not identical on the labeled subset
   (disagreement rate > 0).

If the snapshot cannot produce that disagreement, do not export an effectiveness
model — the label collapsed back into status.

Suggested first search: Phase 2/3 interventional studies with posted primary
`outcome_analyses.p_value >= 0.05` and `overall_status = COMPLETED`.

## Export / product rules (when implemented later)

- Keep `completion-proxy-v2` as an **operational** model. Do not rename it
  "effectiveness".
- New artifact id, e.g. `endpoint-success-v1`, with its own model card.
- Same conjunction export gate as P12 (CI-lower AUC, beat majority, beat
  base-rate Brier). Synthetic seed cannot satisfy this.
- UI copy must say "primary-endpoint result (posted analyses)" and withhold
  while `trainingSource === "synthetic_seed"`.
- Effectiveness scores must not feed deal economics, valuation peers, or
  dual-source badges (`docs/DATA_BOUNDARIES.md`).

## Implementation sketch (future PR, not this one)

1. Confirm snapshot dictionary columns for `studies.enrollment` vs
   `calculated_values`.
2. Extend `TrialRecord` with `why_stopped`, `eligibility_gender`,
   `label_endpoint_success`, readout dates. Leave `label_completed` unchanged.
3. New SQL in a new script (`export_effectiveness_from_aact.py`) so the current
   completion export does not grow leaky joins.
4. Unit test: fixture NCT that is COMPLETED + missed primary (committed JSON
   slice, no live DB in CI).
5. Gender-mismatch report as a sweep warning, not a hard error.

## Out of scope

- Retraining or deleting `completion-proxy-v2`
- Inventing a keyword "efficacy" score from titles
- Using `has_results_flag` as a success feature (already removed from new trains
  in P12)
- ONNX / LLM outcome extraction
