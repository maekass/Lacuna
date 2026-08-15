import type {
  EvidenceLadderResult,
  EvidenceRun,
} from "@/lib/deals/evidenceLadder";
import { hasPrimaryAndIndependent } from "@/lib/deals/evidenceLadder";
import type { PendingDealRecord } from "@/lib/ingestion/pendingDeals";

function extractUrls(text: string | null): string[] {
  if (!text) return [];
  return [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
}

/** Evidence ladder for a staging candidate (not verified JSON). */
export function buildStagingEvidenceLadder(
  deal: PendingDealRecord,
): EvidenceLadderResult {
  const runs: EvidenceRun[] = [];

  if (deal.filingUrl) {
    runs.push({
      tier: "primary",
      label: "Primary (SEC filing)",
      citation: deal.secAccession,
      url: deal.filingUrl,
    });
  }

  const secondaryUrls = [
    ...extractUrls(deal.reviewNotes),
  ].filter((url) => url !== deal.filingUrl);

  for (const url of secondaryUrls) {
    runs.push({
      tier: "secondary",
      label: "Secondary (reviewer citation)",
      citation: url,
      url,
    });
  }

  if (deal.item201Excerpt?.trim()) {
    runs.push({
      tier: "tertiary",
      label: "Filing excerpt (Item 2.01)",
      citation: deal.item201Excerpt.trim().slice(0, 280),
    });
  }

  if (runs.length === 0) {
    runs.push({
      tier: "unknown",
      label: "Unclassified",
      citation: "No filing URL or excerpt on staging row",
    });
  }

  const primaryCount = runs.filter((r) => r.tier === "primary").length;
  const secondaryCount = runs.filter((r) => r.tier === "secondary").length;
  const hasDualSource = hasPrimaryAndIndependent(runs);
  const pressOnly = !hasDualSource && primaryCount === 0 && runs.length >= 2;

  const priceDisclosed = deal.dealValueMillions !== null;
  const limitations: string[] = [
    "Staging candidate — not in verified dataset until promoted.",
  ];

  if (deal.parseQuality === "keyword_only") {
    limitations.push(
      "Parse quality is keyword-only; confirm parties and dates from the full filing.",
    );
  }
  if (!hasDualSource) {
    limitations.push(
      "Add a secondary source URL in review notes or the promotion form.",
    );
  }
  if (!priceDisclosed) {
    limitations.push(
      "Deal value not disclosed in staging row; verified merge should omit dealValue or add dealValueNote.",
    );
  } else if (deal.dealValueNote) {
    limitations.push(deal.dealValueNote);
  }

  return {
    runs,
    primaryCount,
    secondaryCount,
    hasDualSource,
    pressOnly,
    priceDisclosed,
    priceNote: deal.dealValueNote ?? undefined,
    limitations,
  };
}
