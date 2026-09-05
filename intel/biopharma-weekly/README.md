# Biopharma Weekly Intel

Auto-maintained by a scheduled Perplexity Computer task, Fridays 5:00 PM ET.

## Contents

- `catalysts.csv` — rolling watchlist of upcoming catalysts and decision dates
  (PDUFA dates, advisory committee meetings, CHMP opinions, major readouts,
  guidance changes). Source of truth. Updated weekly: new catalysts appended,
  outcomes recorded in `status`, stale rows pruned. Sorted by `catalyst_date` as
  of the 2026-09-04 update.
- `catalysts.xlsx` — formatted workbook of the same 46 rows (frozen header,
  status colors, source hyperlinks). Keep in lockstep with the CSV.
- `briefs/YYYY-MM-DD.md` — weekly one-page "What moved biopharma this week"
  briefs: top 3 events, companies and drug classes affected, 30-day downstream
  watchlist.

## CSV schema

| column                                        | meaning                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| date_added                                    | when the row entered the watchlist                                                        |
| catalyst_date                                 | expected or actual decision/readout date (YYYY-MM-DD; approximate windows noted in notes) |
| event_type                                    | PDUFA / AdComm / CHMP / readout / guidance / approval / CRL                               |
| company, ticker, drug, drug_class, indication | affected parties                                                                          |
| status                                        | upcoming / approved / CRL / positive / negative / delayed / withdrawn                     |
| source_url                                    | primary source                                                                            |
| notes                                         | context, spillover effects                                                                |

## Sweeps

`npm run intel:sweep` reports on the watchlist; `intel:sweep:check` (run in CI)
fails on duplicate rows (company + drug + event_type) or schema violations (ISO
dates, unknown event_type/status, non-https source_url). Stale `upcoming` rows
with past dates and unsorted files are warnings only, since the weekly
automation appends unsorted and resolves stale rows on its own cadence.
`npm run intel:sweep:fix` drops duplicates (keeping the latest `date_added`;
ties keep the last occurrence) and stable-sorts by `catalyst_date`.
