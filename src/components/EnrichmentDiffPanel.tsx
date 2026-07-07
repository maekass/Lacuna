import Link from "next/link";
import type { DuplicateMatch } from "@/lib/ingestion/detectPendingDealDuplicates";
import type { EnrichmentFieldChange } from "@/lib/ingestion/enrichPendingDeal";

interface EnrichmentDiffPanelProps {
  changes: EnrichmentFieldChange[];
  duplicates: DuplicateMatch[];
  skipped?: boolean;
  skipReason?: string;
  loading?: boolean;
}

function formatCell(value: string | number | null): string {
  if (value === null) return "—";
  if (typeof value === "number") return String(value);
  return value.length > 120 ? `${value.slice(0, 120)}…` : value;
}

export default function EnrichmentDiffPanel({
  changes,
  duplicates,
  skipped,
  skipReason,
  loading,
}: EnrichmentDiffPanelProps) {
  if (loading) {
    return (
      <p className="text-sm text-lacuna-blue/80">
        Fetching 8-K from SEC EDGAR…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {duplicates.length > 0
        ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-900">
              Possible duplicates
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900">
              {duplicates.map((match) => (
                <li
                  key={`${match.kind}-${match.dealId ?? match.acquisitionId}`}
                >
                  {match.href
                    ? (
                      <Link href={match.href} className="underline">
                        {match.label}
                      </Link>
                    )
                    : match.label}
                </li>
              ))}
            </ul>
          </div>
        )
        : null}

      {skipped && skipReason
        ? (
          <p className="rounded-md border border-lacuna-lavender/40 bg-white px-3 py-2 text-sm text-lacuna-blue">
            {skipReason}
          </p>
        )
        : null}

      {changes.length > 0
        ? (
          <div className="overflow-x-auto rounded-lg border border-lacuna-lavender/40">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-lacuna-lavender/10 text-lacuna-plum">
                <tr>
                  <th className="px-3 py-2 font-semibold">Field</th>
                  <th className="px-3 py-2 font-semibold">Before</th>
                  <th className="px-3 py-2 font-semibold">After</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr
                    key={change.field}
                    className="border-t border-lacuna-lavender/20"
                  >
                    <td className="px-3 py-2 font-medium text-lacuna-plum">
                      {change.label}
                    </td>
                    <td className="px-3 py-2 text-lacuna-blue/80">
                      {formatCell(change.before)}
                    </td>
                    <td className="px-3 py-2 text-lacuna-plum">
                      {formatCell(change.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        : !skipped && !loading
        ? (
          <p className="text-sm text-lacuna-blue/80">
            No field changes from this enrichment pass.
          </p>
        )
        : null}
    </div>
  );
}
