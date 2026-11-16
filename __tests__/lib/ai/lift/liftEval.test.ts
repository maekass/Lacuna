import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import { runEvidenceAsk } from "@/lib/ai/rag/answer";
import { EVIDENCE_RAG_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  answerMatchesGold,
  bootstrapPairedDifference,
  bootstrapProportion,
  buildLiftEvalSet,
  buildLiftReport,
  buildVerifiedDatasetCorpus,
  checkFrozenLiftEvalSet,
  citationIsCorrect,
  dealPassageId,
  evaluateLiftGate,
  extractValues,
  hashLiftItems,
  LIFT_PROMPTS,
  LIFT_RESPONSE_SCHEMA,
  type LiftEvalItem,
  liftEvalSetSchema,
  type LiftGateThresholds,
  type LiftReport,
  type LiftResponseRecord,
  mentionsEntity,
  metricIndicator,
  renderLiftReportMarkdown,
  runLiftCell,
  scoreResponse,
} from "@/lib/ai/evals/lift";
import {
  failingGenerator,
  FAKE_MODEL_ID,
  fakeEvidenceGenerator,
  oracleGenerator,
} from "./fakeModel";

const ROOT = path.resolve(__dirname, "../../../..");
const FIXTURES = path.join(ROOT, "src/lib/ai/evals/fixtures");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as T;
}

const dataset = getStaticVerifiedDataset();
const corpus = buildVerifiedDatasetCorpus(dataset);
const corpusById = new Map(
  corpus.map((passage) => [passage.passageId, passage]),
);
const frozen = liftEvalSetSchema.parse(readJson("lift-eval-set.v1.json"));

function response(
  overrides: Partial<LiftResponseRecord> & Pick<LiftResponseRecord, "itemId">,
): LiftResponseRecord {
  return {
    schema: LIFT_RESPONSE_SCHEMA,
    arm: "retrieval",
    promptVersion: "v1",
    modelId: "test",
    disposition: "qualified_answer",
    answer: "",
    claimTexts: [],
    citedIds: [],
    retrievedIds: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    latencyMs: 0,
    ...overrides,
  };
}

// deal1: Teladoc / Livongo Health, $13900M, announced 2020-08-05.
const deal1 = dataset.acquisitions.find((deal) => deal.id === "deal1");
const valueItem = frozen.items.find((candidate) =>
  candidate.template === "deal_value"
) as LiftEvalItem;
const valueDealId = valueItem.goldRecordIds[0];
const valueDeal = dataset.acquisitions.find((deal) => deal.id === valueDealId);
const goldValue = valueItem.gold.value as number;
const goldPassage = dealPassageId(valueDealId, "value");
const otherPassage = dealPassageId(valueDealId, "announcement");
const retrieved = [goldPassage, otherPassage, dealPassageId("deal1", "value")];

describe("lift eval set", () => {
  it("is frozen: hash intact and every gold value copied from the dataset", () => {
    expect(checkFrozenLiftEvalSet(frozen, dataset)).toEqual([]);
    expect(hashLiftItems(frozen.items)).toBe(frozen.itemsSha256);
  });

  it("has 100–200 items with 20–30% should-abstain", () => {
    const total = frozen.items.length;
    const abstain =
      frozen.items.filter((entry) => entry.type === "should_abstain").length;
    expect(total).toBeGreaterThanOrEqual(100);
    expect(total).toBeLessThanOrEqual(200);
    expect(abstain / total).toBeGreaterThanOrEqual(0.2);
    expect(abstain / total).toBeLessThanOrEqual(0.3);
    expect(new Set(frozen.items.map((entry) => entry.id)).size).toBe(total);
  });

  it("builds deterministically", () => {
    expect(buildLiftEvalSet(dataset).itemsSha256).toBe(
      buildLiftEvalSet(dataset).itemsSha256,
    );
  });

  it("detects tampered gold values and hashes", () => {
    const tampered = structuredClone(frozen);
    const target = tampered.items.find((entry) =>
      entry.template === "deal_value"
    ) as LiftEvalItem;
    target.gold.value = (target.gold.value as number) + 1;
    const problems = checkFrozenLiftEvalSet(tampered, dataset);
    expect(problems.some((problem) => problem.includes("itemsSha256"))).toBe(
      true,
    );
    expect(problems.some((problem) => problem.includes(target.id))).toBe(true);
  });

  it("gives answerable items a gold passage that exists in the corpus", () => {
    for (const entry of frozen.items) {
      if (entry.type !== "answerable") continue;
      expect(entry.goldPassageIds.length).toBeGreaterThan(0);
      for (const id of entry.goldPassageIds) {
        expect(corpusById.has(id)).toBe(true);
      }
    }
  });
});

