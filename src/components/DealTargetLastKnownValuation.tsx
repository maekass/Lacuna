"use client";

import Metric from "@/components/Metric";
import { LAST_KNOWN_VALUATION_MODEL } from "@/lib/deals/dealMetricModels";
import type { SourcedLastKnownValuation } from "@/lib/deals/sourcedLastKnownValuation";

const metricClass = "align-baseline font-semibold text-lacuna-plum";

/** Distinct sourced company valuation — omitted when it duplicates deal price. */
export default function DealTargetLastKnownValuation({
  valuation,
}: {
  valuation: SourcedLastKnownValuation;
}) {
  return (
    <p className="mt-2 text-xs text-lacuna-blue/80">
      Last known{" "}
      <Metric
        label="Last known valuation"
        className={metricClass}
        provenance={{
          kind: "proxy",
          value: valuation.value,
          model: LAST_KNOWN_VALUATION_MODEL,
          caveat: valuation.source,
        }}
        formatValue={(millions) => `$${millions.toLocaleString()}M`}
      />
      {` · ${valuation.source}`}
    </p>
  );
}
