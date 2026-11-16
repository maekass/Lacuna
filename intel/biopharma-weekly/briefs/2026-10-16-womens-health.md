# What moved women's health this week — October 16, 2026

This brief is the women's-health companion to [2026-10-16.md](./2026-10-16.md).
Unlike earlier companions, one item here **is** a verified-dataset change: the
Labcorp / BioReference Health select-asset purchase enters
`dataset.verified.json` as `deal60` (dataset v10). Everything else is watchlist
context. CHMP opinions, 510(k) clearances, PDUFA dates, and minority strategic
investments are not acquisitions.

## How this week updates Lacuna

| Item                                        | Lacuna surface                                                                                                                                            | Why                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Labcorp / BioReference Health select assets | `dataset.verified.json` `deal60` + company `c151`; `acquirer-labcorp`; annotation `scope=adjacency`                                                       | Signed asset purchase with SEC 8-K, acquirer release, and independent trade coverage. Women's health testing is a named line. Pending HSR clearance. |
| CHMP extension for Tukysa (tucatinib)       | `catalysts.csv` (`womens_health_relevant=true`, `lacuna_sector=Breast Health`, `lacuna_acquirer_id=acquirer-pfizer`); trial link `deal39` / `NCT05132582` | Label extension on an asset Pfizer bought with Seagen. Not a new deal.                                                                               |
| TumorSight Risk 510(k) (SimBioSys)          | `catalysts.csv` (`womens_health_relevant=true`, `lacuna_sector=Breast Health`); no trial link                                                             | AI MRI recurrence-risk clearance, retrospective validation only. SimBioSys is not in `companies[]`.                                                  |
| giredestrant PDUFAs (Roche, Nov 30, Dec 18) | `catalysts.csv` (`lacuna_acquirer_id=acquirer-roche`); trial links `NCT04961996` (lidERA), `NCT05306340` (evERA)                                          | Next 60-day breast-health decisions. Unchanged this week.                                                                                            |
| Lynkuet (elinzanetant) sNDA (Bayer)         | `catalysts.csv` (`lacuna_acquirer_id=acquirer-bayer`); trial link `deal52` / `NCT05587296`                                                                | Asset from the KaNDy acquisition. Q2 2027 quarter-precision PDUFA placeholder.                                                                       |
| MIUDELLA sNDA (Organon / Sebela)            | `catalysts.csv` (`lacuna_acquirer_id=acquirer-organon`)                                                                                                   | Label-duration extension, unchanged. Not M&A.                                                                                                        |

Watchlist women's-health rows stand at **12** after PR #283, two of them with a
tracked-acquirer trial link (tucatinib → `deal39`, elinzanetant → `deal52`).
Verified dataset moves **150 → 151 companies** and **59 → 60 acquisitions**.

## The deal that entered the dataset

