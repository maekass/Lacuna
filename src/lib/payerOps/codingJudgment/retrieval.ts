/**
 * Deterministic retrieval for the Coding Judgment Check agent, plus the oracle
 * that derives expected answers for rule-derivable cases.
 *
 * Retrieval reads only the structured case facts, never the case kind or the
 * expected answer, so the agent cannot be tipped off that a case is a trap.
 */
import { describeCodes } from "@/lib/payerOps/codingJudgment/config";
import {
  evaluateMueUnits,
  evaluatePtpPair,
  ptpAbsenceId,
} from "@/lib/payerOps/codingJudgment/ncci";
import type {
  CaseFacts,
  CodingDecision,
  CodingRoute,
  EmBenchmark,
  EvalCase,
  NcciSubset,
} from "@/lib/payerOps/codingJudgment/schemas";

/** One retrieved item shown to the model. `id` is what it should cite. */
export interface EvidenceItem {
  id: string;
  type:
    | "ncci_version"
    | "ptp_edit"
    | "ptp_pair_absence"
    | "mue_edit"
    | "code_coverage"
    | "em_benchmark"
    | "provider_profile";
  data: Record<string, unknown>;
}

export const NCCI_VERSION_ID = "ncci:practitioner:2026Q4";

/** Every id that exists in the pinned data (used for citation validity). */
export function pinnedIds(
  subset: NcciSubset,
  benchmark: EmBenchmark,
): Set<string> {
  return new Set([
    NCCI_VERSION_ID,
    ...subset.ptpEdits.map((row) => row.id),
    ...subset.mueEdits.map((row) => row.id),
    ...subset.coverage.map((row) => row.id),
    ...subset.ptpPairAbsences.map((row) => row.id),
    benchmark.id,
    ...benchmark.profiles.map((profile) => profile.id),
  ]);
}

/**
 * Retrieve rule rows and benchmarks for a case:
 * - always: the pinned NCCI version window;
 * - each code: its coverage record (present in the full PTP / MUE files?);
 * - two codes and no units: every PTP row for the pair in either order, or
 *   the pinned absence record;
 * - units: the MUE row for the first code, when one exists;
 * - profile id: the benchmark summary and the profile, when it exists.
 */
export function retrieveEvidence(
  facts: CaseFacts,
  subset: NcciSubset,
  benchmark: EmBenchmark,
): EvidenceItem[] {
  const items: EvidenceItem[] = [{
    id: NCCI_VERSION_ID,
    type: "ncci_version",
    data: {
      program: subset.program,
      ptpVersion: subset.ptpVersion,
      quarter: subset.quarter,
      effectiveFrom: subset.effectiveFrom,
      effectiveThrough: subset.effectiveThrough,
      scope:
        "Medicare fee-for-service practitioner claims only. Not commercial, Medicare Advantage, or Medicaid policy.",
    },
  }];
  for (const code of facts.codes) {
    const coverage = subset.coverage.find((row) => row.code === code);
    if (coverage) {
      items.push({
        id: coverage.id,
        type: "code_coverage",
        data: {
          code,
          appearsInFullPtpFile: coverage.inPtpFile,
          appearsInFullMueFile: coverage.inMueFile,
        },
      });
    }
  }
  if (facts.codes.length >= 2 && facts.units === undefined) {
    const [a, b] = facts.codes;
    const rows = subset.ptpEdits.filter((row) =>
      (row.column1 === a && row.column2 === b) ||
      (row.column1 === b && row.column2 === a)
    );
    for (const row of rows) {
      items.push({
        id: row.id,
        type: "ptp_edit",
        data: {
          column1: row.column1,
          column2: row.column2,
          effectiveDate: row.effectiveDate,
          deletionDate: row.deletionDate ?? "* (none; edit active)",
          modifierIndicator: row.modifierIndicator,
          rationale: row.rationale,
        },
      });
    }
    const absence = subset.ptpPairAbsences.find((row) =>
      row.id === ptpAbsenceId(subset.ptpVersion, a, b)
    );
    if (rows.length === 0 && absence) {
      items.push({
        id: absence.id,
        type: "ptp_pair_absence",
        data: {
          codeA: absence.codeA,
          codeB: absence.codeB,
          statement:
            "The full pinned PTP file has no row for this pair in either order.",
        },
      });
    }
  }
  if (facts.units !== undefined && facts.codes.length >= 1) {
    const row = subset.mueEdits.find((edit) => edit.code === facts.codes[0]);
    if (row) {
      items.push({
        id: row.id,
        type: "mue_edit",
        data: {
          code: row.code,
          mueValue: row.mueValue,
          adjudicationIndicator: row.adjudicationIndicator,
          adjudicationLabel: row.adjudicationLabel,
          rationale: row.rationale,
        },
      });
    }
  }
  if (facts.profileId) {
    const profile = benchmark.profiles.find((p) => p.id === facts.profileId);
    if (profile) {
      const r = benchmark.results;
      items.push({
        id: benchmark.id,
        type: "em_benchmark",
        data: {
          dataYear: benchmark.dataset.dataYear,
          scope:
            `Medicare Part B fee-for-service, ${benchmark.method.specialtyLabel}, ${benchmark.method.codeFamilyLabel} ${
              describeCodes(benchmark.method.codes)
            } (target ${benchmark.method.targetCode}), aggregate provider-level counts; no diagnoses or documentation.`,
          minimumVolume: benchmark.method.minimumVolume,
          reviewRule: benchmark.method.reviewRule,
          providersEligible: r.providersEligible,
          pooledTargetShare: r.pooledTargetShare,
          rawShareP90: r.rawShareQuantiles.p90,
          rawShareP95: r.rawShareQuantiles.p95,
          peerRateAtReviewPercentile: r.peerRateAtReviewPercentile,
          flaggedForReview: r.flaggedForReview,
          interpretation: benchmark.interpretation,
        },
      });
      items.push({
        id: profile.id,
        type: "provider_profile",
        data: { ...profile, id: undefined },
      });
    }
  }
  return items;
}

