import type { Metadata } from "next";
import EvalOnlinePanel from "@/components/evals/EvalOnlinePanel";
import OfflineScorecard from "@/components/evals/OfflineScorecard";
import { handcraftedCases } from "@/lib/ai/evals/responseCases";
import { runResponseEval } from "@/lib/ai/evals/responseHarness";
import { ACCEPTABLE_RESPONSE_RANGES } from "@/lib/ai/evals/responseTypes";

export const metadata: Metadata = {
  title: "Lacuna · Model output checks",
  description:
    "Offline similarity and judge bands for Lacuna answers, plus in-process traces for human spot-checks.",
  alternates: { canonical: "/methods/evals" },
};

/** Offline scorecard plus the online spot-check panel. */
export default async function EvalsPage() {
  const report = await runResponseEval(handcraftedCases(), {
    split: "handcrafted",
    embedderName: "hashing",
    judge: "rubric",
  });
  const bands = ACCEPTABLE_RESPONSE_RANGES;

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <p className="lacuna-kicker text-[10px] text-lacuna-blue/70">
          Methods
        </p>
        <h1 className="lacuna-gradient-text mt-2 text-3xl font-bold">
          Model output checks
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-lacuna-blue">
          Answers are compared to an intended meaning with embedding cosine
          similarity, then scored for accuracy, tone, safety, and relevance.
          Acceptable results sit inside a band. The nightly exam generates 1,000
          synthetic prompts so the gate is not a memorized sentence list. A
          sentence-transformer embedder and an LLM judge are available from the
          eval script when those runtimes are configured. This page does not
          invent a production accuracy rate.
        </p>
        <ul className="mt-4 space-y-1 text-xs text-lacuna-blue/80">
          <li>
            Semantic similarity {bands.semanticSimilarity.min}–
            {bands.semanticSimilarity.max}
          </li>
          <li>
            Accuracy {bands.accuracy.min}–{bands.accuracy.max}, tone{" "}
            {bands.tone.min}–{bands.tone.max}, safety {bands.safety.min}–
            {bands.safety.max}, relevance {bands.relevance.min}–
            {bands.relevance.max}
          </li>
        </ul>
      </header>
      <OfflineScorecard report={report} />
      <EvalOnlinePanel />
    </div>
  );
}
