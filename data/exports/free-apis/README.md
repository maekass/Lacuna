# Free API exports

Batch JSON snapshots from public data sources for Lacuna verified-dataset entities.

```bash
SEC_EDGAR_USER_AGENT="Lacuna Research mps5cy@virginia.edu" \
NCBI_TOOL_EMAIL=mps5cy@virginia.edu \
npm run download:free-apis
```

Outputs are gitignored. See `scripts/download-free-apis.ts --help` for options.

**Sources:** SEC submissions & company facts (tickers only), ClinicalTrials.gov,
openFDA, NIH RePORTER, PubMed, PatentsView (optional key), Wikidata, EU CTR.

CMS bulk files are not included — download manually from [data.cms.gov](https://data.cms.gov).