export interface DerivedExpectation {
  decision: CodingDecision;
  acceptableRoutes: CodingRoute[];
  justifyingIds: string[];
}

/**
 * Oracle for rule-derivable cases (`ptp`, `mue`, `profile`). Traps are
 * hand-labeled and return null. The frozen eval set is checked against this.
 */
export function deriveExpected(
  item: EvalCase,
  subset: NcciSubset,
  benchmark: EmBenchmark,
): DerivedExpectation | null {
  const { facts } = item;
  if (item.kind === "ptp") {
    const [a, b] = facts.codes;
    if (!facts.dateOfService) throw new Error(`${item.id}: no date`);
    const outcome = evaluatePtpPair(
      subset.ptpEdits,
      a,
      b,
      facts.dateOfService,
      facts.modifiers,
    );
    switch (outcome.kind) {
      case "no_edit":
        return {
          decision: "no_flag",
          acceptableRoutes: ["auto"],
          justifyingIds: [ptpAbsenceId(subset.ptpVersion, a, b)],
        };
      case "inactive":
        return {
          decision: "no_flag",
          acceptableRoutes: ["auto"],
          justifyingIds: outcome.edits.map((edit) => edit.id).sort(),
        };
      case "denied_column2":
        return {
          decision: "flag",
          acceptableRoutes: ["auto"],
          justifyingIds: [outcome.active.id],
        };
      case "bypassed_by_modifier":
        return {
          decision: "no_flag",
          acceptableRoutes: ["auto", "human_review"],
          justifyingIds: [outcome.active.id],
        };
    }
  }
  if (item.kind === "mue") {
    if (facts.units === undefined) throw new Error(`${item.id}: no units`);
    const outcome = evaluateMueUnits(
      subset.mueEdits,
      facts.codes[0],
      facts.units,
    );
    if (outcome.kind === "no_mue_row") {
      throw new Error(`${item.id}: MUE case without a pinned MUE row`);
    }
    if (outcome.kind === "within_limit") {
      return {
        decision: "no_flag",
        acceptableRoutes: ["auto"],
        justifyingIds: [outcome.edit.id],
      };
    }
    return {
      decision: "flag",
      acceptableRoutes: outcome.edit.adjudicationIndicator === "2"
        ? ["auto"]
        : ["auto", "human_review"],
      justifyingIds: [outcome.edit.id],
    };
  }
  if (item.kind === "profile") {
    const profile = benchmark.profiles.find((p) => p.id === facts.profileId);
    if (!profile) throw new Error(`${item.id}: unknown profile`);
    const ids = [benchmark.id, profile.id];
    if (!profile.meetsVolumeThreshold) {
      return {
        decision: "abstain",
        acceptableRoutes: ["human_review"],
        justifyingIds: ids,
      };
    }
    return profile.outlierForReview
      ? {
        decision: "flag",
        acceptableRoutes: ["human_review"],
        justifyingIds: ids,
      }
      : { decision: "no_flag", acceptableRoutes: ["auto"], justifyingIds: ids };
  }
  return null;
}

/** Codes and pairs the eval needs pinned from the full NCCI files. */
export function requiredRuleKeys(cases: readonly EvalCase[]): {
  codes: string[];
  pairs: Array<[string, string]>;
  mueCodes: string[];
} {
  const codes = new Set<string>();
  const pairs = new Map<string, [string, string]>();
  const mueCodes = new Set<string>();
  for (const item of cases) {
    for (const code of item.facts.codes) codes.add(code);
    if (item.facts.codes.length >= 2 && item.facts.units === undefined) {
      const [a, b] = [...item.facts.codes.slice(0, 2)].sort();
      pairs.set(`${a}|${b}`, [a, b]);
    }
    if (item.facts.units !== undefined && item.facts.codes[0]) {
      mueCodes.add(item.facts.codes[0]);
    }
  }
  return {
    codes: [...codes].sort(),
    pairs: [...pairs.values()].sort((x, y) =>
      `${x[0]}|${x[1]}`.localeCompare(`${y[0]}|${y[1]}`)
    ),
    mueCodes: [...mueCodes].sort(),
  };
}
