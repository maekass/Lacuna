/**
 * Reviewer demo data: recorded coding-judgment runs reshaped into what a
 * claim reviewer would see for each case — claim facts, the model's decision,
 * the cited pinned rows, the guard's final route and its one-sentence reason.
 *
 * Recorded data only. Nothing here calls a model. The answer key (case kind,
 * expected label) is deliberately left out, as a reviewer would not see it.
 * Provider profiles appear only as hashed pseudonymous ids.
 */
import { parseRecordedReply, scoreWithGuard } from "./guardedScore";
import type { LoadedRun } from "./recordedRun";
import {
  type PinnedRowView,
  REVIEWER_DEMO_SCHEMA_VERSION,
  type ReviewerDemo,
  reviewerDemoSchema,
  type ReviewerRecord,
  type ReviewerRun,
} from "./reviewerDemoView";
import { ROUTING_GUARD_VERSION } from "./routingGuard";
import type { EmBenchmark, NcciSubset } from "./schemas";

function ymd(value: string): string {
  return /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
    : value;
}

/** Describe one pinned id in reviewer terms, or null if it is not pinned. */
export function describePinnedRow(
  id: string,
  subset: NcciSubset,
  benchmark: EmBenchmark,
): PinnedRowView | null {
  const ptp = subset.ptpEdits.find((r) => r.id === id);
  if (ptp) {
    return {
      id,
      title: `PTP edit ${ptp.column1} / ${ptp.column2}`,
      details: [
        ["Column one", ptp.column1],
        ["Column two (not payable when the edit applies)", ptp.column2],
        ["Effective", ymd(ptp.effectiveDate)],
        ["Deleted", ptp.deletionDate ? ymd(ptp.deletionDate) : "Not deleted"],
        ["Modifier indicator", ptp.modifierIndicator],
        ["CMS rationale", ptp.rationale],
        ["File", `NCCI practitioner PTP ${subset.ptpVersion}`],
      ],
    };
  }
  const mue = subset.mueEdits.find((r) => r.id === id);
  if (mue) {
    return {
      id,
      title: `MUE ${mue.code}`,
      details: [
        ["Code", mue.code],
        ["MUE value (units per day)", String(mue.mueValue)],
        [
          "Adjudication indicator",
          `${mue.adjudicationIndicator} (${mue.adjudicationLabel})`,
        ],
        ["CMS rationale", mue.rationale],
        ["File", `NCCI practitioner MUE ${subset.quarter}`],
      ],
    };
  }
  const coverage = subset.coverage.find((r) => r.id === id);
  if (coverage) {
    return {
      id,
      title: `File coverage for ${coverage.code}`,
      details: [
        ["Code", coverage.code],
        ["In the PTP file", coverage.inPtpFile ? "Yes" : "No"],
        ["In the published MUE file", coverage.inMueFile ? "Yes" : "No"],
        ["Quarter", subset.quarter],
      ],
    };
  }
  const absence = subset.ptpPairAbsences.find((r) => r.id === id);
  if (absence) {
    return {
      id,
      title: `No PTP edit for ${absence.codeA} / ${absence.codeB}`,
      details: [
        ["Pair", `${absence.codeA} / ${absence.codeB}`],
        ["Finding", "No row in either order in the pinned file"],
        ["File", `NCCI practitioner PTP ${subset.ptpVersion}`],
      ],
    };
  }
  if (id === benchmark.id) {
    return {
      id,
      title: "Peer benchmark",
      details: [
        ["Benchmark", benchmark.id],
        ["Measure", benchmark.method.targetLabel],
        ["Minimum volume", String(benchmark.method.minimumVolume)],
        [
          "Review rule",
          `P(rate > peer p${
            Math.round(benchmark.method.reviewPercentile * 100)
          }) ≥ ${benchmark.method.posteriorThreshold}`,
        ],
      ],
    };
  }
  const profile = benchmark.profiles.find((p) => p.id === id);
  if (profile) {
    const pct = (low: number) =>
      `${Math.round(low * 100)}–${Math.round(low * 100) + 10}%`;
    return {
      id,
      title: "Provider profile (hashed id)",
      details: [
        ["Profile", profile.id],
        ["Level-5 share band", pct(profile.targetShareBandLow)],
        ["Volume band", profile.volumeBand],
        ["Meets volume minimum", profile.meetsVolumeThreshold ? "Yes" : "No"],
        ["Posterior bucket", profile.posteriorBucket],
        [
          "Flagged for review",
          profile.outlierForReview ? "Yes (not evidence of wrongdoing)" : "No",
        ],
      ],
    };
  }
  if (id === `ncci:practitioner:${subset.quarter}`) {
    return {
      id,
      title: "NCCI practitioner files (whole quarter)",
      details: [
        ["Quarter", subset.quarter],
        ["Window", `${subset.effectiveFrom} to ${subset.effectiveThrough}`],
        ["PTP version", subset.ptpVersion],
      ],
    };
  }
  return null;
}

