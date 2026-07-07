# Space research → trial → transaction gaps

Lacuna scores **space-linked women's health research** on a fixed pipeline and
exposes where evidence stops short of companies and verified M&A.

## Pipeline stages

`research_signal` → `space_validation` → `earth_trial` → `company` →
`transaction`

| Stage            | Evidence                                  |
| ---------------- | ----------------------------------------- |
| research_signal  | Asset in curated catalog with citations   |
| space_validation | Provenance is not `space_physiology_only` |
| earth_trial      | CT.gov search terms or known NCT IDs      |
| company          | Alias match to verified company/acquirer  |
| transaction      | Alias match to verified acquisition       |

## Provenance tags

- `space_tested_therapeutic` — e.g. BP-NELL-PEG on ISS
- `space_formulation` — e.g. pembrolizumab crystallization
- `astronaut_operational_pharma` — e.g. continuous COCs in flight
- `space_physiology_only` — e.g. RR-20, ORION, AstroCup

## UI

Research workspace → **Space research → trial → transaction**

- Pipeline funnel (furthest-stage counts)
- Gap matrix (area × stage reach)
- Per-asset stage chips
- **Gap analyst (LLM)** — grounded only in pipeline JSON

## API

```bash
GET  /api/research/space-wh-pipeline
POST /api/research/space-wh-pipeline/ask
# body: { "question": "What are the largest commercial gaps?" }
```

**Model:** Vercel AI Gateway slug `xai/grok-4.3` (see
`SPACE_WH_GAP_GATEWAY_MODEL` in `src/lib/ai/inference.ts`). Direct OpenAI
fallback: `gpt-4o-mini`.

Without `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` / `OPENAI_API_KEY`, ask
returns a **deterministic** narrative (no LLM).

Gateway calls use the AI SDK string model id (same pattern as
`generateText({ model: 'xai/grok-4.3', ... })`), via `generateInferenceText` so
prompts stay centralized and tagged `feature:space-wh-gap`.

## Code

| Path                                             | Role                       |
| ------------------------------------------------ | -------------------------- |
| `src/data/spaceWhResearchAssets.ts`              | Curated assets + citations |
| `src/lib/research/spaceWhTaxonomy.ts`            | Tags and stages            |
| `src/lib/research/trialToTransactionPipeline.ts` | Join to verified dataset   |
| `src/lib/research/spaceWhGapLlm.ts`              | Grounded LLM / fallback    |
| `src/components/SpaceWhResearchGapsPanel.tsx`    | Visualizers + ask UI       |

## Honesty

Descriptive only — not investment advice, clinical recommendations, or a
complete catalog of space biology. Nothing auto-merges into
`dataset.verified.json`.
