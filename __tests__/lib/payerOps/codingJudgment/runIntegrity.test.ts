import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isPreProviderTransportFailure,
  manifestMismatches,
  stalePromptReplies,
} from "@/lib/payerOps/codingJudgment/runIntegrity";
import {
  emBenchmarkSchema,
  evalSetSchema,
  ncciSubsetSchema,
  replyRecordSchema,
  runManifestSchema,
} from "@/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";
const runDir = `${DIR}/runs/${
  readFileSync(`${DIR}/runs/latest.txt`, "utf8").trim()
}`;
const json = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const manifest = runManifestSchema.parse(json(`${runDir}/manifest.json`));
const replies = readFileSync(`${runDir}/replies.jsonl`, "utf8").split("\n")
  .filter(Boolean).map((l) => replyRecordSchema.parse(JSON.parse(l)));
const evalSet = evalSetSchema.parse(json(`${DIR}/eval-cases.v1.json`));
const subset = ncciSubsetSchema.parse(
  json(`${DIR}/ncci-practitioner-2026q4.subset.json`),
);
const benchmark = emBenchmarkSchema.parse(
  json(`${DIR}/benchmarks/obgyn-em-office-established.2024.json`),
);
const hashes = {
  evalSetSha256: manifest.evalSetSha256,
  ncciSubsetSha256: manifest.ncciSubsetSha256,
  emBenchmarkSha256: manifest.emBenchmarkSha256,
};

describe("isPreProviderTransportFailure", () => {
  it("accepts only a credential-proxy CONNECT 407", () => {
    expect(isPreProviderTransportFailure(
      "curl transport failed (exit 7): curl: (7) CONNECT tunnel failed, response 407",
    )).toBe(true);
  });
  it.each([
    "curl transport failed (exit 28): curl: (28) Operation timed out after 180000 ms",
    "curl transport failed (exit 56): curl: (56) Recv failure: Connection reset by peer",
    "curl transport failed (exit 7): curl: (7) CONNECT tunnel failed, response 502",
    "openrouter HTTP 429: rate limited",
  ])("keeps ambiguous or provider errors as failures: %s", (error) => {
    expect(isPreProviderTransportFailure(error)).toBe(false);
  });
  it("treats a missing error as not re-issuable", () => {
    expect(isPreProviderTransportFailure(null)).toBe(false);
  });
});

describe("manifestMismatches", () => {
  it("passes for the committed run", () => {
    expect(manifestMismatches(manifest, hashes)).toEqual([]);
  });
  it("names every input that changed", () => {
    expect(manifestMismatches(manifest, {
      ...hashes,
      emBenchmarkSha256: "0".repeat(64),
    })).toEqual(["emBenchmarkSha256"]);
    expect(manifestMismatches({ ...manifest, promptVersion: "old" }, hashes))
      .toEqual(["promptVersion"]);
  });
});

describe("stalePromptReplies", () => {
  it("finds none in the committed run", () => {
    expect(stalePromptReplies(replies, evalSet.cases, subset, benchmark))
      .toEqual([]);
  });
  it("flags replies recorded on different evidence", () => {
    const changed = {
      ...benchmark,
      profiles: benchmark.profiles.map((p, i) =>
        i === 0 ? { ...p, id: `${p.id}x` } : p
      ),
    };
    const grounded = replies.filter((r) => r.condition === "grounded");
    const stale = stalePromptReplies(grounded, evalSet.cases, subset, changed);
    expect(stale.length).toBeGreaterThan(0);
    expect(stale.length).toBeLessThan(grounded.length);
  });
});
