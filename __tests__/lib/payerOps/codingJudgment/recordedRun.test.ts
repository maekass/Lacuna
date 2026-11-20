import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sha256Text } from "@/lib/payerOps/codingJudgment/agent";
import { pinnedIds } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  emBenchmarkSchema,
  evalSetSchema,
  ncciSubsetSchema,
  replyRecordSchema,
  runManifestSchema,
} from "@/lib/payerOps/codingJudgment/schemas";
import { scoreCondition } from "@/lib/payerOps/codingJudgment/scorer";

// Recorded-run mode: CI re-scores the committed raw replies with no network
// or keys and checks they reproduce the committed results and data hashes.
const DIR = "data/coding-judgment";
const runId = readFileSync(`${DIR}/runs/latest.txt`, "utf8").trim();
const runDir = path.join(DIR, "runs", runId);
const text = (p: string) => readFileSync(p, "utf8");
const manifest = runManifestSchema.parse(
  JSON.parse(text(`${runDir}/manifest.json`)),
);
const replies = text(`${runDir}/replies.jsonl`).split("\n").filter(Boolean).map(
  (l) => replyRecordSchema.parse(JSON.parse(l)),
);
const files = {
  evalSet: `${DIR}/eval-cases.v1.json`,
  subset: `${DIR}/ncci-practitioner-2026q4.subset.json`,
  benchmark: `${DIR}/benchmarks/obgyn-em-office-established.2024.json`,
};
const evalSet = evalSetSchema.parse(JSON.parse(text(files.evalSet)));
const subset = ncciSubsetSchema.parse(JSON.parse(text(files.subset)));
const benchmark = emBenchmarkSchema.parse(JSON.parse(text(files.benchmark)));

describe(`recorded coding judgment run ${runId}`, () => {
  it("was recorded against the committed data", () => {
    expect(manifest.evalSetSha256).toBe(sha256Text(text(files.evalSet)));
    expect(manifest.ncciSubsetSha256).toBe(sha256Text(text(files.subset)));
    expect(manifest.emBenchmarkSha256).toBe(sha256Text(text(files.benchmark)));
  });

  it("has exactly one reply per model × condition × case", () => {
    expect(replies).toHaveLength(
      manifest.modelIds.length * manifest.conditions.length *
        evalSet.cases.length,
    );
  });

  it("only free models served the replies", () => {
    for (const r of replies) {
      if (manifest.provider === "openrouter_free") {
        expect(r.modelId).toMatch(/:free$/);
      }
      if (r.returnedModelId !== null) expect(r.returnedModelId).toBe(r.modelId);
    }
  });

  it("re-scoring reproduces the committed results", () => {
    const committed = JSON.parse(text(`${runDir}/results.json`)) as {
      reports: Array<{ metrics: unknown }>;
    };
    const pinned = pinnedIds(subset, benchmark);
    const metrics = manifest.modelIds.flatMap((m) =>
      manifest.conditions.map((c) =>
        scoreCondition(evalSet.cases, replies, c, pinned, m).metrics
      )
    );
    expect(metrics).toEqual(committed.reports.map((r) => r.metrics));
  });
});