describe("verified-dataset corpus", () => {
  it("restates record values and marks missing values as missing", () => {
    const value = corpusById.get(dealPassageId("deal1", "value"));
    expect(value?.text).toContain(`$${deal1?.dealValue} million`);
    expect(value?.record?.value).toBe(deal1?.dealValue);
    const undisclosed = dataset.acquisitions.find((deal) =>
      deal.dealValue === undefined
    );
    const missing = corpusById.get(
      dealPassageId(undisclosed?.id ?? "", "value"),
    );
    expect(missing?.record?.value).toBeNull();
    expect(missing?.text).toContain("not disclosed");
    expect(new Set(corpus.map((passage) => passage.passageId)).size).toBe(
      corpus.length,
    );
  });
});

describe("value extraction", () => {
  it("normalizes money to USD millions", () => {
    expect(extractValues("$13.9 billion").usdMillions).toEqual([13900]);
    expect(extractValues("US$1,600 million").usdMillions).toEqual([1600]);
    expect(extractValues("$400M upfront").usdMillions).toEqual([400]);
    expect(extractValues("about 67.5 million USD").usdMillions).toEqual([67.5]);
    expect(extractValues("Gen-Probe was founded in 1983").usdMillions).toEqual(
      [],
    );
  });

  it("reads ISO and written dates and standalone years", () => {
    const values = extractValues(
      "Announced August 5, 2020 and closed 2020-10-30; founded 2014.",
    );
    expect(values.isoDates).toEqual(["2020-10-30", "2020-08-05"]);
    expect(values.years).toEqual([2014]);
    expect(extractValues("5 Aug 2020").isoDates).toEqual(["2020-08-05"]);
  });

  it("matches entities by whole normalized tokens", () => {
    expect(
      mentionsEntity("Acquired by Hims & Hers Health.", "Hims & Hers Health"),
    )
      .toBe(true);
    expect(mentionsEntity("ZYMŌT fertility", "ZyMōt Fertility")).toBe(true);
    expect(mentionsEntity("Rochester", "Roche")).toBe(false);
  });
});

