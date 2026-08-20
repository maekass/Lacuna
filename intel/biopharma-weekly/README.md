# Biopharma Weekly Intel

Auto-maintained by a scheduled Perplexity Computer task, Fridays 5:00 PM ET.

## Contents

- `catalysts.csv` — rolling watchlist of upcoming catalysts and decision dates
  (PDUFA dates, advisory committee meetings, CHMP opinions, major readouts,
  guidance changes). Updated weekly: new catalysts appended, outcomes recorded
  in `status`, stale rows pruned.
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
