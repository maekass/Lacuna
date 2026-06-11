"use client";

import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
} from "@/lib/data/verifiedDataHelpers";
import type { Company } from "@/lib/types";
import type { PredictionRow } from "@/components/ExitPredictor";

export interface PitchBriefProps {
  readonly company: VerifiedCompanyView;
  readonly prediction: PredictionRow;
  readonly comparableExits: readonly VerifiedAcquisitionView[];
  readonly marketPosition: "Emerging" | "Growth" | "Late-stage";
  readonly foregroundFitLabel: string;
  readonly foregroundFitTone: "portfolio" | "sector" | "none";
  readonly onClose: () => void;
}

function formatDealValue(value?: number) {
  if (typeof value !== "number") return "Undisclosed";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  if (value >= 100) return `$${value.toFixed(0)}M`;
  return `$${value.toFixed(1)}M`;
}

function formatDealDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

/** Maps a model confidence score to a coarse High / Medium / Low label. */
export function getConfidenceLabel(confidence: number) {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.55) return "Medium";
  return "Low";
}

/** Buckets a funding stage into the cluster labels used by the brief. */
export function getMarketPosition(
  stage: Company["stage"],
): "Emerging" | "Growth" | "Late-stage" {
  if (stage === "Seed" || stage === "Series A") return "Emerging";
  if (stage === "Series B" || stage === "Series C") return "Growth";
  return "Late-stage";
}

export default function PitchBrief(
  {
    company,
    prediction,
    comparableExits,
    marketPosition,
    foregroundFitLabel,
    foregroundFitTone,
    onClose,
  }: PitchBriefProps,
) {
  const foregroundFitClasses = foregroundFitTone === "portfolio"
    ? "bg-lacuna-pink/10 text-lacuna-plum border-lacuna-lavender/40"
    : foregroundFitTone === "sector"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-lacuna-surface-muted text-lacuna-text-secondary border-lacuna-border";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-lacuna-plum/45 p-4 print:block print:bg-transparent print:p-0">
      <button
        type="button"
        aria-label="Close pitch brief"
        onClick={onClose}
        className="absolute inset-0 cursor-default print:hidden"
      />
      <div className="print:shadow-none relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl print:max-w-none print:rounded-none">
        <div className="print:shadow-none p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lacuna-blue/70">
                Pitch Brief
              </p>
              <h4 className="mt-1 text-2xl font-semibold text-lacuna-plum">
                {company.name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-lacuna-lavender/40 px-3 py-2 text-sm font-medium text-lacuna-plum transition-colors hover:bg-lacuna-pink/10"
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-lacuna-border px-3 py-1 text-lg leading-none text-lacuna-text-muted transition-colors hover:bg-lacuna-surface-muted hover:text-lacuna-text-primary"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mb-6 border-b border-lacuna-border-subtle pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-2xl font-semibold text-lacuna-plum print:block sm:hidden">
                {company.name}
              </h4>
              <span className="rounded-full bg-lacuna-pink/10 px-3 py-1 text-xs font-medium text-lacuna-plum">
                {company.sector}
              </span>
              <span className="rounded-full bg-lacuna-surface-subtle px-3 py-1 text-xs font-medium text-lacuna-text-secondary">
                {prediction.stage}
              </span>
              <span className="rounded-full bg-lacuna-surface-subtle px-3 py-1 text-xs font-medium text-lacuna-text-secondary">
                {company.hq}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-lacuna-text-secondary">
              {company.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-lacuna-border bg-lacuna-surface-muted p-4">
              <h5 className="text-sm font-semibold text-lacuna-text-primary">
                Exit Outlook
              </h5>
              <div className="mt-3 space-y-2 text-sm text-lacuna-text-secondary">
                <p>
                  <span className="font-medium text-lacuna-text-primary">
                    Exit probability:
                  </span>{" "}
                  {(prediction.exitProbability * 100).toFixed(1)}%
                </p>
                <p>
                  <span className="font-medium text-lacuna-text-primary">
                    Predicted acquirer:
                  </span>{" "}
                  {prediction.predictedAcquirer}
                </p>
                <p>
                  <span className="font-medium text-lacuna-text-primary">
                    Confidence level:
                  </span>{" "}
                  {getConfidenceLabel(prediction.confidence)}{" "}
                  ({(prediction.confidence * 100).toFixed(0)}%)
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-lacuna-border bg-lacuna-surface-muted p-4">
              <h5 className="text-sm font-semibold text-lacuna-text-primary">
                Market Position
              </h5>
              <div className="mt-3 space-y-2 text-sm text-lacuna-text-secondary">
                <p>
                  <span className="font-medium text-lacuna-text-primary">Cluster:</span>
                  {" "}
                  {marketPosition}
                </p>
                <p>
                  <span className="font-medium text-lacuna-text-primary">
                    Stage basis:
                  </span>{" "}
                  {prediction.stage}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-lacuna-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-lacuna-text-primary">
                Foreground Fit
              </h5>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${foregroundFitClasses}`}
              >
                {foregroundFitLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-lacuna-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-lacuna-text-primary">
                Comparable Exits
              </h5>
              <span className="text-xs text-lacuna-text-muted">
                Same sector, verified dataset
              </span>
            </div>
            <div className="space-y-3">
              {comparableExits.length > 0
                ? comparableExits.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-lacuna-text-primary">
                          {deal.targetName}
                        </p>
                        <p className="text-sm text-lacuna-text-secondary">
                          {deal.acquirerName}
                        </p>
                      </div>
                      <div className="text-sm text-lacuna-text-secondary sm:text-right">
                        <p className="font-medium text-lacuna-text-primary">
                          {formatDealValue(deal.dealValue)}
                        </p>
                        <p>
                          {formatDealDate(
                            deal.closedDate ?? deal.announcedDate,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
                : (
                  <p className="text-sm text-lacuna-text-muted">
                    No same-sector verified exits are available in the current
                    dataset.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
