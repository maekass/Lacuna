#!/usr/bin/env tsx
/**
 * Coding Judgment Check eval runner: grounded vs closed-book.
 *
 *   npm run eval:coding-judgment                       # re-score committed run
 *   npm run eval:coding-judgment -- --replay <dir>     # re-score a run dir
 *   npm run eval:coding-judgment -- --live --model <id>[,<id>] [--out <dir>]
 *       [--provider gateway|openrouter-free] [--run-id <id>] [--resume]
 *       [--eval-set <file>] [--conditions grounded[,closed_book]]
 *
 * Live mode makes one pass per model × condition at temperature 0 and writes
 * raw replies, a config manifest and scored results. The default provider is
 * the repo inference path (src/lib/ai/inference.ts → Vercel AI Gateway).
 * `--provider openrouter-free` accepts only pinned `:free` model ids (see
 * src/lib/payerOps/codingJudgment/openrouter.ts). Replay mode needs no
 * network or keys. No result is ever invented: missing or errored replies
 * score as malformed (fail closed).
 */
import { execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { benchmarkPathFor } from "../../src/lib/payerOps/codingJudgment/config";
import { loadPeerScreenConfig } from "../../src/lib/payerOps/codingJudgment/loadConfig";
import {
  generateInferenceText,
  getLastLlmAccounting,
  resetLlmAccounting,
  resolveInferenceModel,
} from "../../src/lib/ai/inference";
import {
  createCurlFetch,
  installCurlGatewayTransport,
} from "../../src/lib/ai/evals/lift/curlTransport";
import { createOpenRouterFreeGenerate } from "../../src/lib/payerOps/codingJudgment/openrouter";
import {
  buildSystemPrompt,
  callCodingJudgmentAgent,
  CODING_JUDGMENT_PROMPT_VERSION,
  type GenerateFn,
  sha256Text,
} from "../../src/lib/payerOps/codingJudgment/agent";
import { checkEvalSet } from "../../src/lib/payerOps/codingJudgment/checks";
import {
  isPreProviderTransportFailure,
  manifestMismatches,
  stalePromptReplies,
} from "../../src/lib/payerOps/codingJudgment/runIntegrity";
import {
  pinnedIds,
  retrieveEvidence,
} from "../../src/lib/payerOps/codingJudgment/retrieval";
import {
  type ConditionReport,
  scoreCondition,
} from "../../src/lib/payerOps/codingJudgment/scorer";
import {
  emBenchmarkSchema,
  type EvalCondition,
  evalSetSchema,
  ncciSubsetSchema,
  type ReplyRecord,
  replyRecordSchema,
  type RunManifest,
  runManifestSchema,
} from "../../src/lib/payerOps/codingJudgment/schemas";

const DIR = "data/coding-judgment";
const COMMITTED_RUN = `${DIR}/runs/latest.txt`;
const DEFAULT_EVAL_SET = `${DIR}/eval-cases.v1.json`;
/**
 * Input files for this invocation. Defaults to the v1 set. A live run takes
 * `--eval-set <file>` (its subset and benchmark paths come from the set when
 * it records them); a replay reads the paths from the run manifest.
 */
const FILES = {
  evalSet: DEFAULT_EVAL_SET,
  subset: `${DIR}/ncci-practitioner-2026q4.subset.json`,
  benchmark: benchmarkPathFor(loadPeerScreenConfig().config),
};
const DEFAULT_CONDITIONS: EvalCondition[] = ["grounded", "closed_book"];
let CONDITIONS: EvalCondition[] = DEFAULT_CONDITIONS;

function useEvalSet(file: string): void {
  const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  FILES.evalSet = file;
  if (typeof raw.ncciSubsetPath === "string") FILES.subset = raw.ncciSubsetPath;
  if (typeof raw.emBenchmarkPath === "string") {
    FILES.benchmark = raw.emBenchmarkPath;
  }
}

function useManifestInputs(manifest: RunManifest): void {
  if (manifest.evalSetPath) FILES.evalSet = manifest.evalSetPath;
  if (manifest.ncciSubsetPath) FILES.subset = manifest.ncciSubsetPath;
  if (manifest.emBenchmarkPath) FILES.benchmark = manifest.emBenchmarkPath;
}
const TEMPERATURE = 0;
const GATEWAY_MAX_OUTPUT_TOKENS = 600;
/** Free reasoning models spend tokens before answering; give them headroom. */
const OPENROUTER_MAX_OUTPUT_TOKENS = 4000;
const PROVIDER_NOTES = {
  ai_gateway: "Vercel AI Gateway via src/lib/ai/inference.ts (repo default).",
  openrouter_free:
    "OpenRouter free-tier models, zero spend. Used because the Vercel AI Gateway account returned a billing block (no card on file) when this run was recorded. Pinned :free ids, no models fallback, returned model id recorded per reply.",
} as const;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function sha256File(file: string): string {
  return sha256Text(readFileSync(file, "utf8"));
}

function loadInputs() {
  const read = (file: string): unknown =>
    JSON.parse(readFileSync(file, "utf8"));
  const evalSet = evalSetSchema.parse(read(FILES.evalSet));
  const subset = ncciSubsetSchema.parse(read(FILES.subset));
  const benchmark = emBenchmarkSchema.parse(read(FILES.benchmark));
  const problems = checkEvalSet(evalSet, subset, benchmark);
  if (problems.length) {
    throw new Error(`Eval set failed checks:\n${problems.join("\n")}`);
  }
  return { evalSet, subset, benchmark };
}

function readReplies(file: string): ReplyRecord[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim())
    .map((line, i) => {
      const parsed = replyRecordSchema.safeParse(JSON.parse(line));
      if (!parsed.success) throw new Error(`${file}:${i + 1} invalid record`);
      return parsed.data;
    });
}

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function renderMarkdown(manifest: RunManifest, reports: ConditionReport[]) {
  const rows: Array<[string, (r: ConditionReport) => string]> = [
    ["Decision accuracy (all cases)", (r) => pct(r.metrics.decisionAccuracy)],
    [
      "Decision accuracy (answerable)",
      (r) => pct(r.metrics.answerableDecisionAccuracy),
    ],
    ["False-flag rate (expected no_flag)", (r) => pct(r.metrics.falseFlagRate)],
    ["Missed-flag rate (expected flag)", (r) => pct(r.metrics.missedFlagRate)],
    [
      "Abstention recall on traps",
      (r) => pct(r.metrics.abstentionRecallOnTraps),
    ],
    [
      "Abstention rate on answerable",
      (r) => pct(r.metrics.abstentionRateOnAnswerable),
    ],
    [
      "Citation validity",
      (r) =>
        `${
          pct(r.metrics.citationValidity)
        } (n=${r.metrics.citationValidityDenominator})`,
    ],
    ["Invented citation ids", (r) => String(r.metrics.inventedCitationCount)],
    ["Routing appropriateness", (r) => pct(r.metrics.routingAppropriateness)],
    ["Unsafe auto routes", (r) => String(r.metrics.unsafeAutoRouteCount)],
    ["Over-escalations", (r) => String(r.metrics.overEscalationCount)],
    [
      "Malformed outputs (fail closed)",
      (r) => String(r.metrics.malformedCount),
    ],
    ["  of which provider errors", (r) => String(r.metrics.providerErrorCount)],
  ];
  const label = (r: ConditionReport) =>
    `${r.metrics.modelId ?? "?"} · ${r.metrics.condition}`;
  const lines = [
    `# Coding Judgment Check — run ${manifest.runId}`,
    "",
    `Provider: ${manifest.providerNote} Temperature ${manifest.temperature}, one pass, prompt ${manifest.promptVersion}, commit \`${manifest.gitCommit}\`, ${manifest.caseCount} cases. Eval set is assistant-built and not independently adjudicated.`,
    "",
    `| Metric | ${reports.map(label).join(" | ")} |`,
    `| --- | ${reports.map(() => "---").join(" | ")} |`,
    ...rows.map(([name, fn]) => `| ${name} | ${reports.map(fn).join(" | ")} |`),
    "",
    "## Failures by case",
    "",
  ];
  for (const report of reports) {
    lines.push(`### ${label(report)}`, "");
    const failed = report.cases.filter((c) => c.failures.length > 0);
    if (!failed.length) lines.push("None.");
    for (const c of failed) {
      lines.push(
        `- ${c.caseId} (${c.kind}; expected ${c.expectedDecision}): got ${
          c.reply
            ? `${c.reply.decision}/${c.reply.route}`
            : `malformed (${c.malformedReason})`
        } — ${c.failures.join(", ")}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

function score(runDir: string): void {
  const manifest = runManifestSchema.parse(
    JSON.parse(readFileSync(path.join(runDir, "manifest.json"), "utf8")),
  );
  useManifestInputs(manifest);
  const { evalSet, subset, benchmark } = loadInputs();
  const replies = readReplies(path.join(runDir, "replies.jsonl"));
  // Refuse to grade a run against inputs it was not recorded on; nothing is
  // written when this fails.
  assertRunMatchesInputs(manifest, replies, evalSet, subset, benchmark);
  const pinned = pinnedIds(subset, benchmark);
  const reports = manifest.modelIds.flatMap((modelId) =>
    manifest.conditions.map((condition) =>
      scoreCondition(evalSet.cases, replies, condition, pinned, modelId)
    )
  );
  const results = {
    schemaVersion: "1.0.0",
    runId: manifest.runId,
    modelIds: manifest.modelIds,
    note:
      "Assistant-built, not independently adjudicated eval set; one pass per model and condition.",
    reports,
  };
  writeFileSync(
    path.join(runDir, "results.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  writeFileSync(
    path.join(runDir, "results.md"),
    `${renderMarkdown(manifest, reports)}\n`,
  );
  for (const r of reports) {
    const m = r.metrics;
    console.log(
      `${m.modelId} ${m.condition}: accuracy ${
        pct(m.decisionAccuracy)
      }, false-flag ${pct(m.falseFlagRate)}, missed-flag ${
        pct(m.missedFlagRate)
      }, trap abstention ${pct(m.abstentionRecallOnTraps)}, citation validity ${
        pct(m.citationValidity)
      }, routing ${
        pct(m.routingAppropriateness)
      }, malformed ${m.malformedCount}`,
    );
  }
}

function currentHashes() {
  return {
    evalSetSha256: sha256File(FILES.evalSet),
    ncciSubsetSha256: sha256File(FILES.subset),
    emBenchmarkSha256: sha256File(FILES.benchmark),
  };
}

function assertRunMatchesInputs(
  manifest: RunManifest | null,
  replies: readonly ReplyRecord[],
  evalSet: ReturnType<typeof loadInputs>["evalSet"],
  subset: ReturnType<typeof loadInputs>["subset"],
  benchmark: ReturnType<typeof loadInputs>["benchmark"],
): void {
  const problems = manifest
    ? manifestMismatches(manifest, currentHashes())
    : [];
  const stale = stalePromptReplies(replies, evalSet.cases, subset, benchmark);
  if (stale.length) {
    problems.push(`prompt hash differs for ${stale.join(", ")}`);
  }
  if (problems.length) {
    throw new Error(
      `Recorded run does not match current inputs (${
        problems.join("; ")
      }). Check out the commit in its manifest to replay it.`,
    );
  }
}

type ProviderName = "ai_gateway" | "openrouter_free";

function gatewayGenerate(modelId: string): GenerateFn {
  const resolved = resolveInferenceModel({
    gatewayModel: modelId,
    openaiModel: "unused",
  });
  if (!resolved?.viaGateway) throw new Error("AI Gateway is not configured");
  return async (system, prompt) => {
    resetLlmAccounting();
    const text = await generateInferenceText({
      resolved,
      system,
      prompt,
      feature: "coding-judgment-check",
      temperature: TEMPERATURE,
      maxOutputTokens: GATEWAY_MAX_OUTPUT_TOKENS,
      maxRetries: 2,
      timeoutMs: 90_000,
    });
    const usage = getLastLlmAccounting();
    return {
      text,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      // generateInferenceText does not expose the response's model identity;
      // usage.modelId is the requested id, so record null rather than claim it.
      returnedModelId: null,
    };
  };
}

async function live(): Promise<string> {
  const modelIds = (arg("--model") ?? "").split(",").map((m) => m.trim())
    .filter(Boolean);
  if (!modelIds.length) throw new Error("--live requires --model <id>[,<id>]");
  const providerArg = arg("--provider") ?? "gateway";
  const provider: ProviderName = providerArg === "openrouter-free"
    ? "openrouter_free"
    : providerArg === "gateway"
    ? "ai_gateway"
    : (() => {
      throw new Error(`Unknown --provider ${providerArg}`);
    })();
  const evalSetArg = arg("--eval-set");
  if (evalSetArg) useEvalSet(evalSetArg);
  const conditionsArg = arg("--conditions");
  if (conditionsArg) {
    CONDITIONS = conditionsArg.split(",").map((c) => {
      if (c !== "grounded" && c !== "closed_book") {
        throw new Error(`Unknown condition ${c}`);
      }
      return c;
    });
  }
  const { evalSet, subset, benchmark } = loadInputs();

  let makeGenerate: (modelId: string) => GenerateFn;
  if (provider === "ai_gateway") {
    if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
      throw new Error(
        "Set AI_GATEWAY_API_KEY (a placeholder is fine behind a credential proxy).",
      );
    }
    installCurlGatewayTransport({ timeoutSeconds: 90 });
    makeGenerate = gatewayGenerate;
  } else {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "Set OPENROUTER_API_KEY (a placeholder is fine behind a credential proxy).",
      );
    }
    const fetchImpl = createCurlFetch({ timeoutSeconds: 180 });
    makeGenerate = (model) =>
      createOpenRouterFreeGenerate({
        model,
        apiKey,
        fetchImpl,
        temperature: TEMPERATURE,
        maxTokens: OPENROUTER_MAX_OUTPUT_TOKENS,
      });
  }

  const createdAt = new Date().toISOString();
  const runId = arg("--run-id") ?? `${createdAt.slice(0, 10)}-${provider}`;
  const runDir = arg("--out") ?? path.join(DIR, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const gitCommit = execSync("git rev-parse HEAD", { encoding: "utf8" })
    .trim();
  const repliesPath = path.join(runDir, "replies.jsonl");
  const reissuePath = path.join(runDir, "transport-reissues.json");
  // --resume keeps every recorded model reply (including truncations, model
  // errors and ambiguous transport errors, which stay failures) and re-issues
  // only credential-proxy 407s, which never reached the provider. It refuses to
  // resume a run recorded with different settings, inputs or prompts.
  const done = new Set<string>();
  let createdAtKept = createdAt;
  let reissued: string[] = [];
  const key = (m: string, c: string, id: string) => `${m}|${c}|${id}`;
  if (process.argv.includes("--resume") && existsSync(repliesPath)) {
    const previous = readReplies(repliesPath);
    const manifestPath = path.join(runDir, "manifest.json");
    const previousManifest = existsSync(manifestPath)
      ? runManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")))
      : null;
    if (
      previousManifest &&
      (previousManifest.provider !== provider ||
        previousManifest.temperature !== TEMPERATURE ||
        previousManifest.maxOutputTokens !==
          (provider === "ai_gateway"
            ? GATEWAY_MAX_OUTPUT_TOKENS
            : OPENROUTER_MAX_OUTPUT_TOKENS))
    ) {
      throw new Error("Cannot resume: provider or model settings changed.");
    }
    if (
      previousManifest &&
      previousManifest.conditions.join(",") !== CONDITIONS.join(",")
    ) {
      throw new Error("Cannot resume: conditions changed.");
    }
    if (previousManifest) createdAtKept = previousManifest.createdAt;
    const kept = previous.filter((r) =>
      !isPreProviderTransportFailure(r.error)
    );
    assertRunMatchesInputs(previousManifest, kept, evalSet, subset, benchmark);
    reissued = existsSync(reissuePath)
      ? (JSON.parse(readFileSync(reissuePath, "utf8")) as string[])
      : [];
    for (const r of previous) {
      if (isPreProviderTransportFailure(r.error)) {
        reissued.push(key(r.modelId, r.condition, r.caseId));
      }
    }
    writeFileSync(reissuePath, `${JSON.stringify(reissued, null, 2)}\n`);
    writeFileSync(
      repliesPath,
      kept.map((r) => `${JSON.stringify(r)}\n`).join(""),
    );
    for (const r of kept) done.add(key(r.modelId, r.condition, r.caseId));
  } else {
    writeFileSync(repliesPath, "");
    if (existsSync(reissuePath)) writeFileSync(reissuePath, "[]\n");
  }

  // Written before the first request and after the last, so an interrupted
  // run still carries its settings and input hashes for a later --resume.
  const writeManifest = (): void => {
    const manifest: RunManifest = runManifestSchema.parse({
      schemaVersion: "1.0.0",
      runId,
      createdAt: createdAtKept,
      gitCommit,
      modelIds,
      provider,
      providerNote: PROVIDER_NOTES[provider],
      inferencePath: provider === "ai_gateway"
        ? "src/lib/ai/inference.ts generateInferenceText -> Vercel AI Gateway"
        : "src/lib/payerOps/codingJudgment/openrouter.ts -> OpenRouter chat completions",
      temperature: TEMPERATURE,
      maxOutputTokens: provider === "ai_gateway"
        ? GATEWAY_MAX_OUTPUT_TOKENS
        : OPENROUTER_MAX_OUTPUT_TOKENS,
      promptVersion: CODING_JUDGMENT_PROMPT_VERSION,
      systemPromptSha256: {
        grounded: sha256Text(buildSystemPrompt("grounded")),
        closed_book: sha256Text(buildSystemPrompt("closed_book")),
      },
      ...currentHashes(),
      ...(FILES.evalSet === DEFAULT_EVAL_SET ? {} : {
        evalSetPath: FILES.evalSet,
        ncciSubsetPath: FILES.subset,
        emBenchmarkPath: FILES.benchmark,
      }),
      conditions: CONDITIONS,
      caseCount: evalSet.cases.length,
      passes: 1,
      transportReissues: [...new Set(reissued)].sort(),
    });
    writeFileSync(
      path.join(runDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  };
  writeManifest();

  for (const modelId of modelIds) {
    const generate = makeGenerate(modelId);
    let consecutiveErrors = 0;
    for (const condition of CONDITIONS) {
      for (const item of evalSet.cases) {
        if (done.has(key(modelId, condition, item.id))) continue;
        const evidence = condition === "grounded"
          ? retrieveEvidence(item.facts, subset, benchmark)
          : [];
        const result = await callCodingJudgmentAgent({
          question: item.question,
          facts: item.facts,
          condition,
          evidence,
          generate,
        });
        const hardError = result.error !== null && result.rawText === null;
        consecutiveErrors = hardError ? consecutiveErrors + 1 : 0;
        const record = replyRecordSchema.parse({
          caseId: item.id,
          condition,
          modelId,
          returnedModelId: result.returnedModelId,
          finishReason: result.finishReason,
          rateLimitRetries: result.rateLimitRetries,
          promptSha256: result.promptSha256,
          rawText: result.rawText,
          error: result.error,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
          recordedAt: new Date().toISOString(),
        });
        appendFileSync(repliesPath, `${JSON.stringify(record)}\n`);
        console.log(
          `${modelId} ${condition} ${item.id} ${result.error ?? "ok"}`,
        );
        if (consecutiveErrors >= 5) {
          throw new Error(
            `Stopping: repeated provider errors (${result.error}); partial replies kept in ${repliesPath}`,
          );
        }
      }
    }
  }
  writeManifest();
  return runDir;
}

async function main(): Promise<void> {
  if (process.argv.includes("--live")) {
    score(await live());
    return;
  }
  const replay = arg("--replay");
  const runDir = replay ??
    (existsSync(COMMITTED_RUN)
      ? path.join(DIR, "runs", readFileSync(COMMITTED_RUN, "utf8").trim())
      : undefined);
  if (!runDir) throw new Error("No committed run; pass --replay <dir>.");
  score(runDir);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
