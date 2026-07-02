/**
 * External women's-health exit & investment research (not Lacuna verified deals).
 *
 * Primary report: AOA Dx, "Follow the Exits: Why Women's Health Is a Smart Bet
 * in Healthcare" (released Jan 13, 2026, JPMorgan Healthcare Conference).
 *
 * Secondary coverage: Forbes (Geri Stengel, Jan 13, 2026) — cites AOA Dx report
 * and Kearney private-investment analysis. SVB healthcare exit patterns cited
 * for M&A vs IPO mix.
 *
 * Do not merge into dataset.verified.json — scope is 276 exits (2000–2025) vs
 * Lacuna's curated 59-deal educational subset.
 */

import type { ModelProvenance } from "@/lib/provenance/modelProvenance";
import type { BurdenCapitalGapRow } from "@/data/burdenCapitalGap";

/** AOA Dx headline exit statistics (acquisitions + IPOs, 2000–2025). */
export interface WomensHealthExitsHeadline {
  /** Lower bound cited in press ("more than $100B") */
  totalExitValueMinB: number;
  exitCount: number;
  billionDollarDealCount: number;
  /** Largest single year on record (2025) */
  exitValue2025B: number;
  /** Share of exits that were M&A vs IPO (AOA / SVB) */
  maSharePct: number;
  periodStart: number;
  periodEnd: number;
  /** Nearly half of exits in the past five years (Forbes paraphrase) */
  recentFiveYearShareNote: string;
}

/** AOA Dx exit concentration by clinical area (USD billions). */
export interface AoaExitSector {
  id: string;
  label: string;
  exitValueB: number;
  /** Optional subset called out in Forbes (e.g. gynecologic oncology within oncology) */
  subsetNote?: string;
}

/** Kearney women's-health private investment (2020+, via Forbes). */
export interface KearneyWhInvestment {
  totalPrivateInvestmentB: number;
  womenSpecificConditionsB: number;
  disproportionatelyAffectingWomenB: number;
  diagnosticsAndDigitalHealthB: number;
  privateDealsTrackedMin: number;
  periodNote: string;
}

export const WOMENS_HEALTH_EXITS_HEADLINE: WomensHealthExitsHeadline = {
  totalExitValueMinB: 100,
  exitCount: 276,
  billionDollarDealCount: 27,
  exitValue2025B: 27,
  maSharePct: 91,
  periodStart: 2000,
  periodEnd: 2025,
  recentFiveYearShareNote:
    "Nearly half of all exits occurred in the past five years (AOA Dx, via Forbes Jan 2026).",
};

export const AOA_EXIT_SECTORS: readonly AoaExitSector[] = [
  {
    id: "gynecologic-health",
    label: "Gynecologic health",
    exitValueB: 29.6,
  },
  {
    id: "oncology",
    label: "Oncology",
    exitValueB: 24.0,
    subsetNote: "Nearly $19B from gynecologic oncology alone (AOA Dx).",
  },
] as const;

export const KEARNEY_WH_INVESTMENT: KearneyWhInvestment = {
  totalPrivateInvestmentB: 34,
  womenSpecificConditionsB: 21,
  disproportionatelyAffectingWomenB: 13,
  diagnosticsAndDigitalHealthB: 7.6,
  privateDealsTrackedMin: 2000,
  periodNote: "Since 2020; Kearney analysis cited in Forbes (Jan 2026).",
};

/** Repeat strategic acquirers named in Forbes / AOA Dx coverage. */
export const AOA_REPEAT_ACQUIRERS = [
  "Hologic",
  "Roche",
  "LabCorp",
  "Abbott",
  "CooperSurgical",
] as const;

/**
 * Best-effort map from AOA exit sectors → WEF/BCG burden-capital rows.
 * Values are sector totals from AOA — not row-specific WEF capital figures.
 */
export const AOA_EXIT_BCG_CROSSWALK: ReadonlyArray<{
  bcgRowId: string;
  exitValueM: number;
  aoaSectorId: string;
  note: string;
}> = [
  {
    bcgRowId: "womens-cancers",
    exitValueM: 24_000,
    aoaSectorId: "oncology",
    note:
      "AOA oncology exit concentration ($24B, 2000–2025). ~$19B gynecologic oncology subset.",
  },
  {
    bcgRowId: "reproductive-health",
    exitValueM: 29_600,
    aoaSectorId: "gynecologic-health",
    note:
      "AOA gynecologic-health exit total ($29.6B) — broader than WEF reproductive-health funding row.",
  },
];

export const WOMENS_HEALTH_EXITS_SOURCES = [
  {
    label: "AOA Dx — Follow the Exits (2026)",
    reference:
      'AOA Dx. "Follow the Exits: Why Women\'s Health Is a Smart Bet in Healthcare." Released at JPMorgan Healthcare Conference, San Francisco, Jan 13, 2026.',
    url: null,
  },
  {
    label: "Forbes (Jan 2026)",
    reference:
      "Stengel, G. Women's Health Exits Surpassed $100 Billion. Forbes, Jan 13, 2026.",
    url:
      "https://www.forbes.com/sites/geristengel/2026/01/13/womens-health-exits-surpassed-100-billion/",
  },
  {
    label: "Kearney (via Forbes)",
    reference:
      "Kearney global consultancy analysis — 2,000+ private deals since 2020; $34B women's-health investment split by condition category. Cited in Forbes (Jan 2026).",
    url: null,
  },
] as const;

export const WOMENS_HEALTH_EXITS_MODEL: ModelProvenance = {
  module: "src/data/womensHealthExitsResearch.ts",
  exportName: "WOMENS_HEALTH_EXITS_HEADLINE",
  definition:
    "External macro exit research (AOA Dx 2000–2025, 276 exits) — not Lacuna verified deals. Forbes Jan 2026 secondary citation.",
};

/** Apply AOA exit crosswalk to burden-capital rows (mutates copy). */
export function applyAoaExitCrosswalk(
  rows: BurdenCapitalGapRow[],
): BurdenCapitalGapRow[] {
  const byId = new Map(
    AOA_EXIT_BCG_CROSSWALK.map((x) => [x.bcgRowId, x]),
  );
  return rows.map((row) => {
    const match = byId.get(row.id);
    if (!match) return row;
    return { ...row, exitValueM: match.exitValueM };
  });
}

/** Format billions for display ($100B+, $27B). */
export function formatExitBillions(valueB: number, min = false): string {
  if (min) return `$${valueB}B+`;
  return `$${valueB % 1 === 0 ? valueB.toFixed(0) : valueB.toFixed(1)}B`;
}