**Labcorp agreed to buy select BioReference Health assets from OPKO Health.**
OPKO, BioReference Health, LLC and Laboratory Corporation of America Holdings
signed an Asset Purchase Agreement on **October 14, 2026**, covering assets
_"focused on clinical and women's health testing services, urology, corrections
and Seller's proprietary 4Kscore prostate cancer test"_
([OPKO 8-K Item 1.01](https://www.sec.gov/Archives/edgar/data/944809/000119312526422877/opk-20261014.htm)).
The companies announced it on **October 15**
([Labcorp](https://ir.labcorp.com/news-releases/news-release-details/labcorp-enters-agreement-opko-health-acquire-select-assets)).

| Field         | Value                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dealValue`   | **722** ($M cash at closing, subject to adjustment on closing revenues) ([8-K](https://www.sec.gov/Archives/edgar/data/944809/000119312526422877/opk-20261014.htm))                                                                                   |
| Earnout       | Up to **$150M** over up to ten years on Labcorp's 4Kscore revenue; total potential **$872M** ([8-K](https://www.sec.gov/Archives/edgar/data/944809/000119312526422877/opk-20261014.htm))                                                              |
| Status        | Announced, **no `closedDate`**. Needs HSR clearance; outside date **April 14, 2027**; **$28.88M** Labcorp termination fee on specified regulatory failure ([8-K](https://www.sec.gov/Archives/edgar/data/944809/000119312526422877/opk-20261014.htm)) |
| Scale         | Over 80 patient service centers; about **$250M** first-year revenue on Labcorp's forecast ([Labcorp](https://ir.labcorp.com/news-releases/news-release-details/labcorp-enters-agreement-opko-health-acquire-select-assets))                           |
| Corroboration | Independent trade coverage with the same parties, date and price ([CLP Magazine](https://clpmag.com/lab-management/company-news/labcorp-acquires-bioreference-health-assets-4kscore-test/))                                                           |
| HQ on `c151`  | Elmwood Park, NJ, the main diagnostics laboratory in OPKO's FY2025 10-K property table ([OPKO 10-K](https://www.sec.gov/Archives/edgar/data/0000944809/000119312526076596/opk-20251231.htm))                                                          |

**Why it is `adjacency`, not `womens_health`.** The purchased business mixes
women's health testing with general clinical, urology and corrections testing,
and the earnout rides on a prostate test. The sidecar annotation puts it with
Alere, EUROIMMUN and Genomic Health. It therefore does not move the
women's-health disclosed total ($22.1B). While pending, it is also outside
completed-lifecycle totals. The all-scope disclosed sum moves $140.3B → $141.0B.

**What it does not do to the models.** BioReference has no funding or pre-deal
valuation on record. `compute:all` excludes `deal60` from MOIC benchmarks
(`funding_unresearched`) and premium heuristics
(`pre_deal_valuation_unresearched`). No benchmark value changed. It has no
founded year, so the hazard cohort stays at 103 analyzed and 58 events (48
excluded for a missing year, up from 47). The in-sample catalog share moves
59/150 → 60/151, and a pending deal counts toward it. That is the known cost of
the `outcomeType=acquired` deal-target convention.

## Also notable

- **Tukysa's EU extension follows the US approval on October 7.** The CHMP
  backed tucatinib with trastuzumab and pertuzumab as maintenance after
  first-line induction in HER2+ unresectable or metastatic breast cancer
  ([EMA](https://www.ema.europa.eu/en/news/meeting-highlights-committee-medicinal-products-human-use-chmp-12-15-october-2026)).
  The asset came to Pfizer with Seagen (`deal39`). It is not an EC decision.
- **TumorSight Risk is a clearance, not outcome evidence.** The 510(k) covers
  AI-derived 5- and 10-year recurrence risk from routine breast MRI in HR+/HER2-
  stage I–IIIA disease
  ([PR Newswire](https://www.prnewswire.com/news-releases/simbiosys-secures-fda-clearance-for-tumorsight-risk-introducing-the-worlds-first-ai-powered-mri-derived-breast-cancer-recurrence-risk-assessment-302910055.html)).
  Validation was retrospective (n=2,129)
  ([EconoTimes](https://econotimes.com/FDA-Clears-SimBioSys-Breast-Cancer-Recurrence-Risk-Software-1755126)).
  No NCT link, and SimBioSys does not enter `companies[]` from a clearance.
- **Google Health made a strategic investment in Flo.** The amount was not
  disclosed
  ([Flo Health / PR Newswire](https://finance.yahoo.com/healthcare/articles/flo-health-google-health-join-131000377.html);
  [The Next Web](https://thenextweb.com/news/google-flo-health-investment-womens-health-wearables)).
  Flo is not in `companies[]`. `acquirer-google` exists, but an undisclosed
  minority stake fails the price-disclosure and control tests. It stays out.
- **Allara raised $30M, bringing total funding to $75M**
  ([AlleyWatch](https://alleywatch.com/2026/10/allara-virtual-womens-health-care-insurance-covered-hormonal-ai-rachel-blank/)).
  One Axios Pro headline said $39M while its body said $30M
  ([Axios](https://www.axios.com/pro/health-tech-deals/2026/10/13/allara-health-39m-womens-health)).
  A venture round is not an exit row.

## What we did not add

- **Sun Pharma / Organon (~$10B).** Sun called the reports "speculative"
  ([pharmaphorum](https://pharmaphorum.com/news/sun-pharma-says-talk-10bn-organon-bid-speculative)).
  There is no agreement, filing or price. `acquirer-organon` is unchanged.
- **"Bayer acquires KaNDy."** Coverage re-dated to this week is the 2020 deal,
  already `deal52`. Not a new event.
- **Hologic take-private.** The Blackstone / TPG deal completed in April 2026;
  the completion 8-K was filed April 7
  ([Hologic EX-99.1](https://www.sec.gov/Archives/edgar/data/859737/000119312526144632/d135035dex991.htm)).
  It is a separate candidate. It is not a this-week event, and Hologic is an
  acquirer, not a catalog company.
- **Labcorp's 2024 and 2025 BioReference purchases.** Labcorp bought
  BioReference's clinical diagnostics, reproductive health and women's health
  testing outside New York and New Jersey (agreement March 27, 2024; closed
  September 16, 2024; $237.5M cash). It also bought the oncology business
  (closed September 15, 2025; $192.5M plus up to $32.5M earnout)
  ([OPKO 10-K](https://www.sec.gov/Archives/edgar/data/0000944809/000119312526076596/opk-20251231.htm)).
  The 2024 deal is a clearly in-scope candidate and is **not yet** in the
  dataset. The oncology deal is out of scope.

## Verification

```bash
npm run validate:dataset          # 0 errors; warnings 190 → 190
npm run compute:all && npm run verify:computed
npm run hazard:check              # cohort n=103, events=58, excluded_founded=48
npx vitest run                    # 211 files, 1,219 tests
python3 -c "import json;d=json.load(open('src/data/dataset.verified.json'));a=[x for x in d['acquisitions'] if x['id']=='deal60'][0];assert a['dealValue']==722 and 'closedDate' not in a and a['targetId']=='c151'"
```
