# Server-side inference

Lacuna has **one** server-side inference path for LLM calls: the **Vercel AI
Gateway** (via the AI SDK `generateText`), with a direct OpenAI fallback for
local dev only.

## What uses inference

| Feature                        | Route / module                                     | Model (gateway slug)        | Fallback                           |
| ------------------------------ | -------------------------------------------------- | --------------------------- | ---------------------------------- |
| Optional UI narrative blurbs   | `POST /api/ai/insights` → `src/lib/ai/insights.ts` | `anthropic/claude-sonnet-4` | `gpt-4o-mini` via `@ai-sdk/openai` |
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

## Precision prompting & constraint engineering

All prompts are centralized in `src/lib/ai/prompts.ts` (version `2.0.0`).

### Design principles

| Principle | Implementation |
| --------- | -------------- |
| **Versioned templates** | `PROMPT_VERSION` tag — bump on semantic changes |
| **Pure functions** | Every `build*Prompt()` is `input → string`, deterministic and testable |
| **Composable guardrails** | `ANTI_HALLUCINATION_GUARD`, `EDUCATIONAL_DISCLAIMER`, `OUTPUT_FORMAT_CONSTRAINT` — appended to every system prompt |
| **Output sanitization** | `sanitizeLLMOutput()` strips markdown, detects hallucination patterns, enforces length limits |
| **Template validation** | `validatePromptTemplate()` checks for unresolved variables, empty sections, length bounds |

### Constraint layers

```
User input → build*Prompt() → system prompt + guardrails → LLM → sanitizeLLMOutput() → UI
                                                              ↓
                                                        validatePromptTemplate()
```

1. **Pre-inference**: Template functions enforce structure (DATA/TASK sections, no raw string interpolation)
2. **System prompt**: Every call includes `ANTI_HALLUCINATION_GUARD` + `EDUCATIONAL_DISCLAIMER`
3. **Post-inference**: `sanitizeLLMOutput()` strips formatting, flags suspicious claims, truncates long output

### Hallucination detection

`sanitizeLLMOutput()` checks for patterns the LLM should not produce given our constrained prompts:
- Dollar amounts and specific deal values
- FDA approval/clearance claims
- Percentage growth/decline figures
- Specific dates for announced/closed deals
- Phase 4+ or pivotal trial claims

### Adding a new LLM feature

1. Add prompt templates in `src/lib/ai/prompts.ts` as pure functions.
2. Add the system prompt with all guardrails composed in.
3. Call `generateInferenceText()` from `src/lib/ai/inference.ts`.
4. Apply `sanitizeLLMOutput()` on the raw response.
5. Tag requests: `providerOptions.gateway.tags` (e.g. `feature:my-feature`).
6. Document the model slug and fallback here.
7. Add tests in `__tests__/lib/ai/prompts.test.ts`.
