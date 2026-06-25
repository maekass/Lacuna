# Crunchbase Pro Export Guide

Generated: 2026-06-25T02:14:16.699Z

## Instructions

1. **For each company below**, click the search URL to find them on Crunchbase
2. **Open the organization profile** and verify it's the right company
3. **Export the data**: Click "Export" → CSV format
4. **Save to**: `data/crunchbase-exports/{company-id}.csv`
   - e.g., `data/crunchbase-exports/c90.csv` for Apollo Neuroscience
5. **Include these fields** in your export (Crunchbase Pro lets you select columns):
   - Organization Name
   - Headquarters Location
   - Industries
   - Last Funding Type
   - Last Funding Date
   - Total Funding Amount
   - Number of Employees
   - Operating Status
   - Founded Date
   - Acquisition Status
   - Last Known Valuation
   - Number of Funding Rounds
6. **When all 56 are done**, run: `npx tsx scripts/ingest-crunchbase-csv.ts`

## Quick Export Tips

- You can search multiple companies at once using Crunchbase's advanced search
- Filter by Industry: "Women's Health", "Fertility", "Health Care"
- Export up to 1,000 rows at once
- Save time: export all companies in a sector as a single CSV, name it `crunchbase-{sector}.csv`

---

## All 56 D-Grade Companies

