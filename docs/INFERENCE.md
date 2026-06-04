# Server-side inference

Lacuna has **one** server-side inference path for LLM calls: the **Vercel AI Gateway** (via the AI SDK `generateText`), with a direct OpenAI fallback for local dev only.

## What uses inference

| Feature | Route / module | Model (gateway slug) | Fallback |
|---------|----------------|----------------------|----------|
| Optional UI narrative blurbs | `POST /api/ai/insights` → `src/lib/ai/insights.ts` | `anthropic/claude-sonnet-4` | `gpt-4o-mini` via `@ai-sdk/openai` |
| SEC deal classification (cron) | `dealClassificationEngine.ts` | `openai/gpt-5.4-mini` | keyword-only |

## What is **not** inference

- **ExitPredictor**, similarity, clustering, valuation matrix — deterministic heuristics on `dataset.verified.json` (see [MODEL_CARD.md](./MODEL_CARD.md)).
- **TensorFlow “ensemble”** — quarantined under `src/lib/ml/_quarantine/` (untrained demo; not imported by the app).

## Environment

| Variable | Purpose |
|----------|---------|
| `VERCEL_OIDC_TOKEN` | Gateway auth on Vercel (`vercel env pull`) |
| `AI_GATEWAY_API_KEY` | Gateway auth in CI / local |
| `OPENAI_API_KEY` | Direct OpenAI when gateway auth is absent |

**Do not** call `api.anthropic.com` directly from app code — use gateway slugs.

## Adding a new LLM feature

1. Add prompts in `src/lib/ai/`.
2. Call `generateInferenceText()` from `src/lib/ai/inference.ts`.
3. Tag requests: `providerOptions.gateway.tags` (e.g. `feature:my-feature`).
4. Document the model slug and fallback here.
