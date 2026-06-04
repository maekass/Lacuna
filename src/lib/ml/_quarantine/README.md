# Quarantined code — not part of the product

## `ensemblePredictor.ts`

Legacy TensorFlow.js demo: untrained layers blended with hand-tuned logistic heuristics. **Not validated.** Not imported by the Next.js app or API routes.

Kept only so Vitest can guard against accidental resurrection. Do not move back into `src/lib/ml/` until there is a trained artifact, evaluation harness, and [MODEL_CARD.md](../../../docs/MODEL_CARD.md) update.

User-facing scores use deterministic heuristics; server LLM calls use [docs/INFERENCE.md](../../../docs/INFERENCE.md).
