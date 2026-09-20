# Lacuna acquisition-time hazard (`ml/hazard`)

Offline **Cox partial-likelihood** fit on the verified deal catalog. The Next.js
app does not import this package; it consumes the exported JSON artifact through
`src/lib/scoring/hazard.ts`.

This is a **descriptive** relative-hazard summary for companies that disclose a
founded year. It is not a forecast, not an acquisition probability, and not
investment advice.

## What it estimates

Among rows in `src/data/dataset.verified.json` with a founded year:

- **Time:** years from founded year to verified acquisition announcement
  (events) or dataset `provenance.lastUpdated` (right-censored independents)
- **Event:** presence in the verified `acquisitions` array
- **Covariates:** none. Sector dummy indicators are not used. Current `stage`
  is also unused — acquired rows are labeled post-outcome ("Acquired by …")
  and would leak the event. The fit is a Breslow / Nelson–Aalen baseline.

## Honest limits

- Convenience sample, not a census of women's-health M&A
- Year-precision times; missing `founded` is exclusion, not imputation
- Small _n_ per sector; no sector contrasts are estimated
- No TAM/SAM, keyword risk scores, or PitchBook fallbacks

## Run

```bash
pip install -r ml/hazard/requirements.txt
PYTHONPATH=ml/hazard python3 scripts/run_hazard.py
PYTHONPATH=ml/hazard python3 -m unittest discover -s ml/hazard/tests -v
PYTHONPATH=ml/hazard python3 scripts/check_claim_consistency.py
```

Or: `npm run hazard:run` · `npm run hazard:test` · `npm run hazard:claims`

`run_hazard.py --check` refits and fails if the committed artifact drifted.
