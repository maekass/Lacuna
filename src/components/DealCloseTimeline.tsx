"use client";

import Metric from "@/components/Metric";
import { CLOSE_DAYS_MODEL } from "@/lib/deals/dealMetricModels";
import type { DealDetailView } from "@/lib/deals";

const metricClass = "align-baseline font-semibold text-lacuna-plum";

/** Announced → closed span for a verified deal. */
export default function DealCloseTimeline({ view }: { view: DealDetailView }) {
  const { announcedLabel, closedLabel, closeDays } = view;
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
      <li className="rounded-lg border border-lacuna-lavender/40 bg-white/90 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-lacuna-plum/70">
          Announced
        </p>
        <p className="text-sm font-medium text-lacuna-plum">{announcedLabel}</p>
      </li>
      {typeof closeDays === "number" && closedLabel
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
                  value: closeDays,
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
                {closedLabel}
              </p>
            </li>
          </>
        )
        : null}
    </ol>
  );
}