| # | ID | Company | Sector | Crunchbase Search |
|---|-----|---------|--------|-------------------|
| 1 | c11 | Proov | Fertility | [Search](https://www.crunchbase.com/textsearch?q=Proov&entities=organizations) |
| 2 | c20 | Bloomi | Pelvic Health | [Search](https://www.crunchbase.com/textsearch?q=Bloomi&entities=organizations) |
| 3 | c22 | Ovubrush | Fertility | [Search](https://www.crunchbase.com/textsearch?q=Ovubrush&entities=organizations) |
| 4 | c30 | ZyMōt Fertility | Fertility | [Search](https://www.crunchbase.com/textsearch?q=ZyM%C5%8Dt%20Fertility&entities=organizations) |
| 5 | c31 | Alydia Health | Maternal Health | [Search](https://www.crunchbase.com/textsearch?q=Alydia%20Health&entities=organizations) |
| 6 | c35 | Celmatix | Fertility | [Search](https://www.crunchbase.com/textsearch?q=Celmatix&entities=organizations) |
| 7 | c48 | eFertility (STB Zorg) | Fertility | [Search](https://www.crunchbase.com/textsearch?q=eFertility%20(STB%20Zorg)&entities=organizations) |
| 8 | c64 | Ovia Health | Maternal Health | [Search](https://www.crunchbase.com/textsearch?q=Ovia%20Health&entities=organizations) |
| 9 | c87 | Testmate Health | Diagnostics | [Search](https://www.crunchbase.com/textsearch?q=Testmate%20Health&entities=organizations) |
| 10 | c88 | Aunt Flow | Pelvic Health | [Search](https://www.crunchbase.com/textsearch?q=Aunt%20Flow&entities=organizations) |
| 11 | c90 | Apollo Neuroscience | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Apollo%20Neuroscience&entities=organizations) |
| 12 | c91 | Aria CV | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Aria%20CV&entities=organizations) |
| 13 | c92 | Attn: Grace | Pelvic Health | [Search](https://www.crunchbase.com/textsearch?q=Attn%3A%20Grace&entities=organizations) |
| 14 | c93 | b.well | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=b.well&entities=organizations) |
| 15 | c94 | Bone Health Technologies | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Bone%20Health%20Technologies&entities=organizations) |
| 16 | c95 | Bowe Glow, Inc | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Bowe%20Glow%2C%20Inc&entities=organizations) |
| 17 | c96 | Cat Health | Therapeutics | [Search](https://www.crunchbase.com/textsearch?q=Cat%20Health&entities=organizations) |
| 18 | c97 | Chronicle Bio | Tech Bio | [Search](https://www.crunchbase.com/textsearch?q=Chronicle%20Bio&entities=organizations) |
| 19 | c98 | Clear Gene | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Clear%20Gene&entities=organizations) |
| 20 | c99 | E-Lovu Health | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=E-Lovu%20Health&entities=organizations) |
| 21 | c100 | Everly Health | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Everly%20Health&entities=organizations) |
| 22 | c101 | FemDx Medsystems | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=FemDx%20Medsystems&entities=organizations) |
| 23 | c102 | Frontier Bio | Biotech | [Search](https://www.crunchbase.com/textsearch?q=Frontier%20Bio&entities=organizations) |
| 24 | c103 | Future Family | Reproductive | [Search](https://www.crunchbase.com/textsearch?q=Future%20Family&entities=organizations) |
| 25 | c104 | Gameto | Biotech | [Search](https://www.crunchbase.com/textsearch?q=Gameto&entities=organizations) |
| 26 | c105 | Harmony Nutrition | Biotech | [Search](https://www.crunchbase.com/textsearch?q=Harmony%20Nutrition&entities=organizations) |
| 27 | c106 | Hera Biotech | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Hera%20Biotech&entities=organizations) |
| 28 | c107 | Inherent Biosciences | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Inherent%20Biosciences&entities=organizations) |
| 29 | c108 | Joylux | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Joylux&entities=organizations) |
| 30 | c109 | Lighthouse Pharma | Therapeutics | [Search](https://www.crunchbase.com/textsearch?q=Lighthouse%20Pharma&entities=organizations) |
| 31 | c110 | L-Nutra | Consumer | [Search](https://www.crunchbase.com/textsearch?q=L-Nutra&entities=organizations) |
| 32 | c111 | Madison Reed | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Madison%20Reed&entities=organizations) |
| 33 | c112 | Madorra | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Madorra&entities=organizations) |
| 34 | c113 | Maude | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Maude&entities=organizations) |
| 35 | c114 | Maven Clinic (portfolio) | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=Maven%20Clinic%20(portfolio)&entities=organizations) |
| 36 | c115 | Mercy Bio | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Mercy%20Bio&entities=organizations) |
| 37 | c116 | Mirvie | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=Mirvie&entities=organizations) |
| 38 | c117 | Nalu Bio | Wellness | [Search](https://www.crunchbase.com/textsearch?q=Nalu%20Bio&entities=organizations) |
| 39 | c118 | Nest Collaborative | Maternal Health | [Search](https://www.crunchbase.com/textsearch?q=Nest%20Collaborative&entities=organizations) |
| 40 | c119 | Neuspera | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Neuspera&entities=organizations) |
| 41 | c120 | NowDx | Diagnostic | [Search](https://www.crunchbase.com/textsearch?q=NowDx&entities=organizations) |
| 42 | c121 | Proov (portfolio) | Reproductive | [Search](https://www.crunchbase.com/textsearch?q=Proov%20(portfolio)&entities=organizations) |
| 43 | c122 | Rebundle | Consumer | [Search](https://www.crunchbase.com/textsearch?q=Rebundle&entities=organizations) |
| 44 | c123 | Rosy Wellness | Wellness | [Search](https://www.crunchbase.com/textsearch?q=Rosy%20Wellness&entities=organizations) |
| 45 | c124 | Sana Health | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Sana%20Health&entities=organizations) |
| 46 | c125 | Simple HealthKit | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=Simple%20HealthKit&entities=organizations) |
| 47 | c126 | Siren | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Siren&entities=organizations) |
| 48 | c127 | Solace Therapeutics | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Solace%20Therapeutics&entities=organizations) |
| 49 | c128 | Toi Labs | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Toi%20Labs&entities=organizations) |
| 50 | c129 | Veana Therapeutics | Therapeutics | [Search](https://www.crunchbase.com/textsearch?q=Veana%20Therapeutics&entities=organizations) |
| 51 | c130 | Wellth | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=Wellth&entities=organizations) |
| 52 | c131 | Willow | Maternal Health | [Search](https://www.crunchbase.com/textsearch?q=Willow&entities=organizations) |
| 53 | c132 | Xandar Kardian | Medical Device | [Search](https://www.crunchbase.com/textsearch?q=Xandar%20Kardian&entities=organizations) |
| 54 | c133 | xCures | Digital Health | [Search](https://www.crunchbase.com/textsearch?q=xCures&entities=organizations) |
| 55 | c134 | YourChoice Therapeutics | Reproductive | [Search](https://www.crunchbase.com/textsearch?q=YourChoice%20Therapeutics&entities=organizations) |
| 56 | c135 | X-Therma | Biotech | [Search](https://www.crunchbase.com/textsearch?q=X-Therma&entities=organizations) |

---

## By Sector (for batch export)

### Fertility (5 companies)

- **Proov** (c11): [Search](https://www.crunchbase.com/textsearch?q=Proov&entities=organizations) | [Profile](https://www.crunchbase.com/organization/proov)
- **Ovubrush** (c22): [Search](https://www.crunchbase.com/textsearch?q=Ovubrush&entities=organizations) | [Profile](https://www.crunchbase.com/organization/ovubrush)
- **ZyMōt Fertility** (c30): [Search](https://www.crunchbase.com/textsearch?q=ZyM%C5%8Dt%20Fertility&entities=organizations) | [Profile](https://www.crunchbase.com/organization/zym-t-fertility)
- **Celmatix** (c35): [Search](https://www.crunchbase.com/textsearch?q=Celmatix&entities=organizations) | [Profile](https://www.crunchbase.com/organization/celmatix)
- **eFertility (STB Zorg)** (c48): [Search](https://www.crunchbase.com/textsearch?q=eFertility%20(STB%20Zorg)&entities=organizations) | [Profile](https://www.crunchbase.com/organization/efertility-stb-zorg)

### Pelvic Health (3 companies)

- **Bloomi** (c20): [Search](https://www.crunchbase.com/textsearch?q=Bloomi&entities=organizations) | [Profile](https://www.crunchbase.com/organization/bloomi)
- **Aunt Flow** (c88): [Search](https://www.crunchbase.com/textsearch?q=Aunt%20Flow&entities=organizations) | [Profile](https://www.crunchbase.com/organization/aunt-flow)
- **Attn: Grace** (c92): [Search](https://www.crunchbase.com/textsearch?q=Attn%3A%20Grace&entities=organizations) | [Profile](https://www.crunchbase.com/organization/attn-grace)

### Maternal Health (4 companies)

- **Alydia Health** (c31): [Search](https://www.crunchbase.com/textsearch?q=Alydia%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/alydia-health)
- **Ovia Health** (c64): [Search](https://www.crunchbase.com/textsearch?q=Ovia%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/ovia-health)
- **Nest Collaborative** (c118): [Search](https://www.crunchbase.com/textsearch?q=Nest%20Collaborative&entities=organizations) | [Profile](https://www.crunchbase.com/organization/nest-collaborative)
- **Willow** (c131): [Search](https://www.crunchbase.com/textsearch?q=Willow&entities=organizations) | [Profile](https://www.crunchbase.com/organization/willow)

### Diagnostics (1 companies)

- **Testmate Health** (c87): [Search](https://www.crunchbase.com/textsearch?q=Testmate%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/testmate-health)

### Consumer (7 companies)

- **Apollo Neuroscience** (c90): [Search](https://www.crunchbase.com/textsearch?q=Apollo%20Neuroscience&entities=organizations) | [Profile](https://www.crunchbase.com/organization/apollo-neuroscience)
- **Bowe Glow, Inc** (c95): [Search](https://www.crunchbase.com/textsearch?q=Bowe%20Glow%2C%20Inc&entities=organizations) | [Profile](https://www.crunchbase.com/organization/bowe-glow-inc)
- **Joylux** (c108): [Search](https://www.crunchbase.com/textsearch?q=Joylux&entities=organizations) | [Profile](https://www.crunchbase.com/organization/joylux)
- **L-Nutra** (c110): [Search](https://www.crunchbase.com/textsearch?q=L-Nutra&entities=organizations) | [Profile](https://www.crunchbase.com/organization/l-nutra)
- **Madison Reed** (c111): [Search](https://www.crunchbase.com/textsearch?q=Madison%20Reed&entities=organizations) | [Profile](https://www.crunchbase.com/organization/madison-reed)
- **Maude** (c113): [Search](https://www.crunchbase.com/textsearch?q=Maude&entities=organizations) | [Profile](https://www.crunchbase.com/organization/maude)
- **Rebundle** (c122): [Search](https://www.crunchbase.com/textsearch?q=Rebundle&entities=organizations) | [Profile](https://www.crunchbase.com/organization/rebundle)

### Medical Device (10 companies)

- **Aria CV** (c91): [Search](https://www.crunchbase.com/textsearch?q=Aria%20CV&entities=organizations) | [Profile](https://www.crunchbase.com/organization/aria-cv)
- **Bone Health Technologies** (c94): [Search](https://www.crunchbase.com/textsearch?q=Bone%20Health%20Technologies&entities=organizations) | [Profile](https://www.crunchbase.com/organization/bone-health-technologies)
- **FemDx Medsystems** (c101): [Search](https://www.crunchbase.com/textsearch?q=FemDx%20Medsystems&entities=organizations) | [Profile](https://www.crunchbase.com/organization/femdx-medsystems)
- **Madorra** (c112): [Search](https://www.crunchbase.com/textsearch?q=Madorra&entities=organizations) | [Profile](https://www.crunchbase.com/organization/madorra)
- **Neuspera** (c119): [Search](https://www.crunchbase.com/textsearch?q=Neuspera&entities=organizations) | [Profile](https://www.crunchbase.com/organization/neuspera)
- **Sana Health** (c124): [Search](https://www.crunchbase.com/textsearch?q=Sana%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/sana-health)
- **Siren** (c126): [Search](https://www.crunchbase.com/textsearch?q=Siren&entities=organizations) | [Profile](https://www.crunchbase.com/organization/siren)
- **Solace Therapeutics** (c127): [Search](https://www.crunchbase.com/textsearch?q=Solace%20Therapeutics&entities=organizations) | [Profile](https://www.crunchbase.com/organization/solace-therapeutics)
- **Toi Labs** (c128): [Search](https://www.crunchbase.com/textsearch?q=Toi%20Labs&entities=organizations) | [Profile](https://www.crunchbase.com/organization/toi-labs)
- **Xandar Kardian** (c132): [Search](https://www.crunchbase.com/textsearch?q=Xandar%20Kardian&entities=organizations) | [Profile](https://www.crunchbase.com/organization/xandar-kardian)

### Digital Health (6 companies)

- **b.well** (c93): [Search](https://www.crunchbase.com/textsearch?q=b.well&entities=organizations) | [Profile](https://www.crunchbase.com/organization/b-well)
- **E-Lovu Health** (c99): [Search](https://www.crunchbase.com/textsearch?q=E-Lovu%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/e-lovu-health)
- **Maven Clinic (portfolio)** (c114): [Search](https://www.crunchbase.com/textsearch?q=Maven%20Clinic%20(portfolio)&entities=organizations) | [Profile](https://www.crunchbase.com/organization/maven-clinic-portfolio)
- **Simple HealthKit** (c125): [Search](https://www.crunchbase.com/textsearch?q=Simple%20HealthKit&entities=organizations) | [Profile](https://www.crunchbase.com/organization/simple-healthkit)
- **Wellth** (c130): [Search](https://www.crunchbase.com/textsearch?q=Wellth&entities=organizations) | [Profile](https://www.crunchbase.com/organization/wellth)
- **xCures** (c133): [Search](https://www.crunchbase.com/textsearch?q=xCures&entities=organizations) | [Profile](https://www.crunchbase.com/organization/xcures)

### Therapeutics (3 companies)

- **Cat Health** (c96): [Search](https://www.crunchbase.com/textsearch?q=Cat%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/cat-health)
- **Lighthouse Pharma** (c109): [Search](https://www.crunchbase.com/textsearch?q=Lighthouse%20Pharma&entities=organizations) | [Profile](https://www.crunchbase.com/organization/lighthouse-pharma)
- **Veana Therapeutics** (c129): [Search](https://www.crunchbase.com/textsearch?q=Veana%20Therapeutics&entities=organizations) | [Profile](https://www.crunchbase.com/organization/veana-therapeutics)

### Tech Bio (1 companies)

- **Chronicle Bio** (c97): [Search](https://www.crunchbase.com/textsearch?q=Chronicle%20Bio&entities=organizations) | [Profile](https://www.crunchbase.com/organization/chronicle-bio)

### Diagnostic (7 companies)

- **Clear Gene** (c98): [Search](https://www.crunchbase.com/textsearch?q=Clear%20Gene&entities=organizations) | [Profile](https://www.crunchbase.com/organization/clear-gene)
- **Everly Health** (c100): [Search](https://www.crunchbase.com/textsearch?q=Everly%20Health&entities=organizations) | [Profile](https://www.crunchbase.com/organization/everly-health)
- **Hera Biotech** (c106): [Search](https://www.crunchbase.com/textsearch?q=Hera%20Biotech&entities=organizations) | [Profile](https://www.crunchbase.com/organization/hera-biotech)
- **Inherent Biosciences** (c107): [Search](https://www.crunchbase.com/textsearch?q=Inherent%20Biosciences&entities=organizations) | [Profile](https://www.crunchbase.com/organization/inherent-biosciences)
- **Mercy Bio** (c115): [Search](https://www.crunchbase.com/textsearch?q=Mercy%20Bio&entities=organizations) | [Profile](https://www.crunchbase.com/organization/mercy-bio)
- **Mirvie** (c116): [Search](https://www.crunchbase.com/textsearch?q=Mirvie&entities=organizations) | [Profile](https://www.crunchbase.com/organization/mirvie)
- **NowDx** (c120): [Search](https://www.crunchbase.com/textsearch?q=NowDx&entities=organizations) | [Profile](https://www.crunchbase.com/organization/nowdx)

### Biotech (4 companies)

- **Frontier Bio** (c102): [Search](https://www.crunchbase.com/textsearch?q=Frontier%20Bio&entities=organizations) | [Profile](https://www.crunchbase.com/organization/frontier-bio)
- **Gameto** (c104): [Search](https://www.crunchbase.com/textsearch?q=Gameto&entities=organizations) | [Profile](https://www.crunchbase.com/organization/gameto)
- **Harmony Nutrition** (c105): [Search](https://www.crunchbase.com/textsearch?q=Harmony%20Nutrition&entities=organizations) | [Profile](https://www.crunchbase.com/organization/harmony-nutrition)
- **X-Therma** (c135): [Search](https://www.crunchbase.com/textsearch?q=X-Therma&entities=organizations) | [Profile](https://www.crunchbase.com/organization/x-therma)

### Reproductive (3 companies)

- **Future Family** (c103): [Search](https://www.crunchbase.com/textsearch?q=Future%20Family&entities=organizations) | [Profile](https://www.crunchbase.com/organization/future-family)
- **Proov (portfolio)** (c121): [Search](https://www.crunchbase.com/textsearch?q=Proov%20(portfolio)&entities=organizations) | [Profile](https://www.crunchbase.com/organization/proov-portfolio)
- **YourChoice Therapeutics** (c134): [Search](https://www.crunchbase.com/textsearch?q=YourChoice%20Therapeutics&entities=organizations) | [Profile](https://www.crunchbase.com/organization/yourchoice-therapeutics)

### Wellness (2 companies)

- **Nalu Bio** (c117): [Search](https://www.crunchbase.com/textsearch?q=Nalu%20Bio&entities=organizations) | [Profile](https://www.crunchbase.com/organization/nalu-bio)
- **Rosy Wellness** (c123): [Search](https://www.crunchbase.com/textsearch?q=Rosy%20Wellness&entities=organizations) | [Profile](https://www.crunchbase.com/organization/rosy-wellness)

---

## CSV Export Format

Save each CSV with these columns (Crunchbase Pro default export):

```
Organization Name, Headquarters Location, Industries, Last Funding Type,
Last Funding Date, Total Funding Amount, Number of Employees, Operating Status,
Founded Date, Acquisition Status, Last Known Valuation, Number of Funding Rounds
```

Save files to: `data/crunchbase-exports/`
