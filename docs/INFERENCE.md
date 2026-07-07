# Server-side inference

Lacuna has **one** server-side inference path for LLM calls: the **Vercel AI
Gateway** (via the AI SDK `generateText`), with a direct OpenAI fallback for
local dev only.

## What uses inference

| Feature                        | Route / module                                     | Model (gateway slug)        | Fallback                           |
| ------------------------------ | -------------------------------------------------- | --------------------------- | ---------------------------------- |
| Optional UI narrative blurbs   | `POST /api/ai/insights` → `src/lib/ai/insights.ts` | `anthropic/claude-sonnet-4` | `gpt-4o-mini` via `@ai-sdk/openai` |
| Space WH gap analyst           | `POST /api/research/space-wh-pipeline/ask`         | `xai/grok-4.3`              | `gpt-4o-mini` or deterministic     |
| SEC deal classification (cron) | `dealClassificationEngine.ts`                      | `openai/gpt-5.4-mini`       | keyword-only                       |

## What is **not** inference

- **ExitPredictor**, similarity, clustering, valuation matrix — deterministic
  heuristics on `dataset.verified.json` (see [MODEL_CARD.md](./MODEL_CARD.md)).
- **TensorFlow “ensemble”** — quarantined under `src/lib/ml/_quarantine/`
  (untrained demo; not imported by the app).

## Environment

| Variable             | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `VERCEL_OIDC_TOKEN`  | Gateway auth on Vercel (`vercel env pull`) |
| `AI_GATEWAY_API_KEY` | Gateway auth in CI / local                 |
| `OPENAI_API_KEY`     | Direct OpenAI when gateway auth is absent  |

**Do not** call `api.anthropic.com` directly from app code — use gateway slugs.

## Precision prompting & quality gate

All prompts are centralized in `src/lib/ai/prompts.ts` (version `2.0.0`). All
**user-facing free-text** inference goes through `generateQualifiedInference()`
in `src/lib/ai/quality.ts`.

### Design principles

| Principle                 | Implementation                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Versioned templates**   | `PROMPT_VERSION` tag — bump on semantic changes                                                                    |
| **Pure functions**        | Every `build*Prompt()` is `input → string`, deterministic and testable                                             |
| **Composable guardrails** | `ANTI_HALLUCINATION_GUARD`, `EDUCATIONAL_DISCLAIMER`, `OUTPUT_FORMAT_CONSTRAINT` — appended to every system prompt |
| **Quality gate**          | `assessLlmOutput()` — sanitize, advice/hallucination flags, grounding, score, block                                |
| **Template validation**   | `validatePromptTemplate()` checks for unresolved variables, empty sections, length bounds                          |
| **UI badge**              | `LlmQualityBadge` shows level, score, model, prompt version                                                        |

### Constraint layers

```
User input → build*Prompt() → system prompt + guardrails → LLM
  → assessLlmOutput() / generateQualifiedInference()
  → { text, quality } → UI (LlmQualityBadge)
```

1. **Pre-inference**: Template functions enforce structure; prompt validation
2. **System prompt**: Every call includes `ANTI_HALLUCINATION_GUARD` +
   disclaimer
3. **Post-inference quality gate**:
   - Markdown strip + length limits (`sanitizeLLMOutput`)
   - Hallucination-risk patterns (FDA claims, invented deal dates, etc.)
   - Investment / clinical **advice** patterns → **blocked**
   - Grounding: `$` amounts and NCT IDs must appear in provided context
   - Score 0–100 and level: `high` | `medium` | `low` | `blocked`

### Catalog

`GET /api/ai/quality` lists features, standards, and whether inference is
configured.

| Feature            | Route                                      | Quality-gated                        |
| ------------------ | ------------------------------------------ | ------------------------------------ |
| UI insights        | `POST /api/ai/insights`                    | Yes                                  |
| Space WH gap       | `POST /api/research/space-wh-pipeline/ask` | Yes                                  |
| Stream insights    | `POST /api/ai/stream`                      | No (tagged `quality:stream-ungated`) |
| SEC classification | cron / CLI                                 | Structured output (separate path)    |

Prefer **non-streaming** routes for production UI narratives.

### Adding a new LLM feature

1. Add prompt templates in `src/lib/ai/prompts.ts` as pure functions.
2. Add the system prompt with all guardrails composed in.
3. Call **`generateQualifiedInference()`** (not bare `generateInferenceText`).
4. Pass `groundingContext` (and optional `requiredTerms`).
5. Return `{ content, quality, modelId }` from the API.
6. Render `LlmQualityBadge` in the UI.
7. Document the model slug and fallback here.
8. Add tests in `__tests__/lib/ai/quality.test.ts` and prompts tests.
