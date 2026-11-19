"use client";

import Metric from "@/components/Metric";
import ValueBasisMark from "@/components/ValueBasisMark";
import { LAST_KNOWN_VALUATION_MODEL } from "@/lib/deals/dealMetricModels";
import type { SourcedLastKnownValuation } from "@/lib/deals/sourcedLastKnownValuation";
import { ledgerBasisLabel } from "@/lib/data/valueBasisLabel";

const metricClass = "align-baseline font-semibold text-lacuna-plum";

/** Distinct sourced company valuation — omitted when it duplicates deal price. */
export default function DealTargetLastKnownValuation({
  valuation,
  companyId,
  compact = false,
}: {
  valuation: SourcedLastKnownValuation;
  companyId: string;
  compact?: boolean;
}) {
  const metric = (
    <>
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
      <ValueBasisMark
        label={ledgerBasisLabel(companyId, "lastKnownValuation")}
      />
    </>
  );
  if (compact) return metric;
  return (
    <p className="mt-2 text-xs text-lacuna-blue/80">
      Last known {metric}
      {` · ${valuation.source}`}
    </p>
  );
}
