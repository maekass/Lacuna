"use client";

import type {
  EvidenceLadderResult,
  EvidenceTier,
} from "@/lib/deals/evidenceLadder";

const tierStyles: Record<EvidenceTier, string> = {
  primary: "border-emerald-300 bg-emerald-50 text-emerald-900",
  secondary: "border-sky-300 bg-sky-50 text-sky-900",
  tertiary: "border-amber-300 bg-amber-50 text-amber-900",
  unknown: "border-gray-200 bg-gray-50 text-gray-700",
};

interface EvidenceLadderProps {
  ladder: EvidenceLadderResult;
  compact?: boolean;
}

export default function EvidenceLadder(
  { ladder, compact = false }: EvidenceLadderProps,
) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            ladder.hasDualSource
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : ladder.pressOnly
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          {ladder.hasDualSource
            ? "Dual-source corroboration"
            : ladder.pressOnly
            ? "Press only — no primary filing"
            : "Single-source"}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            ladder.priceDisclosed
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-gray-300 bg-gray-50 text-gray-700"
          }`}
        >
          {ladder.priceDisclosed ? "Value disclosed" : "Value undisclosed"}
        </span>
      </div>

      <ol className={`space-y-2 ${compact ? "text-sm" : ""}`}>
        {ladder.runs.map((run, i) => (
          <li
            key={`${run.tier}-${i}`}
            className={`rounded-lg border p-3 ${tierStyles[run.tier]}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              {run.label}
            </p>
            <p className="mt-1">{run.citation}</p>
            {run.url
              ? (
                <a
                  href={run.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-medium underline underline-offset-2"
                >
                  {run.urlKind === "edgar_locator"
                    ? "SEC EDGAR filings (ticker locator)"
                    : "Open source"}
                </a>
              )
              : null}
          </li>
        ))}
      </ol>

      {ladder.limitations.length > 0 && (
        <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-pink/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-plum">
            Limitations
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-lacuna-text-secondary">
            {ladder.limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
