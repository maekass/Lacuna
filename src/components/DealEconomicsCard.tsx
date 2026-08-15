import Metric from "@/components/Metric";
import {
  CLOSE_DAYS_MODEL,
  DEAL_VALUE_MODEL,
  PRE_DEAL_VALUATION_MODEL,
  PREMIUM_MULTIPLE_MODEL,
  PREMIUM_PERCENT_MODEL,
} from "@/lib/deals/dealMetricModels";
import type { DealDetailView } from "@/lib/deals";

const metricClass = "align-baseline font-semibold text-lacuna-plum";

function DealCloseTimeline({ view }: { view: DealDetailView }) {
  const acq = view.deal.acquisition;
  return (
    <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
      <li className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-plum/70">
          Announced
        </p>
        <p className="text-sm font-medium text-lacuna-plum">
          {acq.announcedDate}
        </p>
      </li>
      {typeof view.closeDays === "number" && acq.closedDate
        ? (
          <>
            <li
              className="hidden h-px flex-1 bg-lacuna-lavender/60 sm:block"
              aria-hidden
            />
            <li className="text-xs font-medium text-lacuna-blue sm:px-3">
              <Metric
                label="Days from announcement to close"
                className={metricClass}
                provenance={{
                  kind: "proxy",
                  value: view.closeDays,
                  model: CLOSE_DAYS_MODEL,
                  caveat:
                    "Calendar span in UTC, not business days. Missing close date yields no figure.",
                }}
                formatValue={(days) => `${days} days`}
              />
            </li>
            <li
              className="hidden h-px flex-1 bg-lacuna-lavender/60 sm:block"
              aria-hidden
            />
            <li className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-plum/70">
                Closed
              </p>
              <p className="text-sm font-medium text-lacuna-plum">
                {acq.closedDate}
              </p>
            </li>
          </>
        )
        : null}
    </ol>
  );
}

/** Price, premium, and close speed for a deal dossier (one grid cell). */
export default function DealEconomicsCard({ view }: { view: DealDetailView }) {
  const acq = view.deal.acquisition;
  return (
    <div className="min-w-0">
      <DealCloseTimeline view={view} />
      <div className="mt-4 rounded-xl border border-lacuna-lavender/40 bg-white/90 p-4 sm:p-5">
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
                <span aria-hidden>·</span>
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
          {typeof view.closeDays === "number"
            ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  Closed in{" "}
                  <Metric
                    label="Days from announcement to close"
                    className={metricClass}
                    provenance={{
                      kind: "proxy",
                      value: view.closeDays,
                      model: CLOSE_DAYS_MODEL,
                      caveat:
                        "UTC calendar days on the verified acquisition row.",
                    }}
                    formatValue={(days) => `${days} days`}
                  />
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
    </div>
  );
}
