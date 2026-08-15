import type { ReactNode } from "react";
import Link from "next/link";
import Metric from "@/components/Metric";
import type { AdjacentNonPeer } from "@/lib/deals/listComparableDeals";
import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import {
  DEAL_VALUE_MODEL,
  VALUE_RATIO_MODEL,
} from "@/lib/deals/dealMetricModels";

function DealTable<T extends ComparableDealSummary>({
  title,
  caption,
  rows,
  extraHeader,
  extraCell,
}: {
  title: string;
  caption?: string;
  rows: T[];
  extraHeader?: string;
  extraCell?: (row: T) => ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="text-lg font-semibold text-lacuna-plum">{title}</h3>
      {caption
        ? <p className="mt-1 text-xs text-lacuna-blue/80">{caption}</p>
        : null}
      <div className="mt-3 overflow-x-auto rounded-lg border border-lacuna-lavender/40">
        <table className="min-w-full text-sm">
          <thead className="bg-lacuna-lavender/20 text-left text-xs uppercase tracking-wide text-lacuna-plum/80">
            <tr>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Acquirer</th>
              <th className="px-3 py-2">Announced</th>
              <th className="px-3 py-2">Value</th>
              {extraHeader
                ? <th className="px-3 py-2">{extraHeader}</th>
                : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-lacuna-lavender/30">
                <td className="px-3 py-2">
                  <Link
                    href={`/deals/${row.id}`}
                    className="font-medium text-lacuna-plum hover:text-lacuna-blue underline-offset-2 hover:underline"
                  >
                    {row.targetName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-lacuna-blue">
                  {row.acquirerName}
                </td>
                <td className="px-3 py-2 text-lacuna-blue/80">
                  {row.announcedDate}
                </td>
                <td className="px-3 py-2 text-lacuna-blue/80">
                  {typeof row.dealValue === "number"
                    ? (
                      <Metric
                        label={`${row.targetName} disclosed value`}
                        provenance={{
                          kind: "proxy",
                          value: row.dealValue,
                          model: DEAL_VALUE_MODEL,
                        }}
                        formatValue={(millions) =>
                          `$${millions.toLocaleString()}M`}
                      />
                    )
                    : "Undisclosed"}
                </td>
                {extraHeader
                  ? (
                    <td className="px-3 py-2 text-xs text-lacuna-blue/80">
                      {extraCell?.(row) ?? "—"}
                    </td>
                  )
                  : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DealComparableTables({
  sector,
  acquirerName,
  peers,
  adjacencyNotPeers,
  acquirerDeals,
}: {
  sector: string;
  acquirerName: string;
  peers: ComparableDealSummary[];
  adjacencyNotPeers: AdjacentNonPeer[];
  acquirerDeals: ComparableDealSummary[];
}) {
  return (
    <div className="space-y-8">
      <DealTable
        title={`Valuation peers · ${sector}`}
        caption="Same sector, same deal type, announced within ±3 years, disclosed value within 0.25×–4× of this transaction. Ranked by evidence class, then same acquirer."
        rows={peers}
        extraHeader="Why included"
        extraCell={(row) => {
          const bits: string[] = [];
          if (row.sameEvidenceClass) bits.push("same evidence class");
          if (row.sameAcquirer) bits.push("same acquirer");
          return bits.length > 0 ? bits.join(" · ") : "value band";
        }}
      />
      {adjacencyNotPeers.length > 0
        ? (
          <DealTable
            title="Same-sector adjacency — not valuation peers"
            caption="These deals share the sector tag and window but sit outside the 0.25×–4× value band. The dataset keeps them for clinical adjacency, not as price comps."
            rows={adjacencyNotPeers}
            extraHeader="Vs this deal"
            extraCell={(row) => (
              <Metric
                label={`${row.targetName} value vs this deal`}
                provenance={{
                  kind: "proxy",
                  value: row.valueRatio,
                  model: VALUE_RATIO_MODEL,
                  caveat:
                    "Not a valuation peer — disclosed value is outside 0.25×–4× of the reference deal.",
                }}
                formatValue={(ratio) => `${ratio.toFixed(0)}× disclosed value`}
              />
            )}
          />
        )
        : null}
      <DealTable
        title={`Other verified deals by ${acquirerName}`}
        caption="Acquirer program history — not automatically valuation peers."
        rows={acquirerDeals}
        extraHeader="Sector"
        extraCell={(row) => row.sector}
      />
    </div>
  );
}
