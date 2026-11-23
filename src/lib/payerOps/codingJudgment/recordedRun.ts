/**
 * Load a recorded coding-judgment run and the exact inputs it was recorded
 * on, then check that the files still match the manifest's hashes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { sha256Text } from "@/lib/payerOps/codingJudgment/agent";
import { pinnedIds } from "@/lib/payerOps/codingJudgment/retrieval";
import {
  manifestMismatches,
  stalePromptReplies,
} from "@/lib/payerOps/codingJudgment/runIntegrity";
import {
  type ClaimIntake,
  claimIntakeSchema,
  type EmBenchmark,
  emBenchmarkSchema,
  type EvalCase,
  evalSetSchema,
  intakeSidecarSchema,
  type NcciSubset,
  ncciSubsetSchema,
  type ReplyRecord,
  replyRecordSchema,
  type RunManifest,
  runManifestSchema,
} from "@/lib/payerOps/codingJudgment/schemas";

export const CODING_JUDGMENT_DIR = "data/coding-judgment";
export const V1_INPUT_PATHS = {
  evalSet: `${CODING_JUDGMENT_DIR}/eval-cases.v1.json`,
  subset: `${CODING_JUDGMENT_DIR}/ncci-practitioner-2026q4.subset.json`,
  benchmark:
    `${CODING_JUDGMENT_DIR}/benchmarks/obgyn-em-office-established.2024.json`,
} as const;

export interface InputPaths {
  evalSet: string;
  subset: string;
  benchmark: string;
}

/** Input paths a manifest points to (v1 defaults when it predates paths). */
export function inputPathsFor(manifest: RunManifest): InputPaths {
  return {
    evalSet: manifest.evalSetPath ?? V1_INPUT_PATHS.evalSet,
    subset: manifest.ncciSubsetPath ?? V1_INPUT_PATHS.subset,
    benchmark: manifest.emBenchmarkPath ?? V1_INPUT_PATHS.benchmark,
  };
}

export function sidecarPathFor(evalSetPath: string): string {
  return path.join(
    CODING_JUDGMENT_DIR,
    "intake",
    path.basename(evalSetPath).replace(/\.json$/, ".intake.json"),
  );
}

export interface LoadedRun {
  runDir: string;
  manifest: RunManifest;
  replies: ReplyRecord[];
  paths: InputPaths;
  cases: EvalCase[];
  subset: NcciSubset;
  benchmark: EmBenchmark;
  pinnedIds: Set<string>;
  /** Intake per case: from the case itself (v2) or the sidecar (v1). */
  intakeFor: (caseId: string) => ClaimIntake;
}

export function readReplies(file: string): ReplyRecord[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map(
    (line, i) => {
      try {
        return replyRecordSchema.parse(JSON.parse(line));
      } catch (error) {
        throw new Error(`${file}:${i + 1}: ${String(error)}`);
      }
    },
  );
}

/** Load and verify a run. Throws when any input no longer matches. */
export function loadRecordedRun(runDir: string): LoadedRun {
  const manifest = runManifestSchema.parse(
    JSON.parse(readFileSync(path.join(runDir, "manifest.json"), "utf8")),
  );
  const paths = inputPathsFor(manifest);
  const text = {
    evalSet: readFileSync(paths.evalSet, "utf8"),
    subset: readFileSync(paths.subset, "utf8"),
    benchmark: readFileSync(paths.benchmark, "utf8"),
  };
  const rawSet = JSON.parse(text.evalSet) as {
    cases?: Array<{ id?: unknown; intake?: unknown }>;
  };
  // v2 files carry extra fields (intake, paths); the shared schema strips them.
  const evalSet = evalSetSchema.parse(rawSet);
  const subset = ncciSubsetSchema.parse(JSON.parse(text.subset));
  const benchmark = emBenchmarkSchema.parse(JSON.parse(text.benchmark));
  const replies = readReplies(path.join(runDir, "replies.jsonl"));

  const problems = manifestMismatches(manifest, {
    evalSetSha256: sha256Text(text.evalSet),
    ncciSubsetSha256: sha256Text(text.subset),
    emBenchmarkSha256: sha256Text(text.benchmark),
  });
  const stale = stalePromptReplies(replies, evalSet.cases, subset, benchmark);
  if (stale.length) problems.push(`stale prompts: ${stale.join(", ")}`);
  if (problems.length) {
    throw new Error(
      `${runDir} does not match its inputs: ${problems.join("; ")}`,
    );
  }

  const intake = new Map<string, ClaimIntake>();
  for (const raw of rawSet.cases ?? []) {
    if (typeof raw.id === "string" && raw.intake !== undefined) {
      intake.set(raw.id, claimIntakeSchema.parse(raw.intake));
    }
  }
  if (intake.size === 0) {
    const sidecarPath = sidecarPathFor(paths.evalSet);
    const sidecar = intakeSidecarSchema.parse(
      JSON.parse(readFileSync(sidecarPath, "utf8")),
    );
    if (sidecar.evalSetSha256 !== sha256Text(text.evalSet)) {
      throw new Error(`${sidecarPath} was written for a different eval set`);
    }
    for (const [id, value] of Object.entries(sidecar.intake)) {
      intake.set(id, value);
    }
  }
  return {
    runDir,
    manifest,
    replies,
    paths,
    cases: evalSet.cases,
    subset,
    benchmark,
    pinnedIds: pinnedIds(subset, benchmark),
    intakeFor: (caseId) => {
      const value = intake.get(caseId);
      // Fail closed: a case with no intake is routed as unknown.
      return value ?? { payer: "unknown", requestType: "unknown" };
    },
  };
}
