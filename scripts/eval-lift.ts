#!/usr/bin/env tsx
/**
 * Cited-answer lift eval: no-retrieval vs the app's retrieval + cited-answer
 * path, per prompt version, on the frozen eval set.
 *
 *   npm run eval:lift -- --replay responses.jsonl [--gate]
 *   npm run eval:lift -- --live --record responses.jsonl [--gate] [--skip-if-unconfigured]
 *
 * Live mode makes one pass per arm × prompt version at temperature 0 through
 * the existing inference layer and logs token usage. Without
 * AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN / OPENAI_API_KEY it refuses to run
 * (or exits 0 with --skip-if-unconfigured). No result is ever invented.
 */
import http from "node:http";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import process from "node:process";
import { getVerifiedDataset } from "../src/lib/data/datasetProvider";
import { isServerInferenceConfigured } from "../src/lib/ai/inference";
import { generateEvidenceDraftWithInference } from "../src/lib/ai/rag/answer";
import { buildVerifiedDatasetCorpus } from "../src/lib/ai/evals/lift/corpus";
import { checkFrozenLiftEvalSet } from "../src/lib/ai/evals/lift/evalSet";
import {
  buildLiftReport,
  evaluateLiftGate,
  type LiftGateThresholds,
  renderLiftReportMarkdown,
} from "../src/lib/ai/evals/lift/report";
import { runLiftCell } from "../src/lib/ai/evals/lift/runner";
import {
  type LiftArm,
  liftArmSchema,
  liftEvalSetSchema,
  type LiftPromptVersion,
  liftPromptVersionSchema,
  type LiftReport,
  type LiftResponseRecord,
  liftResponseRecordSchema,
} from "../src/lib/ai/evals/lift/types";

const FIXTURES = "src/lib/ai/evals/fixtures";
const EVAL_SET_PATH = `${FIXTURES}/lift-eval-set.v1.json`;
const THRESHOLDS_PATH = `${FIXTURES}/lift-gate.thresholds.json`;
const BASELINE_PATH = `${FIXTURES}/lift-baseline.report.json`;

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

function list<T>(raw: string | undefined, parse: (value: string) => T): T[] {
  return (raw ?? "").split(",").map((value) => value.trim()).filter(Boolean)
    .map(parse);
}

function readJsonl(path: string): LiftResponseRecord[] {
  return readFileSync(path, "utf8").split("\n").map((line) => line.trim())
    .filter(Boolean).map((line, index) => {
      const parsed = liftResponseRecordSchema.safeParse(JSON.parse(line));
      if (!parsed.success) {
        throw new Error(`${path}:${index + 1} is not a lift response record`);
      }
      return parsed.data;
    });
}

function writeOut(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Names only — values are never printed. */
function credentialStatus(): string {
  return ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY"].map(
    (name) => `${name}=${process.env[name]?.trim() ? "set" : "unset"}`,
  ).join(" ");
}

const FAIL_FAST_ERRORS = 5;
const PROXY_ENV = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"];

/**
 * Node's built-in fetch (used by the AI SDK) ignores HTTPS_PROXY unless proxy
 * support is enabled. When a credential proxy injects auth (for example
 * `pplx credentials run`), bypassing it would send the placeholder key
 * straight to the gateway, so enable env proxy support at runtime. Only the
 * fact that a proxy is configured is logged, never its value.
 */
function routeThroughEnvProxy(): void {
  if (!PROXY_ENV.some((name) => process.env[name]?.trim())) return;
  const setter = (http as unknown as { setGlobalProxyFromEnv?: () => void })
    .setGlobalProxyFromEnv;
  if (typeof setter !== "function") {
    throw new Error(
      "An HTTPS proxy is configured but this Node version cannot route fetch through it. Use Node 24 or set NODE_USE_ENV_PROXY=1.",
    );
  }
  setter();
  console.log(
    "Provider requests are routed through the HTTPS proxy from the environment.",
  );
}

