import type { DealDetail } from "./dealTypes";

export type EvidenceTier = "primary" | "secondary" | "tertiary" | "unknown";

export interface EvidenceRun {
  tier: EvidenceTier;
  label: string;
  citation: string;
  url?: string;
}

export interface EvidenceLadderResult {
  runs: EvidenceRun[];
  primaryCount: number;
  secondaryCount: number;
  hasDualSource: boolean;
  priceDisclosed: boolean;
  priceNote?: string;
  limitations: string[];
}

const SEC_PATTERN = /\b(8-k|10-k|10-q|sec edgar|s-4|merger proxy|form 8)\b/i;
const PRESS_PATTERN =
  /\b(press release|newsroom|business wire|globe newswire|pr newswire|fierce|techcrunch|nasdaq)\b/i;

function splitSources(source: string): string[] {
  return source
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifyCitation(text: string): EvidenceTier {
  if (SEC_PATTERN.test(text)) return "primary";
  if (PRESS_PATTERN.test(text)) return "secondary";
  if (text.length > 0) return "tertiary";
  return "unknown";
}

function tierLabel(tier: EvidenceTier): string {
  switch (tier) {
    case "primary":
      return "Primary (regulatory / filing)";
    case "secondary":
      return "Secondary (press / IR)";
    case "tertiary":
      return "Tertiary (trade / analyst)";
    default:
      return "Unclassified";
  }
}

/**
 * Builds an evidence ladder from a verified deal's source string and value fields.
 */
export function buildEvidenceLadder(deal: DealDetail): EvidenceLadderResult {
  const acq = deal.acquisition;
  const parts = splitSources(acq.source);
  const runs: EvidenceRun[] = parts.map((citation) => {
    const tier = classifyCitation(citation);
    return { tier, label: tierLabel(tier), citation };
  });

  if (runs.length === 0) {
    runs.push({
      tier: "unknown",
      label: tierLabel("unknown"),
      citation: "No source citation on record",
    });
  }

  const primaryCount = runs.filter((r) => r.tier === "primary").length;
  const secondaryCount = runs.filter((r) =>
    r.tier === "secondary" || r.tier === "primary"
  ).length;
  const hasDualSource = primaryCount >= 1 && secondaryCount >= 2 ||
    runs.length >= 2;

  const priceDisclosed = typeof acq.dealValue === "number";
  const limitations: string[] = [];

  if (!hasDualSource) {
    limitations.push(
      "Single-source or weak corroboration — treat valuation and timing as directional.",
    );
  }
  if (!priceDisclosed) {
    limitations.push(
      "Deal value not disclosed in verified record; multiples and comparables exclude this transaction.",
    );
  } else if (acq.dealValueNote) {
    limitations.push(acq.dealValueNote);
  }
  if (acq.preDealValuationSource) {
    limitations.push(
      `Pre-deal valuation sourced from: ${acq.preDealValuationSource}`,
    );
  }

  return {
    runs,
    primaryCount,
    secondaryCount,
    hasDualSource,
    priceDisclosed,
    priceNote: acq.dealValueNote,
    limitations,
  };
}
