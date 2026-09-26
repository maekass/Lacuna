#!/usr/bin/env npx tsx
/**
 * Snapshot Vercel AI Gateway model metadata (pricing, context window, knowledge
 * cutoff) into src/data/ai-models.snapshot.json so cost accounting and model
 * facts stay current instead of drifting against hardcoded constants.
 *
 * Usage: npm run ai:models:sync
 * The directory endpoint is public; never send inference credentials to it.
 *
 * The snapshot is rewritten only when model metadata actually changed, so
 * `fetchedAt` does not churn the file (and the daily workflow) every run.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { z } from "zod";
import modelRoutes from "../src/data/ai-models.routes.json";
import { assessMissingModels } from "./ai-model-sync-policy";
import {
  type CatalogModel,
  type ModelCatalogSnapshot,
  modelCatalogSnapshotSchema,
  type ModelPricing,
  TRACKED_MODEL_IDS,
} from "../src/lib/ai/modelCatalog";

const MODELS_ENDPOINT = "https://ai-gateway.vercel.sh/v1/models";
const OUT_PATH = join(process.cwd(), "src/data/ai-models.snapshot.json");
const ROUTES_PATH = join(process.cwd(), "src/data/ai-models.routes.json");
const REPORT_PATH = join(process.cwd(), "ai-model-sync-diagnostic.json");

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
  const res = await fetch(MODELS_ENDPOINT, {
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
  let gatewayModels: GatewayModel[];
  try {
    gatewayModels = await fetchGatewayModels();
  } catch (error) {
    writeFileSync(
      REPORT_PATH,
      `${
        JSON.stringify(
          {
            classification: "gateway_unavailable",
            error: error instanceof Error ? error.message : String(error),
            snapshotPreserved: true,
            authentication: "not_assessed_public_directory",
          },
          null,
          2,
        )
      }\n`,
    );
    throw error;
  }
  if (gatewayModels.length < TRACKED_MODEL_IDS.length) {
    writeFileSync(
      REPORT_PATH,
      `${
        JSON.stringify(
          {
            classification: "incomplete_directory",
            directoryCount: gatewayModels.length,
            snapshotPreserved: true,
          },
          null,
          2,
        )
      }\n`,
    );
    throw new Error("Gateway directory is incomplete; snapshot preserved.");
  }
  if (
    TRACKED_MODEL_IDS.some((id) =>
      !gatewayModels.some((model) => model.id === id)
    )
  ) {
    try {
      const retry = await fetchGatewayModels();
      if (
        TRACKED_MODEL_IDS.every((id) => retry.some((model) => model.id === id))
      ) {
        gatewayModels = retry;
        writeFileSync(
          REPORT_PATH,
          `${
            JSON.stringify(
              {
                classification: "transient_directory_gap",
                action: "retried_successfully",
                authentication: "not_assessed_public_directory",
              },
              null,
              2,
            )
          }\n`,
        );
        console.warn(
          "Gateway directory gap resolved on retry; continuing sync.",
        );
      }
    } catch { /* The later diagnosis will hold the snapshot. */ }
  }
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

  const previous = readExistingSnapshot();
  if (missing.length > 0) {
    let second: GatewayModel[] = [];
    try {
      second = await fetchGatewayModels();
    } catch { /* Inconclusive: hold the previous snapshot. */ }
    const decisions = assessMissingModels(
      missing,
      gatewayModels,
      second,
      previous?.models ?? [],
    );
    const providerSpecific = missing.every((id) =>
      id.split("/")[0] === missing[0].split("/")[0]
    );
    const replacements = decisions.filter((item) => item.replacement);
    const canMigrate = providerSpecific &&
      missing.every((id) => Object.values(modelRoutes).includes(id)) &&
      replacements.length === missing.length &&
      replacements.every((item) =>
        item.replacement!.split("/")[0] ===
          replacements[0].replacement!.split("/")[0]
      );
    writeFileSync(
      REPORT_PATH,
      `${
        JSON.stringify(
          {
            classification: canMigrate
              ? "confirmed_provider_rename"
              : "directory_gap_requires_review",
            providerSpecific,
            firstDirectoryCount: gatewayModels.length,
            secondDirectoryCount: second.length,
            authentication: "not_assessed_public_directory",
            decisions,
            snapshotPreserved: !canMigrate,
            note:
              "Directory absence alone does not establish deprecation or runtime availability.",
          },
          null,
          2,
        )
      }\n`,
    );
    if (!canMigrate) {
      console.error(
        "Model directory inconclusive; see ai-model-sync-diagnostic.json",
      );
      process.exitCode = 1;
      return;
    }
    const migrations = new Map(
      replacements.map((item) => [item.id, item.replacement!]),
    );
    const routes = Object.fromEntries(
      Object.entries(modelRoutes).map(([key, id]) => [
        key,
        migrations.get(id) ?? id,
      ]),
    );
    // Only rewrite the routing manifest and snapshot; a PR review controls deployment.
    writeFileSync(ROUTES_PATH, `${JSON.stringify(routes, null, 2)}\n`);
    for (const id of missing) {
      models.push(toCatalogModel(byId.get(migrations.get(id)!)!));
    }
    console.log(
      `Confirmed provider rename: ${
        [...migrations].map(([a, b]) => `${a} -> ${b}`).join(", ")
      }`,
    );
  }
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
