import { describe, expect, it } from "vitest";
import { assessMissingModels } from "../../scripts/ai-model-sync-policy";

const previous = [{
  id: "xai/grok-4.3",
  name: "Grok 4.3",
  contextWindow: 1_000_000,
  pricing: { inputPerMillionTokens: 1.25, outputPerMillionTokens: 2.5 },
}];
const renamed = [{
  id: "spacexai/grok-4.3",
  name: "Grok 4.3",
  context_window: 1_000_000,
  pricing: { input: "0.00000125", output: "0.0000025" },
}];

describe("gateway model drift policy", () => {
  it("confirms a unique provider rename across two matching reads", () => {
    expect(assessMissingModels([previous[0].id], renamed, renamed, previous)[0])
      .toMatchObject({
        classification: "provider_rename",
        replacement: renamed[0].id,
      });
  });

  it("preserves the old route when the public read differs", () => {
    const decision =
      assessMissingModels([previous[0].id], renamed, [], previous)[0];
    expect(decision.classification).toBe("provider_gap");
    expect(decision.replacement).toBeUndefined();
  });

  it("does not infer a rename from a changed price or a duplicate slug", () => {
    const changed = {
      ...renamed[0],
      pricing: { input: "0.000009", output: "0.0000025" },
    };
    expect(
      assessMissingModels([previous[0].id], [changed], [changed], previous)[0]
        .replacement,
    )
      .toBeUndefined();
    expect(
      assessMissingModels(
        [previous[0].id],
        [renamed[0], { ...renamed[0], id: "other/grok-4.3" }],
        renamed,
        previous,
      )[0].replacement,
    )
      .toBeUndefined();
  });

  it("labels an absent model as possible deprecation, not proven deprecation", () => {
    expect(
      assessMissingModels([previous[0].id], [], [], previous)[0].classification,
    )
      .toBe("possible_deprecation");
  });
});
