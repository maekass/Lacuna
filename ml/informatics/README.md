# Informatics: FHIR to i2b2-style cohort counts

Loads FHIR R4 resources (Patient, Encounter, Condition, Procedure,
ExplanationOfBenefit) into an i2b2-style star schema in DuckDB and answers
aggregate-only cohort questions.

## What this is and is not

- It reimplements the published i2b2 CRC data model. It is not the i2b2 software
  and is not affiliated with or endorsed by i2b2, Harvard Catalyst, Harvard
  Medical School, SHRINE or PIC-SURE.
- Query semantics follow i2b2 panels: OR inside a panel, AND across panels,
  optional exclusion panels.
- Results are counts only. Counts of 1 to 10 are suppressed. Row-level requests
  are rejected.
- Input must be labeled `synthetic`, or `public_deidentified_opt_in` for an
  explicitly approved public de-identified set. Anything else is refused. No
  PHI.
- Concept names store code numbers only. No AMA CPT descriptors (see
  `docs/REIMBURSEMENT_CPT_LICENSING.md`).
- Dollar amounts in `synthetic.py` are invented placeholders, not payer rates.

## Run

```bash
pip install -r ml/informatics/requirements.txt
python -m pytest -q ml/informatics/tests
```

## Example query

```json
{
  "expectedResultType": "COUNT",
  "panels": [
    { "concepts": ["ICD10CM:N80.0", "ICD10CM:N80.3"] },
    { "concepts": ["CPT:58662"] }
  ]
}
```