describe("deterministic scorers", () => {
  it("scores a correct, correctly cited answer", () => {
    const score = scoreResponse(
      valueItem,
      response({
        itemId: valueItem.id,
        answer: `The disclosed value was $${goldValue} million.`,
        citedIds: [goldPassage],
        retrievedIds: retrieved,
      }),
      corpusById,
    );
    expect(score).toMatchObject({
      correct: true,
      citationCorrect: true,
      unsupported: false,
      abstained: false,
    });
  });

  it("accepts a rounded restatement within tolerance", () => {
    expect(answerMatchesGold(
      { ...valueItem, gold: { ...valueItem.gold, value: 13900 } },
      "about $13.9 billion",
    )).toBe(true);
  });

  it("flags a wrong citation (retrieved but not gold)", () => {
    const score = scoreResponse(
      valueItem,
      response({
        itemId: valueItem.id,
        answer: `$${goldValue} million`,
        citedIds: [dealPassageId("deal1", "value")],
        retrievedIds: retrieved,
      }),
      corpusById,
    );
    expect(score.correct).toBe(true);
    expect(score.citationCorrect).toBe(false);
    // The value is not in the wrongly cited passage either.
    expect(score.unsupported).toBe(goldValue !== deal1?.dealValue);
  });

  it("flags a citation outside the retrieved set", () => {
    expect(citationIsCorrect(
      { citedIds: [goldPassage, "vd:invented:value"], retrievedIds: retrieved },
      valueItem,
    )).toBe(false);
    expect(citationIsCorrect(
      { citedIds: [goldPassage], retrievedIds: [otherPassage] },
      valueItem,
    )).toBe(false);
    expect(
      citationIsCorrect({ citedIds: [], retrievedIds: retrieved }, valueItem),
    )
      .toBe(false);
  });

  it("flags a hallucinated number even with a gold citation", () => {
    const hallucinated = goldValue * 3 + 7;
    const score = scoreResponse(
      valueItem,
      response({
        itemId: valueItem.id,
        answer: `The deal was worth $${hallucinated} million.`,
        citedIds: [goldPassage],
        retrievedIds: retrieved,
      }),
      corpusById,
    );
    expect(score.correct).toBe(false);
    expect(score.citationCorrect).toBe(true);
    expect(score.unsupported).toBe(true);
    expect(score.unsupportedValues).toContain(`usd_millions:${hallucinated}`);
  });

  it("flags an extra unsupported date alongside the gold value", () => {
    const score = scoreResponse(
      valueItem,
      response({
        itemId: valueItem.id,
        answer: `$${goldValue} million, closed on 1999-01-01.`,
        citedIds: [goldPassage],
        retrievedIds: retrieved,
      }),
      corpusById,
    );
    expect(score.correct).toBe(true);
    expect(score.unsupported).toBe(true);
  });

  it("does not count question-supplied dates as claims", () => {
    const acquirerItem = frozen.items.find((entry) =>
      entry.template === "acquirer"
    ) as LiftEvalItem;
    const deal = dataset.acquisitions.find((candidate) =>
      candidate.id === acquirerItem.goldRecordIds[0]
    );
    const score = scoreResponse(
      acquirerItem,
      response({
        itemId: acquirerItem.id,
        answer: `${deal?.acquirerName} announced it on ${deal?.announcedDate}.`,
        citedIds: acquirerItem.goldPassageIds,
        retrievedIds: acquirerItem.goldPassageIds,
      }),
      corpusById,
    );
    expect(score).toMatchObject({
      correct: true,
      citationCorrect: true,
      unsupported: false,
    });
  });

  it("credits a correct abstention on a should-abstain item", () => {
    const abstainItem = frozen.items.find((entry) =>
      entry.template === "undisclosed_deal_value"
    ) as LiftEvalItem;
    const score = scoreResponse(
      abstainItem,
      response({ itemId: abstainItem.id, disposition: "abstain" }),
      corpusById,
    );
    expect(metricIndicator(score, "abstentionRate")).toBe(1);
    expect(metricIndicator(score, "falseAbstentionRate")).toBeNull();
    expect(metricIndicator(score, "accuracy")).toBeNull();
    expect(metricIndicator(score, "unsupportedClaimRate")).toBeNull();
  });

  it("penalizes answering a should-abstain item", () => {
    const abstainItem = frozen.items.find((entry) =>
      entry.template === "out_of_scope_revenue"
    ) as LiftEvalItem;
    const score = scoreResponse(
      abstainItem,
      response({
        itemId: abstainItem.id,
        arm: "no_retrieval",
        answer: "Revenue was $85 million.",
      }),
      corpusById,
    );
    expect(metricIndicator(score, "abstentionRate")).toBe(0);
    expect(metricIndicator(score, "unsupportedClaimRate")).toBe(1);
  });

  it("counts a false abstention on an answerable item", () => {
    const score = scoreResponse(
      valueItem,
      response({ itemId: valueItem.id, disposition: "abstain" }),
      corpusById,
    );
    expect(metricIndicator(score, "falseAbstentionRate")).toBe(1);
    expect(metricIndicator(score, "accuracy")).toBe(0);
    expect(metricIndicator(score, "citationCorrectness")).toBeNull();
  });

  it("treats a closed-book correct value as uncited and unsupported", () => {
    const score = scoreResponse(
      valueItem,
      response({
        itemId: valueItem.id,
        arm: "no_retrieval",
        answer: `$${goldValue} million`,
      }),
      corpusById,
    );
    expect(score).toMatchObject({
      correct: true,
      citationCorrect: false,
      unsupported: true,
    });
    expect(valueDeal).toBeDefined();
  });
});

describe("bootstrap", () => {
  it("is seeded and brackets the estimate", () => {
    const values = [1, 0, 1, 1, null, 0, 1, 1, 0, 1];
    const first = bootstrapProportion(values, { resamples: 500, seed: 7 });
    const second = bootstrapProportion(values, { resamples: 500, seed: 7 });
    expect(first).toEqual(second);
    expect(first.n).toBe(9);
    expect(first.estimate).toBeCloseTo(6 / 9);
    expect(first.low as number).toBeLessThanOrEqual(first.estimate as number);
    expect(first.high as number).toBeGreaterThanOrEqual(
      first.estimate as number,
    );
  });

  it("gives a zero-width paired CI for identical arms", () => {
    const values = [1, 0, 1, null, 1];
    const diff = bootstrapPairedDifference(values, values, { resamples: 300 });
    expect(diff).toMatchObject({ estimate: 0, low: 0, high: 0 });
  });

  it("returns null estimates for empty denominators", () => {
    expect(bootstrapProportion([null, null]).estimate).toBeNull();
    expect(() => bootstrapPairedDifference([1], [1, 0])).toThrow();
  });
});

