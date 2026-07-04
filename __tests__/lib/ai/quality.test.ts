import { describe, expect, it } from "vitest";
import { assessLlmOutput, checkGrounding } from "@/lib/ai/quality";

describe("llm quality gate", () => {
  it("scores clean grounded text as high", () => {
    const { text, quality } = assessLlmOutput(
      "Acme shows moderate strategic fit with BuyerCo based on the provided match score.",
      {
        feature: "ui-insights",
        modelId: "test",
        groundingContext: "Acme BuyerCo match score 80",
        requiredTerms: ["Acme"],
      },
    );
    expect(text).toContain("Acme");
    expect(quality.level).toBe("high");
    expect(quality.flags.adviceRisk).toBe(false);
    expect(quality.flags.groundingOk).toBe(true);
  });

  it("blocks investment advice", () => {
    const { text, quality } = assessLlmOutput(
      "You should buy shares of this company immediately for guaranteed return.",
      {
        feature: "ui-insights",
        modelId: "test",
        groundingContext: "company metrics",
      },
    );
    expect(quality.level).toBe("blocked");
    expect(quality.flags.adviceRisk).toBe(true);
    expect(text).toContain("withheld");
  });

  it("flags ungrounded dollar amounts", () => {
    const grounding = checkGrounding(
      "The deal closed at $500 million last year.",
      "company name only no money",
    );
    expect(grounding.ok).toBe(false);
    expect(grounding.missing.length).toBeGreaterThan(0);
  });

  it("accepts money present in context", () => {
    const grounding = checkGrounding(
      "Estimated value is $100M in the model.",
      "estimatedValue 100 $100M",
    );
    expect(grounding.ok).toBe(true);
  });
});