export interface ReviewerRunInput {
  run: LoadedRun;
  label: string;
  note: string;
}

/** Build the reviewer view for every recorded reply in the given runs. */
export function buildReviewerDemo(
  inputs: readonly ReviewerRunInput[],
): ReviewerDemo {
  const runs: ReviewerRun[] = [];
  const records: ReviewerRecord[] = [];
  for (const { run, label, note } of inputs) {
    const { manifest } = run;
    const rows: Record<string, PinnedRowView> = {};
    const keep = (id: string) => {
      const row = describePinnedRow(id, run.subset, run.benchmark);
      if (row) rows[id] = row;
    };
    for (const modelId of manifest.modelIds) {
      for (const condition of manifest.conditions) {
        const report = scoreWithGuard({
          cases: run.cases,
          intakeFor: run.intakeFor,
          replies: run.replies,
          modelId,
          condition,
          subset: run.subset,
          benchmark: run.benchmark,
          pinnedIds: run.pinnedIds,
        });
        for (const scored of report.cases) {
          const record = run.replies.find((r) =>
            r.caseId === scored.caseId && r.modelId === modelId &&
            r.condition === condition
          );
          const parsed = parseRecordedReply(record);
          if (parsed.ok) parsed.reply.citations.forEach(keep);
          scored.guard.decidingRowIds.forEach(keep);
          records.push({
            key: `${manifest.runId}|${modelId}|${condition}|${scored.caseId}`,
            runId: manifest.runId,
            caseId: scored.caseId,
            modelId,
            condition,
            model: parsed.ok
              ? {
                ok: true,
                decision: parsed.reply.decision,
                route: parsed.reply.route,
                confidence: parsed.reply.confidence,
                rationale: parsed.reply.rationale,
                citations: parsed.reply.citations,
              }
              : { ok: false, reason: parsed.reason },
            finalRoute: scored.routeAfter,
            overrodeModel: scored.guard.overrodeModel,
            reasons: scored.guard.reasons,
            reasonText: scored.guard.reasonText,
            ruleDecision: scored.guard.ruleDecision,
            decidingRowIds: scored.guard.decidingRowIds,
          });
        }
      }
    }
    runs.push({
      runId: manifest.runId,
      label,
      note,
      recordedAt: manifest.createdAt,
      promptVersion: manifest.promptVersion,
      modelIds: manifest.modelIds,
      conditions: manifest.conditions,
      caseCount: manifest.caseCount,
      // Answer-key fields (kind, expected decision, acceptable routes) are
      // left out on purpose: a reviewer would not see them.
      items: run.cases.map((c) => ({
        caseId: c.id,
        question: c.question,
        facts: c.facts,
        intake: run.intakeFor(c.id),
      })),
      rows: Object.fromEntries(
        Object.entries(rows).sort(([x], [y]) => x.localeCompare(y)),
      ),
    });
  }
  return reviewerDemoSchema.parse({
    schemaVersion: REVIEWER_DEMO_SCHEMA_VERSION,
    guardVersion: ROUTING_GUARD_VERSION,
    status:
      "Recorded runs replayed through the routing guard. Not a live model. Eval cases are assistant-built and not adjudicated by a certified coder.",
    runs,
    records,
  });
}

/** Committed runs shown on the reviewer demo page, oldest first. */
export const REVIEWER_DEMO_RUNS = [
  {
    runDir: "data/coding-judgment/runs/2026-11-20-openrouter-free",
    label: "v1 set (34 cases): shaped the guard",
    note:
      "The routing guard was written after seeing failures on this set, so this set cannot validate it. Both arms are shown: grounded (pinned rows supplied) and closed book (no rows).",
  },
  {
    runDir: "data/coding-judgment/runs/2026-11-23-heldout-openrouter-free",
    label: "Held-out set (37 cases): frozen before the run",
    note:
      "Cases, labels and hashes were committed before any model call on them, and the guard was not changed after the run. The same assistant wrote the guard and these cases. Grounded arm only, one pass.",
  },
] as const;

export const REVIEWER_DEMO_PATH = "src/data/coding-judgment-reviewer-demo.json";
