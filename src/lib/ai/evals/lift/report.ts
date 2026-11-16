/**
 * Aggregate recorded responses into a lift report, gate it against committed
 * thresholds and a baseline, and render Markdown.
 */
import { corpusSnapshotHash } from "@/lib/ai/rag/corpus";
import type { EvidencePassage } from "@/lib/ai/rag/contracts";
import { retrieveEvidence } from "@/lib/ai/rag/retrieve";
import {
  type BootstrapOptions,
  bootstrapPairedDifference,
  bootstrapProportion,
  DEFAULT_BOOTSTRAP_RESAMPLES,
  DEFAULT_BOOTSTRAP_SEED,
  DEFAULT_CI_LEVEL,
} from "./bootstrap";
import {
  type ItemScore,
  METRIC_NAMES,
  metricIndicator,
  type MetricName,
  retrievalHit,
  scoreResponse,
} from "./score";
import {
  type ConfidenceInterval,
  LIFT_AS_OF_DATE,
  LIFT_REPORT_SCHEMA,
  LIFT_TOP_K,
  type LiftArm,
  type LiftCellMetrics,
  type LiftComparison,
  type LiftEvalSet,
  type LiftPromptVersion,
  type LiftReport,
  type LiftResponseRecord,
} from "./types";

export interface BuildLiftReportOptions extends BootstrapOptions {
  mode: "live" | "replay";
  /** Tests only: accept records produced by the fake model. */
  allowFake?: boolean;
  generatedAt?: string;
  /** Max share of provider errors per cell before the report is invalid. Default 0.02. */
  maxErrorRate?: number;
}

export const DEFAULT_MAX_ERROR_RATE = 0.02;

function cellKey(arm: LiftArm, version: LiftPromptVersion): string {
  return `${arm}|${version}`;
}

/** Deterministic retrieval recall@k over answerable items. Model-free. */
export function retrievalRecall(
  evalSet: LiftEvalSet,
  corpus: readonly EvidencePassage[],
  options: BootstrapOptions = {},
): LiftReport["retrievalRecallAtK"] {
  const hits = evalSet.items.map((item) => {
    if (item.type !== "answerable") return null;
    const retrieval = retrieveEvidence({
      corpus,
      query: item.question,
      scope: { asOfDate: LIFT_AS_OF_DATE, lane: "research_draft" },
      topK: LIFT_TOP_K,
    });
    return retrievalHit(item, retrieval.retrievedPassageIds) ? 1 : 0;
  });
  return { ...bootstrapProportion(hits, options), k: LIFT_TOP_K };
}

/**
 * Score every (arm, prompt) cell present in `records`. Each present cell must
 * cover every eval item exactly once; partial runs are rejected.
 */
