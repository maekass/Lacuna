import type { ComparableDealSummary } from "@/lib/deals/dealTypes";
import type { DealDetail } from "@/lib/deals/dealTypes";
import { buildEvidenceLadder } from "@/lib/deals/evidenceLadder";

/**
 * Formats a single verified deal as structured text for Gamma export.
 */
export function formatDealBrief(
  deal: DealDetail,
  comparables: ComparableDealSummary[] = [],
): string {
  const acq = deal.acquisition;
  const ladder = buildEvidenceLadder(deal);
  const lines: string[] = [];

  lines.push(`# Deal brief: ${acq.targetName} → ${acq.acquirerName}`);
  lines.push("");
  lines.push(`Announced: ${acq.announcedDate}`);
  if (acq.closedDate) lines.push(`Closed: ${acq.closedDate}`);
  lines.push(`Type: ${acq.dealType}`);
  lines.push(`Target sector: ${deal.target.sector}`);
  if (deal.target.hq) lines.push(`Target HQ: ${deal.target.hq}`);
  lines.push("");

  if (typeof acq.dealValue === "number") {
    lines.push(`Deal value: $${acq.dealValue}M`);
    if (acq.dealValueNote) lines.push(`Note: ${acq.dealValueNote}`);
  } else {
    lines.push("Deal value: Undisclosed");
  }
  if (acq.dealStructure) lines.push(`Structure: ${acq.dealStructure}`);
  lines.push("");

  if (acq.strategicRationale) {
    lines.push("## Strategic rationale");
    lines.push(acq.strategicRationale);
    lines.push("");
  }

  lines.push("## Evidence ladder");
  for (const run of ladder.runs) {
    lines.push(`- [${run.label}] ${run.citation}`);
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
    lines.push("## Comparable deals");
    for (const c of comparables.slice(0, 5)) {
      const val = typeof c.dealValue === "number" ? `$${c.dealValue}M` : "undisclosed";
      lines.push(`- ${c.targetName} → ${c.acquirerName} (${c.announcedDate}, ${val})`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(
    "Source: Lacuna verified dataset. Educational use only — not investment advice.",
  );

  return lines.join("\n");
}
