/**
 * FAKE MODEL — UNIT TESTS ONLY.
 *
 * A deterministic stand-in for the evidence-ask generator so the lift runner,
 * scorers, and report can be exercised without a provider. It does not
 * resemble a real model's accuracy and its output must never be reported as
 * a measurement. Records produced with it carry `fake: true`, which
 * `buildLiftReport` rejects unless `allowFake` is set.
 */
import type {
  EvidenceDraftGeneration,
  EvidenceDraftGenerator,
} from "@/lib/ai/rag/answer";
import type { EvidencePassage } from "@/lib/ai/rag/contracts";
import type { LiftEvalItem } from "@/lib/ai/evals/lift";

export const FAKE_MODEL_ID = "fake-model-unit-tests-only";

function generation(
  draft: EvidenceDraftGeneration["draft"],
): EvidenceDraftGeneration {
  return {
    draft,
    modelId: FAKE_MODEL_ID,
    estimatedCostUsd: 0,
    inputTokens: 10,
    outputTokens: 5,
  };
}

/**
 * Retrieval prompts: cite the first allowed passage and copy its structured
 * value, or abstain when that value is missing. Closed-book prompts: abstain.
 */
export const fakeEvidenceGenerator: EvidenceDraftGenerator = (input) => {
  const allowed = input.prompt.match(/Allowed passageIds: ([^\n]*)/)?.[1]
    ?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const first = allowed[0];
  if (!first) {
    return Promise.resolve(generation({
      disposition: "abstain",
      answer: "Unknown.",
      claims: [],
      limitations: [],
      conflicts: [],
      abstentionReason: "Fake model abstains without passages.",
    }));
  }
  const block = input.prompt.split(`id="${first}">`)[1] ?? "";
  const match = block.match(
    /Structured record: metric (\w+), value ([^,\s]+?)(?:[,.]?\s|[,.]?$)/,
  );
  const metric = match?.[1];
  const value = match?.[2];
  if (!value || value === "missing") {
    return Promise.resolve(generation({
      disposition: "abstain",
      answer: "Not stated.",
      claims: [],
      limitations: [],
      conflicts: [],
      abstentionReason: "Fake model found no value.",
    }));
  }
  const stated = metric === "deal_value_usd_millions"
    ? `$${value} million`
    : value;
  return Promise.resolve(generation({
    disposition: "qualified_answer",
    answer: `The record states ${stated}.`,
    claims: [{
      id: "c1",
      text: `The record states ${stated}.`,
      passageIds: [first],
    }],
    limitations: [],
    conflicts: [],
  }));
};

/** Always throws, to exercise error recording. */
export const failingGenerator: EvidenceDraftGenerator = () =>
  Promise.reject(new Error("fake provider outage"));

/**
 * Oracle generator (UNIT TESTS ONLY): answers each answerable item with its
 * gold value, cites its gold passage, and abstains otherwise. It proves the
 * app's verifier and quality gate do not structurally cap the retrieval arm;
 * it is not a measurement of any model.
 */
export function oracleGenerator(
  items: readonly LiftEvalItem[],
  corpus: readonly EvidencePassage[],
): EvidenceDraftGenerator {
  const byQuestion = new Map(items.map((item) => [item.question, item]));
  const byId = new Map(corpus.map((passage) => [passage.passageId, passage]));
  return (input) => {
    const question = input.prompt.match(/Question: ([\s\S]*)$/)?.[1]?.trim();
    const item = question ? byQuestion.get(question) : undefined;
    const passageId = item?.goldPassageIds[0];
    const record = passageId ? byId.get(passageId)?.record : undefined;
    if (!item || item.type !== "answerable" || !passageId) {
      return Promise.resolve(generation({
        disposition: "abstain",
        answer: "Not stated.",
        claims: [],
        limitations: [],
        conflicts: [],
        abstentionReason: "Oracle abstains on should-abstain items.",
      }));
    }
    const stated = item.gold.kind === "usd_millions"
      ? `$${item.gold.value} million`
      : String(item.gold.value);
    return Promise.resolve(generation({
      disposition: "qualified_answer",
      answer: `Answer: ${stated}.`,
      claims: [{
        id: "c1",
        text: `Answer: ${stated}.`,
        passageIds: [passageId],
        ...(record && item.gold.kind !== "entity"
          ? {
            record: {
              metric: record.metric,
              value: record.value,
              comparator: "eq" as const,
              ...(record.unit ? { unit: record.unit } : {}),
            },
          }
          : {}),
      }],
      limitations: [],
      conflicts: [],
    }));
  };
}
