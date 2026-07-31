/**
 * Model metadata catalog — pricing, context window, and knowledge cutoff read
 * from a snapshot of the Vercel AI Gateway model directory rather than
 * hardcoded constants that silently go stale.
 *
 * Refresh snapshot: `npm run ai:models:sync` (daily via `.github/workflows/ai-models-sync.yml`)
 */

import { z } from "zod";
import snapshot from "@/data/ai-models.snapshot.json";

export const modelPricingSchema = z.object({
  /** USD per 1M input tokens. */
  inputPerMillionTokens: z.number().positive(),
  /** USD per 1M output tokens. */
  outputPerMillionTokens: z.number().positive(),
  /** USD per 1M cached input tokens, when the provider publishes one. */
  cachedInputPerMillionTokens: z.number().nonnegative().optional(),
});

export const catalogModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Provider-declared training knowledge cutoff (ISO date), when published. */
  knowledgeCutoff: z.string().nullable(),
  contextWindow: z.number().positive().nullable(),
  maxOutputTokens: z.number().positive().nullable(),
  pricing: modelPricingSchema.nullable(),
});

export const modelCatalogSnapshotSchema = z.object({
  /** ISO timestamp of the last sync that changed model metadata. */
  fetchedAt: z.iso.datetime(),
  source: z.url(),
  models: z.array(catalogModelSchema).nonempty(),
});

export type ModelPricing = z.infer<typeof modelPricingSchema>;
export type CatalogModel = z.infer<typeof catalogModelSchema>;
export type ModelCatalogSnapshot = z.infer<typeof modelCatalogSnapshotSchema>;

/**
 * Gateway slugs whose metadata the sync script tracks. Kept as literals so the
 * script stays importable without pulling in the Next.js inference runtime;
 * `__tests__/lib/ai/modelCatalog.test.ts` asserts it stays in sync with the
 * model constants in {@link file://./inference.ts}.
 */
export const TRACKED_MODEL_IDS = [
  "anthropic/claude-sonnet-4",
  "openai/gpt-4o-mini",
  "openai/gpt-5.4-mini",
  "xai/grok-4.3",
  "xai/grok-4.5",
] as const;

/** Parsed rather than cast: a truncated or malformed snapshot fails loudly. */
const catalog = modelCatalogSnapshotSchema.parse(snapshot);

/** ISO timestamp of the snapshot currently compiled into the app. */
export const MODEL_CATALOG_FETCHED_AT = catalog.fetchedAt;

export function listCatalogModels(): CatalogModel[] {
  return catalog.models;
}

function bareId(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash === -1 ? modelId : modelId.slice(slash + 1);
}

/**
 * Resolve a model by exact gateway slug, falling back to the bare model name so
 * direct-provider ids (`gpt-4o-mini`) match their gateway slug
 * (`openai/gpt-4o-mini`).
 */
export function findCatalogModel(modelId: string): CatalogModel | null {
  const id = modelId.toLowerCase();
  const exact = catalog.models.find((model) => model.id.toLowerCase() === id);
  if (exact) return exact;
  const bare = bareId(id);
  return catalog.models.find((model) =>
    bareId(model.id.toLowerCase()) === bare
  ) ??
    null;
}

/** Published pricing for a model, or null when it is not in the snapshot. */
export function getModelPricing(modelId: string): ModelPricing | null {
  return findCatalogModel(modelId)?.pricing ?? null;
}

/** Provider-declared knowledge cutoff, or null when not in the snapshot. */
export function getModelKnowledgeCutoff(modelId: string): string | null {
  return findCatalogModel(modelId)?.knowledgeCutoff ?? null;
}
