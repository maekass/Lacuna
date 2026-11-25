import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkEvalSet,
  findNpiLikeStrings,
} from "@/lib/payerOps/codingJudgment/checks";
import { requiredRuleKeys } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  emBenchmarkSchema,
  evalSetSchema,
  heldoutEvalSetSchema,
  ncciSubsetSchema,
} from "@/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";
const SET = `${DIR}/eval-cases.v2-heldout.json`;
const read = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const heldout = heldoutEvalSetSchema.parse(read(SET));
const subset = ncciSubsetSchema.parse(read(heldout.ncciSubsetPath));
const benchmark = emBenchmarkSchema.parse(read(heldout.emBenchmarkPath));
const v1 = evalSetSchema.parse(read(`${DIR}/eval-cases.v1.json`));
const v1Subset = ncciSubsetSchema.parse(
  read(`${DIR}/ncci-practitioner-2026q4.subset.json`),
);

const sha256 = (p: string): string =>
  createHash("sha256").update(readFileSync(p)).digest("hex");

describe("held-out coding judgment set (v2) integrity", () => {
  it("matches the freeze manifest byte for byte", () => {
    const lines = readFileSync(`${DIR}/eval-cases.v2-heldout.sha256`, "utf8")
      .trim().split("\n");
    const entries = lines.map((line) => {
      const [hash, file] = line.split(/ {2}/);
      return { hash, file };
    });
    expect(entries.map((e) => e.file).sort()).toEqual(
      [SET, heldout.ncciSubsetPath, heldout.emBenchmarkPath].sort(),
    );
    for (const { hash, file } of entries) expect(sha256(file)).toBe(hash);
  });

  it("derives every rule and profile label from pinned rows", () => {
    expect(checkEvalSet(heldout, subset, benchmark)).toEqual([]);
  });

  it("is new: no case id or question repeats v1", () => {
    const ids = new Set(v1.cases.map((c) => c.id));
    const questions = new Set(v1.cases.map((c) => c.question));
    for (const item of heldout.cases) {
      expect(ids.has(item.id)).toBe(false);
      expect(questions.has(item.question)).toBe(false);
    }
  });

  it("keeps the boundary mix the plan calls for", () => {
    const tagged = (tag: string) =>
      heldout.cases.filter((c) => c.tags.includes(tag)).length;
    expect(heldout.cases.length).toBeGreaterThanOrEqual(20);
    expect(tagged("code-absent-mue") + tagged("code-absent"))
      .toBeGreaterThanOrEqual(2);
    expect(tagged("date-boundary")).toBeGreaterThanOrEqual(2);
    expect(tagged("out-of-window")).toBeGreaterThanOrEqual(2);
    expect(tagged("out-of-scope-payer")).toBeGreaterThanOrEqual(2);
    expect(tagged("below-volume-threshold")).toBeGreaterThanOrEqual(2);
    expect(tagged("near-review-rule")).toBeGreaterThanOrEqual(1);
    expect(tagged("documentation")).toBeGreaterThanOrEqual(2);
    expect(tagged("intent")).toBeGreaterThanOrEqual(2);
    const autoOnly = heldout.cases.filter((c) =>
      c.expected.acceptableRoutes.length === 1 &&
      c.expected.acceptableRoutes[0] === "auto"
    );
    expect(autoOnly.length).toBeGreaterThanOrEqual(10);
  });

  it("pins a superset of the v1 subset, so v1 replays are unaffected", () => {
    const ids = new Set([
      ...subset.ptpEdits.map((r) => r.id),
      ...subset.mueEdits.map((r) => r.id),
      ...subset.coverage.map((r) => r.id),
      ...subset.ptpPairAbsences.map((r) => r.id),
    ]);
    for (
      const id of [
        ...v1Subset.ptpEdits.map((r) => r.id),
        ...v1Subset.mueEdits.map((r) => r.id),
      ]
    ) expect(ids.has(id)).toBe(true);
    const keys = requiredRuleKeys([...v1.cases, ...heldout.cases]);
    for (const code of keys.codes) {
      expect(subset.coverage.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains no NPI-like strings", () => {
    for (
      const file of [SET, heldout.ncciSubsetPath, heldout.emBenchmarkPath]
    ) expect(findNpiLikeStrings(readFileSync(file, "utf8"))).toEqual([]);
  });

  it("every case carries claim intake metadata", () => {
    for (const item of heldout.cases) {
      expect(item.intake.payer).not.toBe("unknown");
      expect(item.intake.requestType).not.toBe("unknown");
    }
  });
});
