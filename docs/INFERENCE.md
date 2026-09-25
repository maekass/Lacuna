# Server-side inference

Lacuna has **one** server-side inference path for LLM calls: the **Vercel AI
Gateway** (via the AI SDK `generateText`), with a direct OpenAI fallback for
local dev only.

## What uses inference

| Feature                        | Route / module                                     | Model (gateway slug)        | Fallback                           |
| ------------------------------ | -------------------------------------------------- | --------------------------- | ---------------------------------- |
| Optional UI narrative blurbs   | `POST /api/ai/insights` → `src/lib/ai/insights.ts` | `anthropic/claude-sonnet-4` | `gpt-4o-mini` via `@ai-sdk/openai` |
| Space WH gap analyst           | `POST /api/research/space-wh-pipeline/ask`         | `spacexai/grok-4.3`        | `gpt-4o-mini` or deterministic     |
| Domestic study discovery       | `POST /api/research/studies/discover`              | `spacexai/grok-4.5`        | deterministic NIH/CT.gov parse     |
| SEC deal classification (cron) | `dealClassificationEngine.ts`                      | `openai/gpt-5.6-terra`     | keyword-only                       |

The daily model-directory sync reads the public Vercel directory without sending
an inference credential. It retries an absent ID, then compares any unique
same-slug provider replacement against the previous model name, context window,
and input/output prices on two directory reads. A confirmed provider-prefix
change updates `src/data/ai-models.routes.json` and the pricing snapshot in a
reviewable PR. Unresolved absences preserve the previous snapshot and emit the
sanitized `ai-model-sync-diagnostic` Actions artifact. A successful retry is a
warning, while a persistent or ambiguous gap fails the job for review.
Directory presence does not establish runtime availability or account-specific
authorization; investigate inference failures separately before declaring an
upstream deprecation or changing fallback behavior.

## What is **not** inference

- **ExitPredictor**, similarity, clustering, valuation matrix — deterministic
  heuristics on `dataset.verified.json` (see [MODEL_CARD.md](./MODEL_CARD.md)).
- **TensorFlow “ensemble”** — removed. It was an untrained TF.js stub predicting
  trial-phase success (`TrialFeatures` → `successProbability`), never fitted,
  and already superseded by `ml/clinical_trials/`.
- **Public methods UI** — `/methods` shows record-quality grades, sector counts,
  and announcement-year counts from the verified dataset. Causal DAGs, Bayesian
  small-n dashboards, and sensitivity sliders are not mounted. Library helpers
  under `src/lib/causal/` are not a published result. The deals page does not
  publish a log-rank test on time-to-announcement curves.

## Clinical-trial scores

Offline sklearn artifacts may exist for CI. `publishMetrics` is false and
`trainingSource` is `synthetic_seed`. The public trial tracker withholds model
percentages unless `areClinicalTrialMlScoresReleased()` is true, and the
research note does not render hold-out ROC-AUC, accuracy, or training size. Live
ClinicalTrials.gov fields (phase, status, enrollment, sponsor) stay.

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
