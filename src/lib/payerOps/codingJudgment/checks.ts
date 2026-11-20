/**
 * Integrity checks for the frozen Coding Judgment Check eval set.
 * `npm run coding-judgment:check` and the unit tests both call this.
 */
import {
  deriveExpected,
  pinnedIds,
} from "@/lib/payerOps/codingJudgment/retrieval";
import type {
  EmBenchmark,
  EvalSet,
  NcciSubset,
} from "@/lib/payerOps/codingJudgment/schemas";

const K_ANONYMITY = 5;

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const x = [...new Set(a)].sort();
  const y = [...new Set(b)].sort();
  return x.length === y.length && x.every((value, i) => value === y[i]);
}

/** Returns human-readable problems; an empty array means the set is sound. */
export function checkEvalSet(
  evalSet: EvalSet,
  subset: NcciSubset,
  benchmark: EmBenchmark,
): string[] {
  const problems: string[] = [];
  const ids = evalSet.cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate case ids");
  const pinned = pinnedIds(subset, benchmark);

  for (const item of evalSet.cases) {
    const { expected } = item;
    for (const id of expected.justifyingIds) {
      if (!pinned.has(id)) {
        problems.push(`${item.id}: justifying id ${id} is not pinned`);
      }
    }
    if (item.trap !== (expected.decision === "abstain")) {
      problems.push(`${item.id}: trap flag must match expected abstain`);
    }
    if (
      expected.decision === "abstain" &&
      !sameSet(expected.acceptableRoutes, ["human_review"])
    ) {
      problems.push(`${item.id}: abstain must route human_review only`);
    }
    if (item.kind === "ptp" || item.kind === "mue") {
      const dos = item.facts.dateOfService;
      if (!dos || dos < subset.effectiveFrom || dos > subset.effectiveThrough) {
        problems.push(`${item.id}: date of service outside pinned window`);
      }
    }
    const derived = deriveExpected(item, subset, benchmark);
    if (item.kind !== "trap" && derived === null) {
      problems.push(`${item.id}: no oracle for kind ${item.kind}`);
    }
    if (derived) {
      if (derived.decision !== expected.decision) {
        problems.push(
          `${item.id}: expected ${expected.decision}, rows give ${derived.decision}`,
        );
      }
      if (!sameSet(derived.acceptableRoutes, expected.acceptableRoutes)) {
        problems.push(`${item.id}: acceptable routes disagree with oracle`);
      }
      if (!sameSet(derived.justifyingIds, expected.justifyingIds)) {
        problems.push(
          `${item.id}: justifying ids ${
            expected.justifyingIds.join(",")
          } ≠ oracle ${derived.justifyingIds.join(",")}`,
        );
      }
    }
  }
  for (const profile of benchmark.profiles) {
    if (profile.cellPeerCount < K_ANONYMITY) {
      problems.push(`${profile.id}: cell has fewer than ${K_ANONYMITY} peers`);
    }
  }
  return problems;
}

/** Ten-digit runs look like NPIs; committed artifacts must contain none. */
export function findNpiLikeStrings(text: string): string[] {
  return [...text.matchAll(/(?<![0-9a-f])\d{10}(?![0-9a-f])/g)].map((m) =>
    m[0]
  );
}
