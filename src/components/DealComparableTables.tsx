"use client";

import Metric from "@/components/Metric";
import SortableDealTable from "@/components/deals/SortableDealTable";
import type { AdjacentNonPeer } from "@/lib/deals/listComparableDeals";
import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import { VALUE_RATIO_MODEL } from "@/lib/deals/dealMetricModels";

function rowKey(title: string, rows: readonly { id: string }[]): string {
  return `${title}:${rows.map((row) => row.id).join("|")}`;
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
      <SortableDealTable
        key={rowKey("peers", peers)}
        title={`Valuation peers · ${sector}`}
        caption="Same sector, same deal type, announced within ±3 years, disclosed value within 0.25×–4× of this transaction. Ranked by evidence class, then same acquirer, until you sort."
        rows={peers}
        emptyTitle="Insufficient disclosed data"
        emptyDescription={`No verified ${sector} deals meet the peer rule: same deal type, announced within ±3 years, and a disclosed value inside 0.25×–4× of this transaction.`}
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
          <SortableDealTable
            key={rowKey("adjacency", adjacencyNotPeers)}
            title="Same-sector adjacency — not valuation peers"
            caption="These deals share the sector tag and window but sit outside the 0.25×–4× value band. The dataset keeps them for clinical adjacency, not as price comps."
            rows={adjacencyNotPeers}
            emptyTitle="Insufficient disclosed data"
            emptyDescription="No same-sector deals sit outside the valuation-peer value band."
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
      <SortableDealTable
        key={rowKey("acquirer", acquirerDeals)}
        title={`Other verified deals by ${acquirerName}`}
        caption="Acquirer program history not already listed as a valuation peer or adjacency row."
        rows={acquirerDeals}
        emptyTitle="No further verified deals"
        emptyDescription={`Other verified transactions by ${acquirerName} are already listed above, or none are in the dataset.`}
        extraHeader="Sector"
        extraCell={(row) => row.sector}
      />
    </div>
  );
}