export function buildLiftReport(
  evalSet: LiftEvalSet,
  corpus: readonly EvidencePassage[],
  records: readonly LiftResponseRecord[],
  options: BuildLiftReportOptions,
): LiftReport {
  if (!options.allowFake && records.some((record) => record.fake)) {
    throw new Error(
      "Fake-model records are for unit tests only and cannot be reported.",
    );
  }
  const corpusById = new Map(corpus.map((passage) => [
    passage.passageId,
    passage,
  ]));
  const itemIndex = new Map(evalSet.items.map((item, i) => [item.id, i]));
  const cells = new Map<string, Array<LiftResponseRecord | undefined>>();
  for (const record of records) {
    const index = itemIndex.get(record.itemId);
    if (index === undefined) {
      throw new Error(`Record for unknown item ${record.itemId}`);
    }
    const key = cellKey(record.arm, record.promptVersion);
    const row = cells.get(key) ??
      new Array<LiftResponseRecord | undefined>(evalSet.items.length);
    if (row[index]) {
      throw new Error(`Duplicate record for ${record.itemId} in ${key}`);
    }
    row[index] = record;
    cells.set(key, row);
  }

  const bootstrap = {
    resamples: options.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES,
    seed: options.seed ?? DEFAULT_BOOTSTRAP_SEED,
    level: options.level ?? DEFAULT_CI_LEVEL,
  };
  const scores = new Map<string, ItemScore[]>();
  const cellMetrics: LiftCellMetrics[] = [];
  for (const [key, row] of [...cells.entries()].sort()) {
    const missing = row.findIndex((record) => record === undefined);
    if (missing >= 0 || row.length !== evalSet.items.length) {
      throw new Error(
        `Cell ${key} is incomplete: no record for ${
          evalSet.items[missing]?.id ?? "some items"
        }`,
      );
    }
    const complete = row as LiftResponseRecord[];
    const scored = complete.map((record, i) =>
      scoreResponse(evalSet.items[i], record, corpusById)
    );
    scores.set(key, scored);
    const metric = (name: MetricName) =>
      bootstrapProportion(
        scored.map((score) => metricIndicator(score, name)),
        bootstrap,
      );
    const [arm, promptVersion] = key.split("|") as [
      LiftArm,
      LiftPromptVersion,
    ];
    cellMetrics.push({
      arm,
      promptVersion,
      modelIds: [...new Set(complete.map((record) => record.modelId))].sort(),
      responses: complete.length,
      errors: scored.filter((score) => score.errored).length,
      accuracy: metric("accuracy"),
      citationCorrectness: metric("citationCorrectness"),
      unsupportedClaimRate: metric("unsupportedClaimRate"),
      abstentionRate: metric("abstentionRate"),
      falseAbstentionRate: metric("falseAbstentionRate"),
      usage: complete.reduce(
        (sum, record) => ({
          inputTokens: sum.inputTokens + record.usage.inputTokens,
          outputTokens: sum.outputTokens + record.usage.outputTokens,
        }),
        { inputTokens: 0, outputTokens: 0 },
      ),
    });
  }

  const lift: LiftComparison[] = [];
  for (const version of ["v1", "v2"] as const) {
    const treatment = scores.get(cellKey("retrieval", version));
    const control = scores.get(cellKey("no_retrieval", version));
    if (!treatment || !control) continue;
    const diff = (name: MetricName) =>
      bootstrapPairedDifference(
        treatment.map((score) => metricIndicator(score, name)),
        control.map((score) => metricIndicator(score, name)),
        bootstrap,
      );
    lift.push({
      promptVersion: version,
      accuracy: diff("accuracy"),
      citationCorrectness: diff("citationCorrectness"),
      unsupportedClaimRate: diff("unsupportedClaimRate"),
      abstentionRate: diff("abstentionRate"),
      falseAbstentionRate: diff("falseAbstentionRate"),
    });
  }

  return {
    schema: LIFT_REPORT_SCHEMA,
    status: cellMetrics.length === 0
      ? "pending_live_run"
      : cellMetrics.some((cell) =>
          cell.errors / Math.max(1, cell.responses) >
            (options.maxErrorRate ?? DEFAULT_MAX_ERROR_RATE)
        )
      ? "invalid_provider_errors"
      : "measured",
    mode: options.mode,
    evalSet: {
      version: evalSet.version,
      itemsSha256: evalSet.itemsSha256,
      items: evalSet.items.length,
    },
    corpus: {
      passages: corpus.length,
      snapshotHash: corpusSnapshotHash(corpus),
    },
    bootstrap,
    retrievalRecallAtK: retrievalRecall(evalSet, corpus, bootstrap),
    cells: cellMetrics,
    lift,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

export interface LiftGateThresholds {
  /** Prompt versions whose retrieval arm is gated (production first). */
  gatedPromptVersions: LiftPromptVersion[];
  min: {
    accuracy: number;
    citationCorrectness: number;
    abstentionRate: number;
  };
  /** Max allowed drop of the point estimate vs the committed baseline. */
  maxDropVsBaseline: number;
  /** Max share of responses that hit an inference error. */
  maxErrorRate: number;
}

export interface LiftGateResult {
  pass: boolean;
  failures: string[];
  notes: string[];
}

const GATED_METRICS = [
  "accuracy",
  "citationCorrectness",
  "abstentionRate",
] as const;

/** Fail when gated retrieval cells fall below floors or regress vs baseline. */
export function evaluateLiftGate(
  report: LiftReport,
  thresholds: LiftGateThresholds,
  baseline: Pick<LiftReport, "status" | "cells" | "evalSet"> | null,
): LiftGateResult {
  const failures: string[] = [];
  const notes: string[] = [];
  if (report.status !== "measured") {
    failures.push(
      report.status === "invalid_provider_errors"
        ? "Report is invalid: provider error rate exceeded the limit, so metrics are not measurements."
        : "Report has no measured cells.",
    );
    return { pass: false, failures, notes };
  }
  const baselineUsable = baseline?.status === "measured" &&
    baseline.evalSet.itemsSha256 === report.evalSet.itemsSha256;
  if (!baselineUsable) {
    notes.push(
      baseline?.status === "measured"
        ? "Baseline was measured on a different eval-set hash; regression check skipped."
        : "No measured baseline committed yet; regression check skipped.",
    );
  }
  for (const version of thresholds.gatedPromptVersions) {
    const cell = report.cells.find((item) =>
      item.arm === "retrieval" && item.promptVersion === version
    );
    if (!cell) {
      failures.push(`Retrieval cell for prompt ${version} is missing.`);
      continue;
    }
    const errorRate = cell.errors / Math.max(1, cell.responses);
    if (errorRate > thresholds.maxErrorRate) {
      failures.push(
        `retrieval/${version} error rate ${fmt(errorRate)} > ${
          fmt(thresholds.maxErrorRate)
        }.`,
      );
    }
    const prior = baselineUsable
      ? baseline?.cells.find((item) =>
        item.arm === "retrieval" && item.promptVersion === version
      )
      : undefined;
    for (const metric of GATED_METRICS) {
      const value = cell[metric].estimate;
      const floor = thresholds.min[metric];
      if (value === null) {
        failures.push(`retrieval/${version} ${metric} has no data.`);
        continue;
      }
      if (value < floor) {
        failures.push(
          `retrieval/${version} ${metric} ${fmt(value)} < floor ${fmt(floor)}.`,
        );
      }
      const before = prior?.[metric].estimate;
      if (
        typeof before === "number" &&
        before - value > thresholds.maxDropVsBaseline
      ) {
        failures.push(
          `retrieval/${version} ${metric} dropped ${
            fmt(before - value)
          } vs baseline (${fmt(before)} → ${fmt(value)}); max ${
            fmt(thresholds.maxDropVsBaseline)
          }.`,
        );
      }
    }
  }
  return { pass: failures.length === 0, failures, notes };
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : value.toFixed(3);
}

export function formatInterval(ci: ConfidenceInterval): string {
  if (ci.estimate === null) return `n/a (n=${ci.n})`;
  return `${fmt(ci.estimate)} [${fmt(ci.low)}, ${fmt(ci.high)}] (n=${ci.n})`;
}

const LABELS: Record<MetricName, string> = {
  accuracy: "Answer accuracy (answerable)",
  citationCorrectness: "Citation correctness (answered, answerable)",
  unsupportedClaimRate: "Unsupported-claim rate (answered)",
  abstentionRate: "Abstention rate (should-abstain)",
  falseAbstentionRate: "False-abstention rate (answerable)",
};

export function renderLiftReportMarkdown(
  report: LiftReport,
  gate?: LiftGateResult,
): string {
  const lines: string[] = [
    "# Lacuna cited-answer lift eval",
    "",
    `- Status: ${report.status} (${report.mode})`,
    ...(report.status === "invalid_provider_errors"
      ? [
        "- WARNING: provider errors exceeded the limit. Errors score as abstentions, so the numbers below are not measurements.",
      ]
      : []),
    `- Eval set: ${report.evalSet.version}, ${report.evalSet.items} items, sha256 \`${report.evalSet.itemsSha256}\``,
    `- Corpus: ${report.corpus.passages} passages, snapshot \`${
      report.corpus.snapshotHash.slice(0, 16)
    }\``,
    `- Bootstrap: ${report.bootstrap.resamples} resamples, seed ${report.bootstrap.seed}, ${
      report.bootstrap.level * 100
    }% percentile CI`,
    `- Retrieval recall@${report.retrievalRecallAtK.k} (model-free): ${
      formatInterval(report.retrievalRecallAtK)
    }`,
    "",
  ];
  if (report.cells.length > 0) {
    const header = report.cells.map((cell) =>
      `${cell.arm}/${cell.promptVersion}`
    );
    lines.push(
      `| Metric | ${header.join(" | ")} |`,
      `| --- | ${header.map(() => "---").join(" | ")} |`,
    );
    for (const name of METRIC_NAMES) {
      lines.push(
        `| ${LABELS[name]} | ${
          report.cells.map((cell) => formatInterval(cell[name])).join(" | ")
        } |`,
      );
    }
    lines.push(
      `| Errors | ${report.cells.map((cell) => cell.errors).join(" | ")} |`,
      `| Tokens in/out | ${
        report.cells.map((cell) =>
          `${cell.usage.inputTokens}/${cell.usage.outputTokens}`
        ).join(" | ")
      } |`,
      `| Models | ${
        report.cells.map((cell) => cell.modelIds.join(", ")).join(" | ")
      } |`,
      "",
    );
  }
  if (report.lift.length > 0) {
    lines.push(
      "## Lift: retrieval − no-retrieval (paired bootstrap)",
      "",
      `| Metric | ${
        report.lift.map((row) => `prompt ${row.promptVersion}`).join(" | ")
      } |`,
      `| --- | ${report.lift.map(() => "---").join(" | ")} |`,
    );
    for (const name of METRIC_NAMES) {
      lines.push(
        `| ${LABELS[name]} | ${
          report.lift.map((row) => formatInterval(row[name])).join(" | ")
        } |`,
      );
    }
    lines.push("");
  }
  if (gate) {
    lines.push(`## Gate: ${gate.pass ? "PASS" : "FAIL"}`, "");
    for (const failure of gate.failures) lines.push(`- FAIL: ${failure}`);
    for (const note of gate.notes) lines.push(`- Note: ${note}`);
    lines.push("");
  }
  return lines.join("\n");
}
