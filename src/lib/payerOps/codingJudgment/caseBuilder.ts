/**
 * Builds the provider-profile eval cases from a committed benchmark. Questions
 * are templated from the benchmark's own method fields, so a benchmark built
 * from another peer-screen config yields matching cases with no code changes.
 * Expected answers come from the same oracle the frozen-set check uses.
 */
import { describeCodes } from "@/lib/payerOps/codingJudgment/config";
import { deriveExpected } from "@/lib/payerOps/codingJudgment/retrieval";
import type {
  EmBenchmark,
  EvalCase,
  NcciSubset,
  ProviderProfile,
} from "@/lib/payerOps/codingJudgment/schemas";

function caseId(n: number): string {
  if (n < 1 || n > 999) throw new Error(`Case number ${n} out of range`);
  return `cjc-${String(n).padStart(3, "0")}`;
}

function pctBand(low: number): string {
  const a = Math.round(low * 100);
  return `${a}–${a + 10}%`;
}

function basisFor(benchmark: EmBenchmark, profile: ProviderProfile): string {
  const { minimumVolume, reviewPercentile, posteriorThreshold } =
    benchmark.method;
  const share = `raw ${benchmark.method.targetLabel} share band ${
    pctBand(profile.targetShareBandLow)
  }, posterior bucket ${profile.posteriorBucket}`;
  if (!profile.meetsVolumeThreshold) {
    return `Below the ${minimumVolume}-service minimum volume (${share}); the benchmark does not rate it, so the method cannot support a flag or a clearance.`;
  }
  return profile.outlierForReview
    ? `Meets the ${minimumVolume}-service minimum; ${share}; P(rate > peer p${
      Math.round(reviewPercentile * 100)
    }) ≥ ${posteriorThreshold}, so flagged for human review (not evidence of wrongdoing).`
    : `Meets the ${minimumVolume}-service minimum; ${share}; does not pass the review rule, so not flagged.`;
}

/** One case per committed profile, numbered from `firstCaseNumber`. */
export function buildProfileCases(
  benchmark: EmBenchmark,
  subset: NcciSubset,
  firstCaseNumber: number,
): EvalCase[] {
  const m = benchmark.method;
  const year = benchmark.dataset.dataYear;
  return benchmark.profiles.map((profile, index) => {
    const draft: EvalCase = {
      id: caseId(firstCaseNumber + index),
      kind: "profile",
      question:
        `Pseudonymous ${m.specialtyLabel} provider ${profile.id}, ${year} Medicare Part B ${m.codeFamilyLabel} (${
          describeCodes(m.codes)
        }). Against the ${year} ${m.specialtyLabel} ${m.targetLabel} (${m.targetCode}) peer benchmark, should this provider be flagged for review, and can that be actioned automatically?`,
      facts: { codes: [], modifiers: [], profileId: profile.id },
      expected: {
        decision: "abstain",
        acceptableRoutes: ["human_review"],
        justifyingIds: [],
        basis: basisFor(benchmark, profile),
      },
      trap: false,
      tags: [
        "profile",
        m.specialtyLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ],
    };
    const derived = deriveExpected(draft, subset, benchmark);
    if (!derived) throw new Error(`No oracle for ${profile.id}`);
    const trap = derived.decision === "abstain";
    return {
      ...draft,
      expected: { ...derived, basis: draft.expected.basis },
      trap,
      tags: trap
        ? [...draft.tags, "trap", "below-volume-threshold"]
        : derived.decision === "flag"
        ? [...draft.tags, "outlier"]
        : [...draft.tags, "typical"],
    };
  });
}
