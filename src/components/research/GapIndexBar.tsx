import type { EmpowermentGapSeverity } from "@/lib/research/patientEmpowermentTaxonomy";

const SEVERITY_STYLES: Record<EmpowermentGapSeverity, string> = {
  critical: "bg-red-50 text-red-800 border-red-200",
  high: "bg-amber-50 text-amber-900 border-amber-200",
  moderate: "bg-sky-50 text-sky-900 border-sky-200",
};

export function GapIndexBar({
  gapIndexPct,
  showSeverity = false,
  severity,
}: {
  gapIndexPct: number;
  showSeverity?: boolean;
  severity?: EmpowermentGapSeverity;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs min-w-[8rem]">
        <div
          className="h-2 flex-1 rounded bg-lacuna-pink/15"
          role="meter"
          aria-valuenow={gapIndexPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Gap index ${gapIndexPct} out of 100`}
        >
          <div
            className="h-full rounded bg-lacuna-plum/75"
            style={{ width: `${Math.min(gapIndexPct, 100)}%` }}
          />
        </div>
        <span className="w-14 text-right font-semibold text-lacuna-plum tabular-nums">
          {gapIndexPct}/100
        </span>
      </div>
      {showSeverity && severity
        ? (
          <span
            className={`inline-flex w-fit rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
              SEVERITY_STYLES[severity]
            }`}
          >
            {severity}
          </span>
        )
        : null}
    </div>
  );
}
