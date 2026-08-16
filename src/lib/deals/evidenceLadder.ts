import type { DealDetail } from "./dealTypes";
import {
  inferSourceUrl,
  isEdgarLocatorUrl,
  type SourceUrlKind,
} from "./inferSourceUrl";
import { isResearchHeuristicCitation } from "./researchHeuristicCitation";

export type EvidenceTier = "primary" | "secondary" | "tertiary" | "unknown";

export interface EvidenceRun {
  tier: EvidenceTier;
  label: string;
  citation: string;
  url?: string;
  urlKind?: SourceUrlKind;
}

export interface EvidenceLadderResult {
  runs: EvidenceRun[];
  primaryCount: number;
  secondaryCount: number;
  hasDualSource: boolean;
  /** True when two or more citations exist but none is a primary filing. */
  pressOnly: boolean;
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

function citationKey(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Dual-source means a primary filing plus an independent press/IR or trade citation.
 * Two wires of the same announcement do not qualify. Research/affinity
 * citations never count.
 */
export function hasPrimaryAndIndependent(
  runs: readonly EvidenceRun[],
): boolean {
  const qualifying = runs.filter((r) =>
    !isResearchHeuristicCitation(r.citation)
  );
  const hasPrimary = qualifying.some((r) => r.tier === "primary");
  const hasIndependent = qualifying.some((r) =>
    r.tier === "secondary" || r.tier === "tertiary"
  );
  return hasPrimary && hasIndependent;
}

/**
 * Builds an evidence ladder from a verified deal's source string and value fields.
 */
export function buildEvidenceLadder(deal: DealDetail): EvidenceLadderResult {
  const acq = deal.acquisition;
  const ticker = deal.acquirer.ticker;
  const seen = new Set<string>();
  const runs: EvidenceRun[] = [];
  let omittedHeuristicCount = 0;

  function pushCitation(citation: string): void {
    const key = citationKey(citation);
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (isResearchHeuristicCitation(citation)) {
      omittedHeuristicCount += 1;
      return;
    }
    const tier = classifyCitation(citation);
    const url = inferSourceUrl(citation, ticker);
    runs.push({
      tier,
      label: tierLabel(tier),
      citation,
      url,
      urlKind: url
        ? (isEdgarLocatorUrl(url) ? "edgar_locator" : "direct")
        : undefined,
    });
  }

  for (const part of splitSources(acq.source)) {
    pushCitation(part);
  }
  if (acq.preDealValuationSource) {
    pushCitation(acq.preDealValuationSource);
  }

  if (runs.length === 0) {
    runs.push({
      tier: "unknown",
      label: tierLabel("unknown"),
      citation: "No source citation on record",
    });
  }

  const primaryCount = runs.filter((r) => r.tier === "primary").length;
  const secondaryCount = runs.filter((r) => r.tier === "secondary").length;
  const hasDualSource = hasPrimaryAndIndependent(runs);
  const pressOnly = !hasDualSource && primaryCount === 0 && runs.length >= 2;

  const priceDisclosed = typeof acq.dealValue === "number";
  const limitations: string[] = [];

  if (omittedHeuristicCount > 0) {
    limitations.push(
      "Research/affinity citations are labeled cited_* or affinity and do not count toward dual-source corroboration.",
    );
  }

  if (pressOnly) {
    limitations.push(
      "Citations are press/IR only — two wires of the same announcement are not dual-source. Add a primary filing.",
    );
  } else if (!hasDualSource) {
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
  if (
    acq.preDealValuationSource &&
    !SEC_PATTERN.test(acq.preDealValuationSource)
  ) {
    limitations.push(
      `Pre-deal valuation sourced from: ${acq.preDealValuationSource}`,
    );
  }

  return {
    runs,
    primaryCount,
    secondaryCount,
    hasDualSource,
    pressOnly,
    priceDisclosed,
    priceNote: acq.dealValueNote,
    limitations,
  };
}
