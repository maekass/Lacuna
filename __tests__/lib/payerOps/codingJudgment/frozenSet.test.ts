import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProfileCases } from "@/lib/payerOps/codingJudgment/caseBuilder";
import {
  checkEvalSet,
  findNpiLikeStrings,
} from "@/lib/payerOps/codingJudgment/checks";
import {
  benchmarkIdFor,
  benchmarkPathFor,
  peerScreenConfigSchema,
  profileIdFor,
} from "@/lib/payerOps/codingJudgment/config";
import {
  emBenchmarkSchema,
  evalSetSchema,
  ncciSubsetSchema,
} from "@/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";
const read = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const config = peerScreenConfigSchema.parse(
  read(`${DIR}/configs/obgyn-em-office-established.json`),
);
const benchmark = emBenchmarkSchema.parse(read(benchmarkPathFor(config)));
const subset = ncciSubsetSchema.parse(
  read(`${DIR}/ncci-practitioner-2026q4.subset.json`),
);
const evalSet = evalSetSchema.parse(read(`${DIR}/eval-cases.v1.json`));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("frozen coding judgment eval set (regression)", () => {
  it("matches the NCCI oracle and pinned ids", () => {
    expect(checkEvalSet(evalSet, subset, benchmark)).toEqual([]);
  });

  it("has the planned composition", () => {
    const kinds = evalSet.cases.map((c) => c.kind);
    const rule = kinds.filter((k) => k === "ptp" || k === "mue").length;
    expect(rule).toBeGreaterThanOrEqual(20);
    expect(rule).toBeLessThanOrEqual(25);
    const traps = evalSet.cases.filter((c) => c.trap).length;
    expect(traps).toBeGreaterThanOrEqual(4);
    expect(evalSet.cases.filter((c) => c.kind === "profile").length)
      .toBeGreaterThanOrEqual(3);
  });

  it("profile cases equal the config-driven builder output", () => {
    const built = buildProfileCases(
      benchmark,
      subset,
      config.caseBuilder.firstCaseNumber,
    );
    for (const item of built) {
      expect(evalSet.cases.find((c) => c.id === item.id)).toEqual(item);
    }
  });

  it("benchmark ids derive from the config", () => {
    expect(benchmark.id).toBe(benchmarkIdFor(config));
    expect(benchmark.configId).toBe(config.id);
    expect(benchmark.method.targetCode).toBe(config.codeFamily.targetCode);
    for (const p of benchmark.profiles) {
      expect(p.id.startsWith(profileIdFor(config, ""))).toBe(true);
    }
  });

  it("pins the NCCI quarter window", () => {
    expect(subset).toMatchObject({
      ptpVersion: "v323r0",
      quarter: "2026Q4",
      effectiveFrom: "2026-10-01",
      effectiveThrough: "2026-12-31",
    });
  });
});

describe("privacy of committed artifacts", () => {
  it("contain no NPI-like 10-digit strings", () => {
    for (const file of walk(DIR)) {
      expect(findNpiLikeStrings(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });

  it("commit only k-anonymous, coarsened profiles", () => {
    for (const p of benchmark.profiles) {
      expect(p.cellPeerCount).toBeGreaterThanOrEqual(config.screen.kAnonymity);
      expect(Object.keys(p).sort()).toEqual([
        "cellPeerCount",
        "id",
        "meetsVolumeThreshold",
        "outlierForReview",
        "posteriorBucket",
        "shrunkShareBandLow",
        "targetShareBandLow",
        "volumeBand",
      ]);
    }
  });

  it("detector catches an NPI but not a hash or date", () => {
    expect(findNpiLikeStrings("npi 1234567890 here")).toEqual(["1234567890"]);
    expect(findNpiLikeStrings("ab12345678901cd 20261001 0797d6d51d17")).toEqual(
      [],
    );
  });
});

describe("peer-screen config validation", () => {
  it("rejects a target code outside the family", () => {
    const bad = structuredClone(
      read(`${DIR}/configs/obgyn-em-office-established.json`),
    ) as {
      codeFamily: { targetCode: string };
    };
    bad.codeFamily.targetCode = "99205";
    expect(peerScreenConfigSchema.safeParse(bad).success).toBe(false);
  });
});
