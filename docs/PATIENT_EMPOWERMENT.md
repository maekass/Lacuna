# Patient empowerment baseline (HLTH / Outcomes4Me 2022)

Lacuna surfaces the **State of Patient Empowerment Report** (HLTH Foundation /
Outcomes4Me, Nov 2022) as a **cited external baseline** crosswalked to the verified
M&A sample — not live patient data.

## Engagement vs empowerment

| Concept | What it measures | Who defines success |
| ------- | ---------------- | ------------------- |
| **Engagement** | Participation in a care journey (portal use, adherence) | Care system |
| **Empowerment** | Ability to act on health goals and shape the journey | Patient |

The report argues engagement metrics alone miss whether patients' preferences and
life goals influence diagnosis, treatment, and survivorship.

## Survey scope

- **Population:** Breast cancer patients (n=1,828), Oct 13 – Nov 1, 2022
- **Partners:** HLTH Foundation, Outcomes4Me, Boston Consulting Group, IQVIA
- **Generalizability:** Breast cancer care continuum mirrors many conditions, but
  figures are **not** automatically transferable to all women's-health M&A sectors

## Gap index (0–100)

Higher index = more patients underserved on that dimension.

| Polarity | Cited stat example | Index formula |
| -------- | ------------------ | ------------- |
| `deficit_rate` | 37% not offered genetic testing | gap = cited deficit % |
| `asset_inverted` | 45% with full records access | gap = 100 − cited positive % |

Severity bands: **critical** ≥60, **high** ≥40, **moderate** &lt;40.

## Composite summary indices

The UI leads with indices that match how reviewers read the report — not only the
unweighted mean (often ~47/100 because several “1 in 4” metrics sit at index 25).

| Index | Definition |
| ----- | ---------- |
| **Median gap** | Median of 12 dimension indices |
| **Mean high+ severity** | Mean of dimensions with severity high or critical |
| **Weighted burden** | Phase × prerequisite × severity weighted mean |
| **Priority score** | Per dimension: `gapIndex × (1 − curatedCoverage%)` |
| **Max gap** | Highest single dimension index + label |

Phase weights overweight **treatment** (1.25×) and **survivorship** (1.35×).
Prerequisite weights overweight **evidence-standards** (1.25×).

## Data freshness

Report version `2022.11.14` — static baseline. Check
[outcomes4me.com/empowerment2022](https://outcomes4me.com/empowerment2022) for
updates. Lacuna does not ingest live patient outcomes.

## Portfolio crosswalk (Lacuna-specific)

Each gap dimension maps to verified companies using **tiered affinity**:

1. **`curated`** — explicit analyst mapping in `patientEmpowermentCrosswalk.ts`
2. **`sector`** — company `sector` ∈ metric `relatedSectors`
3. **`keyword`** — token match in company `description` against `matchKeywords`

Sector and keyword matches are **heuristic** (`heuristic_affinity` tier). Curated
links carry analyst notes and are preferred when tiers conflict.

Outputs per dimension:

- Linked companies (with match tier)
- Verified deals where target ∈ linked set
- `addressableInSample` — companies in related sectors
- `portfolioCoveragePct` — all linked in sector / addressable (often 100% when sectors are broad)
- `curatedCoveragePct` — curated analyst links in sector / addressable
- `heuristicCoveragePct` — sector/keyword links only (excludes curated) / addressable
- `evidenceCoveragePct` — curated links with `sourceUrl` in sector / addressable
- `isPortfolioGap` — addressable &gt; 0 but zero links

## Curated link evidence

Analyst mappings in `patientEmpowermentCrosswalk.ts` may include public citations:

| Field | Role |
| ----- | ---- |
| `sourceUrl` | Public URL (press, trial registry, product page) |
| `sourceTier` | `filing` · `press` · `trial` · `website` |
| `rationale` | Why the link addresses the gap |
| `reviewedAt` | Analyst review date (ISO) |

**Evidence coverage %** = addressable companies with curated link **and** `sourceUrl` /
addressable sample. Heuristic % is the review queue; evidence % is diligence-ready.

## Evidence tiers (UI)

| Tier | Meaning |
| ---- | ------- |
| `cited_survey_2022` | Rate quoted from HLTH/Outcomes4Me report |
| `derived_static` | Gap index derived from cited rate + polarity |
| `heuristic_affinity` | Portfolio crosswalk (sector / keyword / curated) |

## API

```bash
GET  /api/research/patient-empowerment
POST /api/research/patient-empowerment/ask
# body: { "question": "Which gaps have zero portfolio coverage?" }
```

**GET** returns the full `PatientEmpowermentSnapshot` JSON.

**POST** answers using only snapshot JSON as context (Vercel AI Gateway when
configured; deterministic narrative otherwise). Rate limit: 8 req/min/IP.

## Code

| Path | Role |
| ---- | ---- |
| `src/data/patientEmpowermentReport.ts` | Cited metrics + gap indices |
| `src/data/patientEmpowermentCrosswalk.ts` | Curated company ↔ gap mappings |
| `src/lib/research/patientEmpowermentTaxonomy.ts` | Phases, prerequisites, tiers |
| `src/lib/research/patientEmpowermentScoring.ts` | Weights, median, priority score |
| `src/lib/research/patientEmpowermentPipeline.ts` | Join engine + LLM export |
| `src/lib/research/patientEmpowermentGapLlm.ts` | Grounded ask / fallback |
| `src/lib/deals/empowermentContextForDeal.ts` | Deal-level dimension lookup |
| `src/components/PatientEmpowermentPanel.tsx` | Research UI |
| `scripts/validate-empowerment.ts` | CI validation |

```bash
npm run validate:empowerment
```

Checks metric completeness, curated link integrity (valid company/metric IDs), and
pipeline invariants on the static dataset.

## Honesty

Descriptive diligence context only — not investment advice, clinical
recommendations, or a substitute for reading the primary report PDF.
