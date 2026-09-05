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

The canonical header is 19 columns. A legacy `catalyst_date` header is still
accepted as `scheduled_date` and emits `[schema.legacyDateColumn]`.

| column                                        | meaning                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| date_added                                    | when the row entered the watchlist                                    |
| scheduled_date                                | planned PDUFA / AdComm / readout / meeting date (YYYY-MM-DD)          |
| event_type                                    | PDUFA / AdComm / CHMP / readout / guidance / approval / CRL           |
| company, ticker, drug, drug_class, indication | affected parties                                                      |
| status                                        | upcoming / approved / CRL / positive / negative / delayed / withdrawn |
| source_url                                    | primary source                                                        |
| notes                                         | context, spillover effects                                            |
| womens_health_relevant                        | `true` / `false` — does this event sit in Lacuna's WH universe?       |
| lacuna_sector                                 | verified-dataset sector when the company/target is in-scope           |
| lacuna_acquirer_id                            | `acquirers[].id` when the sponsor is a tracked acquirer               |
| lacuna_company_id                             | `companies[].id` when the issuer is a tracked company                 |
| date_precision                                | day / month / quarter / year                                          |
| date_basis                                    | how `scheduled_date` was obtained                                     |
| actual_date                                   | date the decision/readout actually occurred (empty while upcoming)    |
| last_verified                                 | last date a human or weekly job confirmed the row                     |

## Event type × date meaning

| event_type | scheduled_date                                   | actual_date                                             |
| ---------- | ------------------------------------------------ | ------------------------------------------------------- |
| PDUFA      | FDA action date on a third-party or FDA calendar | date the FDA actually acted (may be earlier than PDUFA) |
| AdComm     | announced advisory-committee session             | date the meeting occurred                               |
| CHMP       | published CHMP meeting / opinion window          | date the opinion or withdrawal posted                   |
| readout    | expected topline / congress date                 | date results were actually released                     |
| guidance   | comment-period or publication date               | date the guidance posted                                |
| approval   | planned or reported approval date                | FDA/EMA approval date                                   |
| CRL        | expected action date                             | date the complete response letter issued                |

`date_basis=third_party_calendar` means the scheduled date comes from a public
calendar (pdufa.bio, FDA committee calendar, EMA agenda), not from the sponsor's
own confirmed appointment. `actual_event` means the date is the observed
decision/readout.

`actual_date` plus `status=upcoming` is a schema error. `last_verified` older
than 45 days is a warning (`[catalyst.verificationStale]`).

## Sweeps

`npm run intel:sweep` reports on the watchlist; `intel:sweep:check` (run in CI)
fails on duplicate rows (company + drug + event_type + scheduled_date) or schema
violations (ISO dates, unknown event_type/status/date_precision/date_basis,
non-https source_url, unresolved Lacuna ids). Stale `upcoming` rows with past
dates, unsorted files, stale verification, and a weekly batch with zero
women's-health-relevant rows are warnings only. `npm run intel:sweep:fix` drops
duplicates (keeping the latest `date_added`; ties keep the last occurrence) and
stable-sorts by `scheduled_date`.