describe("runner, report, and gate (fake model)", () => {
  async function fakeRun(): Promise<LiftResponseRecord[]> {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const records: LiftResponseRecord[] = [];
    for (const arm of ["no_retrieval", "retrieval"] as const) {
      records.push(
        ...await runLiftCell({
          items: frozen.items,
          arm,
          promptVersion: "v1",
          corpus,
          generate: fakeEvidenceGenerator,
          concurrency: 4,
          fake: true,
        }),
      );
    }
    return records;
  }

  it("runs both arms through the app path and builds a paired report", async () => {
    const records = await fakeRun();
    expect(records).toHaveLength(frozen.items.length * 2);
    expect(records.every((record) => record.fake)).toBe(true);
    const retrievalRecords = records.filter((record) =>
      record.arm === "retrieval"
    );
    expect(retrievalRecords.every((record) => record.retrievedIds.length > 0))
      .toBe(true);
    expect(
      retrievalRecords.every((record) =>
        record.citedIds.every((id) => record.retrievedIds.includes(id))
      ),
    ).toBe(true);
    expect(() => buildLiftReport(frozen, corpus, records, { mode: "replay" }))
      .toThrow(/Fake-model/);
    const report = buildLiftReport(frozen, corpus, records, {
      mode: "replay",
      allowFake: true,
      resamples: 200,
      generatedAt: "test",
    });
    expect(report.status).toBe("measured");
    expect(report.cells.map((cell) => `${cell.arm}/${cell.promptVersion}`))
      .toEqual(["no_retrieval/v1", "retrieval/v1"]);
    const closed = report.cells[0];
    expect(closed.modelIds).toEqual([FAKE_MODEL_ID]);
    // The fake closed-book arm always abstains.
    expect(closed.falseAbstentionRate.estimate).toBe(1);
    expect(report.lift).toHaveLength(1);
    expect(report.retrievalRecallAtK.estimate).toBe(1);
    expect(renderLiftReportMarkdown(report)).toContain("retrieval/v1");
  });

  it("lets a perfect oracle score perfectly through the app verifier", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const records = await runLiftCell({
      items: frozen.items,
      arm: "retrieval",
      promptVersion: "v1",
      corpus,
      generate: oracleGenerator(frozen.items, corpus),
      concurrency: 8,
      fake: true,
    });
    const report = buildLiftReport(frozen, corpus, records, {
      mode: "replay",
      allowFake: true,
      resamples: 50,
      generatedAt: "test",
    });
    const [cell] = report.cells;
    expect(cell.accuracy.estimate).toBe(1);
    expect(cell.citationCorrectness.estimate).toBe(1);
    expect(cell.unsupportedClaimRate.estimate).toBe(0);
    expect(cell.abstentionRate.estimate).toBe(1);
    expect(cell.falseAbstentionRate.estimate).toBe(0);
  });

  it("rejects incomplete and duplicate cells", async () => {
    const records = await fakeRun();
    expect(() =>
      buildLiftReport(frozen, corpus, records.slice(1), {
        mode: "replay",
        allowFake: true,
        resamples: 10,
      })
    ).toThrow(/incomplete/);
    expect(() =>
      buildLiftReport(frozen, corpus, [...records, records[0]], {
        mode: "replay",
        allowFake: true,
        resamples: 10,
      })
    ).toThrow(/Duplicate/);
  });

  it("records provider errors instead of inventing answers", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const items = frozen.items.slice(0, 2);
    for (const arm of ["no_retrieval", "retrieval"] as const) {
      const records = await runLiftCell({
        items,
        arm,
        promptVersion: "v1",
        corpus,
        generate: failingGenerator,
      });
      for (const record of records) {
        expect(record.disposition).toBe("abstain");
        expect(record.error).toBeTruthy();
        expect(record.citedIds).toEqual([]);
      }
    }
  });

  it("marks a report invalid when provider errors exceed the limit", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const records = await runLiftCell({
      items: frozen.items,
      arm: "retrieval",
      promptVersion: "v1",
      corpus,
      generate: failingGenerator,
      concurrency: 8,
    });
    const report = buildLiftReport(frozen, corpus, records, {
      mode: "replay",
      resamples: 10,
      generatedAt: "test",
    });
    // Errors score as abstentions; the report must not pass them off as a
    // perfect abstention rate.
    expect(report.status).toBe("invalid_provider_errors");
    expect(renderLiftReportMarkdown(report)).toContain("not measurements");
    const gate = evaluateLiftGate(report, {
      gatedPromptVersions: ["v1"],
      min: { accuracy: 0, citationCorrectness: 0, abstentionRate: 0 },
      maxDropVsBaseline: 1,
      maxErrorRate: 1,
    }, null);
    expect(gate.pass).toBe(false);
    expect(gate.failures.join(" ")).toMatch(/provider error rate/);
  });

  const thresholds = readJson<LiftGateThresholds>(
    "lift-gate.thresholds.json",
  );

  function cellReport(
    estimates: { accuracy: number; citation: number; abstention: number },
    status: LiftReport["status"] = "measured",
  ): LiftReport {
    const ci = (estimate: number) => ({
      estimate,
      low: estimate,
      high: estimate,
      n: 10,
    });
    return {
      schema: "lacuna.lift-eval.report/v1",
      status,
      mode: "replay",
      evalSet: {
        version: frozen.version,
        itemsSha256: frozen.itemsSha256,
        items: frozen.items.length,
      },
      corpus: { passages: corpus.length, snapshotHash: "x" },
      bootstrap: { resamples: 1, seed: 1, level: 0.95 },
      retrievalRecallAtK: { ...ci(1), k: 5 },
      cells: status === "measured"
        ? [{
          arm: "retrieval",
          promptVersion: "v1",
          modelIds: ["m"],
          responses: 160,
          errors: 0,
          accuracy: ci(estimates.accuracy),
          citationCorrectness: ci(estimates.citation),
          unsupportedClaimRate: ci(0),
          abstentionRate: ci(estimates.abstention),
          falseAbstentionRate: ci(0),
          usage: { inputTokens: 0, outputTokens: 0 },
        }]
        : [],
      lift: [],
      generatedAt: "test",
    };
  }

  it("passes above floors and skips regression without a measured baseline", () => {
    const baseline = readJson<LiftReport>("lift-baseline.report.json");
    expect(baseline.status).toBe("pending_live_run");
    expect(baseline.evalSet.itemsSha256).toBe(frozen.itemsSha256);
    const gate = evaluateLiftGate(
      cellReport({ accuracy: 0.9, citation: 0.95, abstention: 0.9 }),
      thresholds,
      baseline,
    );
    expect(gate.pass).toBe(true);
    expect(gate.notes.join(" ")).toMatch(/No measured baseline/);
  });

  it("fails below floors", () => {
    const gate = evaluateLiftGate(
      cellReport({ accuracy: 0.1, citation: 0.95, abstention: 0.9 }),
      thresholds,
      null,
    );
    expect(gate.pass).toBe(false);
    expect(gate.failures.join(" ")).toMatch(/accuracy/);
  });

  it("fails on a regression beyond the margin vs a measured baseline", () => {
    const baseline = cellReport({
      accuracy: 0.95,
      citation: 0.95,
      abstention: 0.95,
    });
    const gate = evaluateLiftGate(
      cellReport({ accuracy: 0.85, citation: 0.95, abstention: 0.95 }),
      thresholds,
      baseline,
    );
    expect(gate.pass).toBe(false);
    expect(gate.failures.join(" ")).toMatch(/dropped/);
  });

  it("fails when the gated cell is missing or nothing was measured", () => {
    expect(
      evaluateLiftGate(
        cellReport(
          { accuracy: 1, citation: 1, abstention: 1 },
          "pending_live_run",
        ),
        thresholds,
        null,
      ).pass,
    ).toBe(false);
  });
});

describe("evidence ask prompt override", () => {
  it("defaults to the production prompt and honors a versioned override", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const systems: string[] = [];
    const generate = (input: { system: string; prompt: string }) => {
      systems.push(input.system);
      return fakeEvidenceGenerator(input);
    };
    const request = {
      question: valueItem.question,
      asOfDate: "2026-11-01",
      lane: "research_draft" as const,
      topK: 5,
    };
    const base = await runEvidenceAsk({ request, corpus, generate });
    const revised = await runEvidenceAsk({
      request,
      corpus,
      generate,
      prompt: {
        version: LIFT_PROMPTS.v2.label,
        system: LIFT_PROMPTS.v2.retrievalSystem,
      },
    });
    expect(systems[0]).toBe(EVIDENCE_RAG_SYSTEM_PROMPT);
    expect(systems[1]).toBe(LIFT_PROMPTS.v2.retrievalSystem);
    expect("promptVersion" in base.body && base.body.promptVersion).toBe(
      "1.0.0",
    );
    expect("promptVersion" in revised.body && revised.body.promptVersion).toBe(
      LIFT_PROMPTS.v2.label,
    );
  });
});
