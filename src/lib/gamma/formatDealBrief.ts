import type { AdjacentNonPeer } from "@/lib/deals/listComparableDeals";
import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import type { DealDetail } from "@/lib/deals/dealTypes";
import { buildEvidenceLadder } from "@/lib/deals/evidenceLadder";
import { premiumPercent } from "@/lib/deals/dealTiming";

export interface DealBriefExtras {
  adjacencyNotPeers?: AdjacentNonPeer[];
  closeDays?: number | null;
  premiumMultiple?: number | null;
}

function formatMillions(value?: number): string {
  return typeof value === "number"
    ? `$${value.toLocaleString()}M`
    : "undisclosed";
}

/**
 * Formats a single verified deal as structured text for copy/download.
 */
export function formatDealBrief(
  deal: DealDetail,
  comparables: ComparableDealSummary[] = [],
  extras: DealBriefExtras = {},
): string {
  const acq = deal.acquisition;
  const ladder = buildEvidenceLadder(deal);
  const lines: string[] = [];

  lines.push(`# Deal brief: ${acq.targetName} → ${acq.acquirerName}`);
  lines.push("");
  lines.push(`Announced: ${acq.announcedDate}`);
  if (acq.closedDate) lines.push(`Closed: ${acq.closedDate}`);
  if (typeof extras.closeDays === "number") {
    lines.push(`Close speed: ${extras.closeDays} days`);
  }
  lines.push(`Type: ${acq.dealType}`);
  lines.push(`Target sector: ${deal.target.sector}`);
  if (deal.target.evidenceClass) {
    lines.push(`Evidence class: ${deal.target.evidenceClass}`);
  }
  if (deal.target.hq) lines.push(`Target HQ: ${deal.target.hq}`);
  if (deal.target.founded) lines.push(`Founded: ${deal.target.founded}`);
  lines.push("");

  if (typeof acq.dealValue === "number") {
    lines.push(`Deal value: $${acq.dealValue.toLocaleString()}M`);
    if (acq.dealValueNote) lines.push(`Note: ${acq.dealValueNote}`);
  } else {
    lines.push("Deal value: Undisclosed");
  }
  if (acq.dealStructure) lines.push(`Structure: ${acq.dealStructure}`);
  if (typeof extras.premiumMultiple === "number") {
    const pct = premiumPercent(extras.premiumMultiple);
    const sign = pct >= 0 ? "+" : "";
    lines.push(
      `Premium: ${sign}${pct.toFixed(0)}% (${
        extras.premiumMultiple.toFixed(2)
      }× disclosed / pre-deal)`,
    );
  }
  lines.push("");

  if (deal.target.description) {
    lines.push("## Target");
    lines.push(deal.target.description);
    lines.push("");
  }

  if (acq.strategicRationale) {
    lines.push("## Strategic rationale");
    lines.push(acq.strategicRationale);
    lines.push("");
  }

  lines.push("## Evidence ladder");
  for (const run of ladder.runs) {
    const link = run.url ? ` ${run.url}` : "";
    lines.push(`- [${run.label}] ${run.citation}${link}`);
  }
  lines.push("");

  if (ladder.limitations.length > 0) {
    lines.push("## Limitations");
    for (const lim of ladder.limitations) {
      lines.push(`- ${lim}`);
    }
    lines.push("");
  }

  if (comparables.length > 0) {
    lines.push(
      "## Valuation peers (same sector, same type, 0.25×–4× disclosed value)",
    );
    for (const c of comparables.slice(0, 5)) {
      lines.push(
        `- ${c.targetName} → ${c.acquirerName} (${c.announcedDate}, ${
          formatMillions(c.dealValue)
        })`,
      );
    }
    lines.push("");
  }

  const adjacency = extras.adjacencyNotPeers ?? [];
  if (adjacency.length > 0) {
    lines.push("## Same-sector adjacency (not valuation peers)");
    for (const c of adjacency) {
      lines.push(
        `- ${c.targetName} → ${c.acquirerName} (${
          formatMillions(c.dealValue)
        }, ${c.valueRatio.toFixed(0)}× this deal) — clinical adjacency only`,
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "Source: Lacuna verified dataset. Educational use only — not investment advice.",
  );

  return lines.join("\n");
}
