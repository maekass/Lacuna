import type { RnpvResult } from "@/lib/research/rnpvSimulator";
import type {
  MonteCarloResult,
  SimulationProgress,
} from "@/lib/research/rnpvSimulator";
import { STAGE_LABELS } from "@/lib/research/rnpvScenarioForm";
import type { StageId } from "@/lib/research/rnpvScenarioForm";

type MonteCarloSummary = Omit<MonteCarloResult, "samples">;

function usd(value: number): string {
  return `${
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } USD million`;
}

function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function signLabel(value: number): string {
  if (value < 0) return "Negative";
  if (value > 0) return "Positive";
  return "Zero";
}

interface RnpvResultsProps {
  startStage: StageId;
  deterministic: RnpvResult | null;
  summary: MonteCarloSummary | null;
  progress: SimulationProgress | null;
  running: boolean;
  runError: string;
  canRun: boolean;
  showIncomplete: boolean;
  onRun: () => void;
  onCancel: () => void;
  onExport: () => void;
}

export default function RnpvResults(
  {
    startStage,
    deterministic,
    summary,
    progress,
    running,
    runError,
    canRun,
    showIncomplete,
    onRun,
    onCancel,
    onExport,
  }: RnpvResultsProps,
) {
  const zeroSpreads = summary
    ? summary.settings.financialSpread === 0 &&
      summary.settings.probabilitySpread === 0
    : false;
  return (
    <div className="space-y-6">
      {showIncomplete
        ? (
          <p className="text-sm text-lacuna-blue">
            Results appear after every assumption has a value. Load the
            illustrative preset, or complete the blank fields. Empty is not
            treated as zero.
          </p>
        )
        : null}
      {deterministic
        ? (
          <div
            className="space-y-3 rounded-xl border border-lacuna-lavender/50 bg-white p-4"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold text-lacuna-plum">
              Deterministic expected value
            </h2>
            <p className="text-sm text-lacuna-blue">
              Valued at entry into{" "}
              {STAGE_LABELS[startStage]}, not mid-stage. Stage costs are
              weighted by the probability of entering each stage. Launch
              investment and commercial cash flows are weighted by the
              probability of completing every remaining stage. Cash flows use
              year-end discounting, and the first revenue is one year after
              development finishes.
            </p>
            <p className="text-sm font-medium text-lacuna-plum">
              {signLabel(deterministic.rnpv)} hypothetical rNPV:{" "}
              {usd(deterministic.rnpv)}
            </p>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <ResultItem
                term="Probability of completing every remaining stage"
                detail={percent(deterministic.approvalProbability, 2)}
              />
              <ResultItem
                term="Development duration"
                detail={`${deterministic.developmentYears} years`}
              />
              <ResultItem
                term="Certain upfront cost at the valuation date"
                detail={usd(deterministic.upfrontCost)}
              />
              <ResultItem
                term="Expected present value of stage costs"
                detail={usd(deterministic.expectedDevelopmentCostPv)}
              />
              <ResultItem
                term="Expected present value of launch investment"
                detail={usd(deterministic.expectedLaunchCostPv)}
              />
              <ResultItem
                term="Expected present value of commercial cash flows"
                detail={usd(deterministic.expectedCommercialPv)}
              />
            </dl>
          </div>
        )
        : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="touch-target-inline rounded-lg bg-lacuna-plum px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-plum"
          disabled={!canRun || running}
          aria-busy={running}
          onClick={onRun}
        >
          {running ? "Running seeded simulation" : "Run seeded simulation"}
        </button>
        {running
          ? (
            <button
              type="button"
              className="touch-target-inline rounded-lg border border-lacuna-plum px-4 py-2 text-sm font-semibold text-lacuna-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-plum"
              onClick={onCancel}
            >
              Cancel simulation
            </button>
          )
          : null}
        <button
          type="button"
          className="touch-target-inline rounded-lg border border-lacuna-lavender px-4 py-2 text-sm font-semibold text-lacuna-plum disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-plum"
          disabled={!canRun || running}
          onClick={onExport}
        >
          Export scenario JSON
        </button>
      </div>
      {running
        ? (
          <p className="text-sm text-lacuna-blue" aria-live="polite">
            Simulation running
            {progress
              ? `, ${progress.completed} of ${progress.total} paths`
              : ""}. You can keep scrolling. This measures sampling noise, not
            asset uncertainty.
          </p>
        )
        : null}
      {runError
        ? <p role="alert" className="text-sm text-amber-900">{runError}</p>
        : null}

      {summary
        ? (
          <div
            className="space-y-3 rounded-xl border border-lacuna-lavender/50 bg-white p-4"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold text-lacuna-plum">
              Simulated path distribution
            </h2>
            <p className="text-sm text-lacuna-blue">
              {zeroSpreads
                ? "Uncertainty ranges are zero, so this spread is development success and failure only. The approval frequency should sit near the deterministic probability. The gap is sampling error."
                : "Uncertainty ranges are on, so the approval frequency is not expected to match the entered probability product."}
              {" "}
              The sampling interval is the uncertainty of the simulated mean,
              not a confidence interval for a true asset value.
            </p>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <ResultItem term="Mean path NPV" detail={usd(summary.mean)} />
              <ResultItem term="10th percentile" detail={usd(summary.p10)} />
              <ResultItem term="Median" detail={usd(summary.median)} />
              <ResultItem term="90th percentile" detail={usd(summary.p90)} />
              <ResultItem
                term="Share of paths with negative NPV"
                detail={percent(summary.negativeProbability)}
              />
              <ResultItem
                term="Share of paths that reach launch"
                detail={percent(summary.approvalFrequency)}
              />
              <ResultItem
                term="Standard error of the mean"
                detail={usd(summary.standardError)}
              />
              <ResultItem
                term="Approximate 95% sampling interval for the mean"
                detail={`${usd(summary.meanInterval95[0])} to ${
                  usd(summary.meanInterval95[1])
                }`}
              />
            </dl>
          </div>
        )
        : (
          <p className="text-sm text-lacuna-blue">
            No simulation is shown. Changing an assumption clears the previous
            distribution so an export cannot keep a stale run.
          </p>
        )}
    </div>
  );
}

function ResultItem({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="border-b border-lacuna-lavender/30 pb-2">
      <dt className="text-lacuna-blue">{term}</dt>
      <dd className="font-medium text-lacuna-plum">{detail}</dd>
    </div>
  );
}
