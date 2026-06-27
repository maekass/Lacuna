/**
 * Burden-Capital Gap seed data — WEF/BCG Figure 3
 *
 * Source: World Economic Forum & Boston Consulting Group,
 * "Women's Health Investment Outlook 2026", Figure 3.
 * Funding events and capital raised by therapeutic area, 2020–2025.
 * PitchBook / CapIQ / Crunchbase methodology.
 *
 * PDF: https://reports.weforum.org/docs/WEF_Womens_Health_Investment_Outlook_2026.pdf
 *
 * `burdenDALYsM` and `prevalenceM` are intentionally null — pending IHME GBD 2023 pull.
 * Do not backfill with estimates.
 */

/** WEF taxonomy — three categories from the report. */
export type WefCategory = "uniquely" | "differently" | "disproportionately";

export interface BurdenCapitalGapRow {
  /** Stable row key for chart joins */
  id: string;
  /** Therapeutic area label (matches WEF Figure 3) */
  therapeuticArea: string;
  /** WEF condition category */
  wefCategory: WefCategory;
  /** Women's-health funding events, 2020–2025 (total WH) */
  fundingEvents: number;
  /** WH-specific funding events, when applicable */
  fundingEventsWhSpecific: number | null;
  /** Total capital raised in women's health ($M) */
  capitalRaisedM: number;
  /** Global DALYs (millions) — pending IHME GBD 2023 */
  burdenDALYsM: number | null;
  /** Global prevalence (millions) — pending IHME GBD 2023 */
  prevalenceM: number | null;
  /** Exit-side complement — pending AOA Dx "Follow the Exits" ingest */
  exitValueM: number | null;
}

/** WEF/BCG Figure 3 — women's health investment by therapeutic area (2020–2025). */
export const BURDEN_CAPITAL_GAP_DATA: BurdenCapitalGapRow[] = [
  {
    id: "womens-cancers",
    therapeuticArea: "Women's cancers",
    wefCategory: "uniquely",
    fundingEvents: 1203,
    fundingEventsWhSpecific: 228,
    capitalRaisedM: 127_000,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "reproductive-health",
    therapeuticArea: "Reproductive health",
    wefCategory: "uniquely",
    fundingEvents: 906,
    fundingEventsWhSpecific: 619,
    capitalRaisedM: 22_000,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "maternal-health",
    therapeuticArea: "Maternal health",
    wefCategory: "uniquely",
    fundingEvents: 572,
    fundingEventsWhSpecific: 343,
    capitalRaisedM: 9_000,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "generic-womens-health",
    therapeuticArea: "Generic women's health",
    wefCategory: "uniquely",
    fundingEvents: 280,
    fundingEventsWhSpecific: 86,
    capitalRaisedM: 11_000,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "mental-health",
    therapeuticArea: "Mental health",
    wefCategory: "disproportionately",
    fundingEvents: 156,
    fundingEventsWhSpecific: 127,
    capitalRaisedM: 1_400,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "endometriosis",
    therapeuticArea: "Endometriosis",
    wefCategory: "uniquely",
    fundingEvents: 82,
    fundingEventsWhSpecific: 45,
    capitalRaisedM: 1_700,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "pcos",
    therapeuticArea: "PCOS",
    wefCategory: "uniquely",
    fundingEvents: 39,
    fundingEventsWhSpecific: 27,
    capitalRaisedM: 100,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "infectious-diseases",
    therapeuticArea: "Infectious diseases",
    wefCategory: "disproportionately",
    fundingEvents: 24,
    fundingEventsWhSpecific: 4,
    capitalRaisedM: 400,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "endocrine-disorders",
    therapeuticArea: "Endocrine disorders",
    wefCategory: "disproportionately",
    fundingEvents: 15,
    fundingEventsWhSpecific: 2,
    capitalRaisedM: 2_200,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "urological-disorders",
    therapeuticArea: "Urological disorders",
    wefCategory: "disproportionately",
    fundingEvents: 12,
    fundingEventsWhSpecific: 6,
    capitalRaisedM: 30,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "menstrual-health",
    therapeuticArea: "Menstrual health",
    wefCategory: "uniquely",
    fundingEvents: 11,
    fundingEventsWhSpecific: 3,
    capitalRaisedM: 100,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "cardiovascular",
    therapeuticArea: "Cardiovascular disorders",
    wefCategory: "differently",
    fundingEvents: 11,
    fundingEventsWhSpecific: 3,
    capitalRaisedM: 10,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "metabolic",
    therapeuticArea: "Metabolic disorders",
    wefCategory: "differently",
    fundingEvents: 8,
    fundingEventsWhSpecific: 3,
    capitalRaisedM: 4,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "menopause",
    therapeuticArea: "Menopausal health",
    wefCategory: "uniquely",
    fundingEvents: 6,
    fundingEventsWhSpecific: 1,
    capitalRaisedM: 1_000,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "neurological",
    therapeuticArea: "Neurological disorders",
    wefCategory: "disproportionately",
    fundingEvents: 4,
    fundingEventsWhSpecific: null,
    capitalRaisedM: 10,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
  {
    id: "msk-pain",
    therapeuticArea: "MSK & pain disorders",
    wefCategory: "disproportionately",
    fundingEvents: 3,
    fundingEventsWhSpecific: null,
    capitalRaisedM: 5,
    burdenDALYsM: null,
    prevalenceM: null,
    exitValueM: null,
  },
];

export const WEF_CATEGORY_LABELS: Record<WefCategory, string> = {
  uniquely: "Affects women uniquely",
  differently: "Affects women differently",
  disproportionately: "Affects women disproportionately",
};

export const BURDEN_CAPITAL_GAP_SOURCES = [
  {
    label: "WEF/BCG 2026",
    reference:
      "World Economic Forum & Boston Consulting Group. Women's Health Investment Outlook 2026. Figure 3 — funding events and capital raised by therapeutic area, 2020–2025. PitchBook, CapIQ, Crunchbase.",
    url:
      "https://reports.weforum.org/docs/WEF_Womens_Health_Investment_Outlook_2026.pdf",
  },
  {
    label: "IHME GBD 2023",
    reference:
      "Institute for Health Metrics and Evaluation. Global Burden of Disease Study 2023. Burden columns pending ingestion.",
    url: "https://www.healthdata.org/",
  },
] as const;

/** Whether any row has IHME burden data populated. */
export function hasBurdenData(rows: BurdenCapitalGapRow[]): boolean {
  return rows.some((r) => r.burdenDALYsM !== null);
}

/** Sort rows for chart display — burden mode vs pending-burden mode. */
export function sortBurdenCapitalRows(
  rows: BurdenCapitalGapRow[],
): BurdenCapitalGapRow[] {
  const copy = [...rows];
  if (hasBurdenData(copy)) {
    return copy.sort((a, b) => {
      const gapA = (a.burdenDALYsM ?? 0) / Math.max(a.capitalRaisedM, 0.001);
      const gapB = (b.burdenDALYsM ?? 0) / Math.max(b.capitalRaisedM, 0.001);
      return gapB - gapA;
    });
  }
  return copy.sort((a, b) => b.fundingEvents - a.fundingEvents);
}

/** Format capital for axis labels and tooltips. */
export function formatCapitalM(valueM: number): string {
  if (valueM >= 1_000) return `$${(valueM / 1_000).toFixed(1)}B`;
  if (valueM >= 1) return `$${valueM.toFixed(0)}M`;
  return `$${(valueM * 1_000).toFixed(0)}K`;
}