async function main(): Promise<void> {
  const live = flag("--live");
  const replayPath = arg("--replay");
  const initBaseline = arg("--init-baseline");
  if (!live && !replayPath && !initBaseline) {
    throw new Error(
      "Pass --live, --replay <file.jsonl>, or --init-baseline <path>",
    );
  }

  const evalSet = liftEvalSetSchema.parse(
    JSON.parse(readFileSync(EVAL_SET_PATH, "utf8")),
  );
  const dataset = await getVerifiedDataset();
  const problems = checkFrozenLiftEvalSet(evalSet, dataset);
  if (problems.length > 0) {
    throw new Error(`Frozen eval set failed checks: ${problems.join("; ")}`);
  }
  const corpus = buildVerifiedDatasetCorpus(dataset);

  if (initBaseline) {
    const pending = buildLiftReport(evalSet, corpus, [], {
      mode: "replay",
      generatedAt: dataset.provenance.lastUpdated,
    });
    writeOut(initBaseline, `${JSON.stringify(pending, null, 2)}\n`);
    console.log(`Wrote pending baseline ${initBaseline}`);
    return;
  }

  let records: LiftResponseRecord[];
  if (live) {
    console.log(`Inference credentials: ${credentialStatus()}`);
    routeThroughEnvProxy();
    if (!isServerInferenceConfigured()) {
      const message =
        "Live lift eval blocked: no inference credential is set. No results were produced.";
      if (flag("--skip-if-unconfigured")) {
        console.log(`SKIP: ${message}`);
        return;
      }
      throw new Error(message);
    }
    const arms = list(
      arg("--arms") ?? "no_retrieval,retrieval",
      (value) => liftArmSchema.parse(value),
    ) as LiftArm[];
    const prompts = list(
      arg("--prompts") ?? "v1,v2",
      (value) => liftPromptVersionSchema.parse(value),
    ) as LiftPromptVersion[];
    const recordPath = arg("--record") ?? "eval-artifacts/lift-responses.jsonl";
    mkdirSync(dirname(recordPath), { recursive: true });
    writeFileSync(recordPath, "");
    const concurrency = Number(arg("--concurrency") ?? "4");
    // Smoke test only: run the first N items and skip the report, which
    // requires complete cells.
    const limit = arg("--limit") ? Number(arg("--limit")) : undefined;
    const items = limit ? evalSet.items.slice(0, limit) : evalSet.items;
    records = [];
    // Fail fast when the provider is unreachable instead of burning a full
    // pass that would only record errors.
    let successes = 0;
    const earlyErrors: string[] = [];
    const failFast = (record: LiftResponseRecord) => {
      if (record.error) earlyErrors.push(record.error);
      else successes += 1;
      if (successes === 0 && earlyErrors.length >= FAIL_FAST_ERRORS) {
        throw new Error(
          `Live lift eval aborted: the first ${FAIL_FAST_ERRORS} provider calls failed (${
            [...new Set(earlyErrors)].join(", ")
          }). No results were produced.`,
        );
      }
    };
    for (const promptVersion of prompts) {
      for (const arm of arms) {
        const started = Date.now();
        const cell = await runLiftCell({
          items,
          arm,
          promptVersion,
          corpus,
          generate: generateEvidenceDraftWithInference,
          concurrency: Number.isFinite(concurrency) ? concurrency : 4,
          onRecord: (record) => {
            appendFileSync(recordPath, `${JSON.stringify(record)}\n`);
            failFast(record);
          },
        });
        const tokensIn = cell.reduce((sum, r) => sum + r.usage.inputTokens, 0);
        const tokensOut = cell.reduce(
          (sum, r) => sum + r.usage.outputTokens,
          0,
        );
        console.log(
          `${arm}/${promptVersion}: ${cell.length} calls, ${
            cell.filter((r) => r.error).length
          } errors, tokens in=${tokensIn} out=${tokensOut}, ${
            ((Date.now() - started) / 1000).toFixed(1)
          }s`,
        );
        records.push(...cell);
      }
    }
    console.log(`Recorded ${records.length} responses to ${recordPath}`);
    if (limit) {
      for (const record of records) {
        console.log(
          `smoke ${record.itemId} ${record.arm}/${record.promptVersion}: ${record.disposition}, model=${record.modelId}, tokens=${record.usage.inputTokens}/${record.usage.outputTokens}${
            record.error ? `, error=${record.error}` : ""
          }`,
        );
      }
      console.log("Smoke run only (--limit): no report built.");
      if (records.some((record) => record.error)) process.exit(1);
      return;
    }
  } else {
    records = readJsonl(replayPath as string);
  }

  const thresholds = JSON.parse(
    readFileSync(THRESHOLDS_PATH, "utf8"),
  ) as LiftGateThresholds;
  const report = buildLiftReport(evalSet, corpus, records, {
    mode: live ? "live" : "replay",
    maxErrorRate: thresholds.maxErrorRate,
  });

  let gate;
  if (flag("--gate")) {
    const baseline = existsSync(BASELINE_PATH)
      ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as LiftReport
      : null;
    gate = evaluateLiftGate(report, thresholds, baseline);
  }

  const markdown = renderLiftReportMarkdown(report, gate);
  console.log(markdown);
  const writePath = arg("--write");
  if (writePath) writeOut(writePath, `${JSON.stringify(report, null, 2)}\n`);
  const markdownPath = arg("--markdown");
  if (markdownPath) writeOut(markdownPath, markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }
  if (gate && !gate.pass) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
