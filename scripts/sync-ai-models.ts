#!/usr/bin/env npx tsx
/**
 * Snapshot Vercel AI Gateway model metadata (pricing, context window, knowledge
 * cutoff) into src/data/ai-models.snapshot.json so cost accounting and model
 * facts stay current instead of drifting against hardcoded constants.
 *
 * Usage: npm run ai:models:sync
 * Auth is optional — the directory endpoint answers unauthenticated; the key is
 * used when present so the request is attributed to the team.
 *
 * The snapshot is rewritten only when model metadata actually changed, so
 * `fetchedAt` does not churn the file (and the daily workflow) every run.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { z } from "zod";
import {
  type CatalogModel,
  type ModelCatalogSnapshot,
  modelCatalogSnapshotSchema,
  type ModelPricing,
  TRACKED_MODEL_IDS,
} from "../src/lib/ai/modelCatalog";

const MODELS_ENDPOINT = "https://ai-gateway.vercel.sh/v1/models";
const OUT_PATH = join(process.cwd(), "src/data/ai-models.snapshot.json");

/** Gateway prices are per-token decimal strings. */
const priceSchema = z.coerce.number().nonnegative();

const gatewayModelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  context_window: z.number().optional(),
  max_tokens: z.number().optional(),
  knowledge: z.string().optional(),
  pricing: z.object({
    input: priceSchema.optional(),
    output: priceSchema.optional(),
    input_cache_read: priceSchema.optional(),
  }).optional(),
});

const gatewayResponseSchema = z.object({
  data: z.array(gatewayModelSchema),
});

type GatewayModel = z.infer<typeof gatewayModelSchema>;

const PER_MILLION = 1_000_000;

function toPricing(model: GatewayModel): ModelPricing | null {
  const pricing = model.pricing;
  if (!pricing || pricing.input === undefined || pricing.output === undefined) {
    return null;
  }
  const cacheRead = pricing.input_cache_read;
  return {
    inputPerMillionTokens: pricing.input * PER_MILLION,
    outputPerMillionTokens: pricing.output * PER_MILLION,
    ...(cacheRead === undefined
      ? {}
      : { cachedInputPerMillionTokens: cacheRead * PER_MILLION }),
  };
}

function toCatalogModel(model: GatewayModel): CatalogModel {
  return {
    id: model.id,
    name: model.name ?? model.id,
    knowledgeCutoff: model.knowledge ?? null,
    contextWindow: model.context_window ?? null,
    maxOutputTokens: model.max_tokens ?? null,
    pricing: toPricing(model),
  };
}

async function fetchGatewayModels(): Promise<GatewayModel[]> {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const res = await fetch(MODELS_ENDPOINT, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`${MODELS_ENDPOINT} responded ${res.status}`);
  }
  return gatewayResponseSchema.parse(await res.json()).data;
}

function readExistingSnapshot(): ModelCatalogSnapshot | null {
  if (!existsSync(OUT_PATH)) return null;
  const parsed = modelCatalogSnapshotSchema.safeParse(
    JSON.parse(readFileSync(OUT_PATH, "utf8")),
  );
  return parsed.success ? parsed.data : null;
}

async function main() {
  const gatewayModels = await fetchGatewayModels();
  const byId = new Map(gatewayModels.map((model) => [model.id, model]));

  const models: CatalogModel[] = [];
  const missing: string[] = [];
  for (const id of TRACKED_MODEL_IDS) {
    const model = byId.get(id);
    if (!model) {
      missing.push(id);
      continue;
    }
    const catalogModel = toCatalogModel(model);
    models.push(catalogModel);
    console.log(
      `[ok] ${id} · knowledge=${catalogModel.knowledgeCutoff ?? "n/a"} · in=$${
        catalogModel.pricing?.inputPerMillionTokens ?? "n/a"
      }/M out=$${catalogModel.pricing?.outputPerMillionTokens ?? "n/a"}/M`,
    );
  }

  if (missing.length > 0) {
    console.error(
      `${missing.length} tracked model(s) absent from the gateway directory: ${
        missing.join(", ")
      }`,
    );
    process.exitCode = 1;
    return;
  }

  const previous = readExistingSnapshot();
  if (
    previous?.source === MODELS_ENDPOINT &&
    JSON.stringify(previous.models) === JSON.stringify(models)
  ) {
    console.log(
      `Model metadata unchanged since ${previous.fetchedAt}; snapshot left as is.`,
    );
    return;
  }

  const snapshot: ModelCatalogSnapshot = {
    fetchedAt: new Date().toISOString(),
    source: MODELS_ENDPOINT,
    models,
  };
  writeFileSync(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH} (${models.length} models)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
