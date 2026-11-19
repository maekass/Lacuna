import { describe, expect, it } from "vitest";
import reviewedRetirementsFile from "../../src/data/ai-models.reviewed-retirements.json";
import {
  assessMissingModels,
  directoryGapExitCode,
  reviewedRetirementsSchema,
} from "../../scripts/ai-model-sync-policy";

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

describe("reviewed model retirements", () => {
  const recorded = reviewedRetirementsSchema.parse(reviewedRetirementsFile);
  const sonnet = recorded.find((item) =>
    item.id === "anthropic/claude-sonnet-4"
  );

  it("passes the recorded Sonnet 4 retirement when its replacement is listed", () => {
    expect(sonnet?.replacement).toBe("anthropic/claude-sonnet-4.5");
    expect(directoryGapExitCode(
      ["anthropic/claude-sonnet-4"],
      recorded,
      new Set([sonnet!.replacement]),
    )).toBe(0);
  });

  it("still exits non-zero when the replacement is not in the directory", () => {
    expect(directoryGapExitCode(
      ["anthropic/claude-sonnet-4"],
      recorded,
      new Set<string>(),
    )).not.toBe(0);
  });

  it("still exits non-zero when a reviewed gap is mixed with an unreviewed one", () => {
    expect(directoryGapExitCode(
      ["anthropic/claude-sonnet-4", "anthropic/claude-missing"],
      recorded,
      new Set([sonnet!.replacement]),
    )).not.toBe(0);
  });
});
