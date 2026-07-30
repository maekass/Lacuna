import { describe, expect, it } from "vitest";
import {
  findCatalogModel,
  getModelKnowledgeCutoff,
  getModelPricing,
  listCatalogModels,
  MODEL_CATALOG_FETCHED_AT,
  TRACKED_MODEL_IDS,
} from "@/lib/ai/modelCatalog";
import {
  CLASSIFICATION_GATEWAY_MODEL,
  EMPOWERMENT_GAP_GATEWAY_MODEL,
  estimateLlmCostUsd,
  FALLBACK_MODEL_PRICING,
  INSIGHTS_GATEWAY_MODEL,
  SPACE_WH_GAP_GATEWAY_MODEL,
  STUDY_DISCOVERY_GATEWAY_MODEL,
} from "@/lib/ai/inference";

const ISO_DATE = /^\d{4}-\d{2}(-\d{2})?$/;

describe("model catalog snapshot", () => {
  it("covers every gateway model the app can resolve", () => {
    const tracked = new Set<string>(TRACKED_MODEL_IDS);
    for (
      const gatewayModel of [
        INSIGHTS_GATEWAY_MODEL,
        SPACE_WH_GAP_GATEWAY_MODEL,
        EMPOWERMENT_GAP_GATEWAY_MODEL,
        STUDY_DISCOVERY_GATEWAY_MODEL,
        CLASSIFICATION_GATEWAY_MODEL,
      ]
    ) {
      expect(tracked).toContain(gatewayModel);
      expect(findCatalogModel(gatewayModel)).not.toBeNull();
    }
  });

  it("carries a sync timestamp and complete pricing per model", () => {
    expect(Number.isNaN(Date.parse(MODEL_CATALOG_FETCHED_AT))).toBe(false);
    const models = listCatalogModels();
    expect(models).toHaveLength(TRACKED_MODEL_IDS.length);
    for (const model of models) {
      expect(model.pricing?.inputPerMillionTokens).toBeGreaterThan(0);
      expect(model.pricing?.outputPerMillionTokens).toBeGreaterThan(0);
      expect(model.contextWindow).toBeGreaterThan(0);
      if (model.knowledgeCutoff !== null) {
        expect(model.knowledgeCutoff).toMatch(ISO_DATE);
      }
    }
  });

  it("resolves direct-provider ids to their gateway slug", () => {
    expect(findCatalogModel("gpt-4o-mini")?.id).toBe("openai/gpt-4o-mini");
    expect(getModelKnowledgeCutoff("gpt-4o-mini")).toBe(
      getModelKnowledgeCutoff("openai/gpt-4o-mini"),
    );
  });

  it("returns null for models outside the snapshot", () => {
    expect(getModelPricing("acme/not-a-model")).toBeNull();
  });
});

describe("estimateLlmCostUsd", () => {
  it("prices from the snapshot rather than hardcoded rates", () => {
    const pricing = getModelPricing(CLASSIFICATION_GATEWAY_MODEL);
    expect(pricing).not.toBeNull();
    const expected = pricing!.inputPerMillionTokens +
      pricing!.outputPerMillionTokens;
    expect(estimateLlmCostUsd(CLASSIFICATION_GATEWAY_MODEL, 1e6, 1e6))
      .toBeCloseTo(
        expected,
        10,
      );
  });

  it("falls back for unknown models and stays free for mocks", () => {
    expect(estimateLlmCostUsd("acme/not-a-model", 1e6, 0)).toBeCloseTo(
      FALLBACK_MODEL_PRICING.inputPerMillionTokens,
      10,
    );
    expect(estimateLlmCostUsd("mock", 1e6, 1e6)).toBe(0);
  });
});
