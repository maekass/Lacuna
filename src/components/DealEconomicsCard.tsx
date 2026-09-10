"use client";

import Metric from "@/components/Metric";
import {
  DEAL_VALUE_MODEL,
  PRE_DEAL_VALUATION_MODEL,
  PREMIUM_MULTIPLE_MODEL,
  PREMIUM_PERCENT_MODEL,
} from "@/lib/deals/dealMetricModels";
import type { DealDetailView } from "@/lib/deals";

const metricClass = "align-baseline font-semibold text-lacuna-plum";

function preDealAsOfLabel(
  date: string,
  precision?: "day" | "month" | "quarter" | "year",
): string {
  if (precision === "year") return `${date.slice(0, 4)}, year precision`;
  if (precision === "quarter") return `${date.slice(0, 7)}, quarter precision`;
  if (precision === "month") return `${date.slice(0, 7)}, month precision`;
  if (precision === "day") return `${date}, day precision`;
  return date;
}

function roundingGridLabel(gridM: number): string {
  return ` · rounding grid ±$${gridM}M`;
}

/** Price and premium for a deal dossier (one grid cell). */
export default function DealEconomicsCard({ view }: { view: DealDetailView }) {
  const acq = view.deal.acquisition;
  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white/90 p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-lacuna-plum/80">
        Economics
      </h2>
      <p className="mt-2 text-xl font-bold text-lacuna-plum sm:text-2xl">
        {typeof acq.dealValue === "number"
          ? (
            <Metric
              label="Disclosed deal value"
              className="text-xl font-bold text-lacuna-plum sm:text-2xl"
              provenance={{
                kind: "proxy",
                value: acq.dealValue,
                model: DEAL_VALUE_MODEL,
                caveat: acq.dealValueNote,
              }}
              formatValue={(millions) => `$${millions.toLocaleString()}M`}
            />
          )
          : "Undisclosed"}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-lacuna-blue">
        {acq.dealStructure ? <span>{acq.dealStructure}</span> : null}
        {typeof view.premiumPercent === "number" &&
            typeof view.premiumMultiple === "number"
          ? (
            <>
              {acq.dealStructure ? <span aria-hidden>·</span> : null}
              <Metric
                label="Acquisition premium"
                className={metricClass}
                provenance={{
                  kind: "proxy",
                  value: view.premiumPercent,
                  model: PREMIUM_PERCENT_MODEL,
                  caveat:
                    "Percent premium vs cited pre-deal valuation. Not a forecast.",
                }}
                formatValue={(pct) =>
                  `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% premium`}
              />
              <span>
                (
                <Metric
                  label="Price / pre-deal multiple"
                  className={metricClass}
                  provenance={{
                    kind: "proxy",
                    value: view.premiumMultiple,
                    model: PREMIUM_MULTIPLE_MODEL,
                    caveat:
                      "Disclosed dealValue ÷ preDealValuation (or curated computedPremium).",
                  }}
                  formatValue={(multiple) => `${multiple.toFixed(2)}×`}
                />
                )
              </span>
            </>
          )
          : null}
      </p>
      {typeof acq.preDealValuation === "number"
        ? (
          <p className="mt-2 text-xs text-lacuna-blue/80">
            Pre-deal{" "}
            <Metric
              label="Pre-deal valuation"
              className={metricClass}
              provenance={{
                kind: "proxy",
                value: acq.preDealValuation,
                model: PRE_DEAL_VALUATION_MODEL,
                caveat: acq.preDealValuationSource,
              }}
              formatValue={(millions) => `~$${millions.toLocaleString()}M`}
            />
            {acq.preDealValuationDate
              ? ` · pre-deal mark: ${
                preDealAsOfLabel(
                  acq.preDealValuationDate,
                  acq.preDealValuationDatePrecision,
                )
              }`
              : ""}
            {typeof acq.preDealValuationRoundingGridM === "number"
              ? roundingGridLabel(acq.preDealValuationRoundingGridM)
              : ""}
            {acq.preDealValuationSource
              ? ` · ${acq.preDealValuationSource}`
              : ""}
          </p>
        )
        : null}
      {acq.dealValueNote
        ? (
          <p className="mt-2 text-xs text-lacuna-blue/70">
            {acq.dealValueNote}
          </p>
        )
        : null}
    </div>
  );
}
