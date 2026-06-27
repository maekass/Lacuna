/**
 * Crosswalk between WEF/BCG Figure 3 (BCG View chart) and the editorial
 * burden-capital gap valuation engine (`BURDEN_AREAS` in burdenCapitalGap.ts).
 *
 * These are complementary layers — not duplicate datasets:
 *  - BCG View: macro funding flows 2020–2025 (PitchBook / CapIQ / Crunchbase),
 *    global burden pending IHME GBD 2023.
 *  - Valuation engine: US burden (GBD 2021 DALYs), VC deployed 2019–2024
 *    (Rock Health / PitchBook FemTech editorial estimates), gap scoring for
 *    deal-level heuristics.
 */

import { BURDEN_CAPITAL_GAP_DATA, type BurdenCapitalGapRow } from "@/data/burdenCapitalGap";
import { BURDEN_AREAS, computeGapMetrics, type GapMetrics } from "@/lib/valuation/burdenCapitalGap";

export type CrosswalkStatus = "aligned" | "partial" | "unmapped";

export interface BcgValuationCrosswalkEntry {
  bcgId: string;
  bcgLabel: string;
  valuationAreaKey: string | null;
  valuationAreaName: string | null;
  status: CrosswalkStatus;
  /** Human-readable note on capital / scope differences */
  note: string;
}

/** Best-effort mapping from WEF therapeutic areas to valuation `BURDEN_AREAS` keys. */
export const BCG_VALUATION_CROSSWALK: BcgValuationCrosswalkEntry[] = [
  {
    bcgId: "womens-cancers",
    bcgLabel: "Women's cancers",
    valuationAreaKey: "breast_health",
    valuationAreaName: "Breast Health & Oncology",
    status: "partial",
    note:
      "WEF aggregates all women's cancers ($127B); valuation area is breast/oncology-focused ($1.4B VC). Same thesis direction, different scope.",
  },
  {
    bcgId: "reproductive-health",
    bcgLabel: "Reproductive health",
    valuationAreaKey: "fertility",
    valuationAreaName: "Fertility & IVF",
    status: "partial",
    note:
      "WEF reproductive health ($22B) is broader than fertility alone ($2.1B). Contraception ($380M) is a separate valuation area.",
  },
  {
    bcgId: "maternal-health",
    bcgLabel: "Maternal health",
    valuationAreaKey: "maternal_health",
    valuationAreaName: "Maternal Health",
    status: "aligned",
    note:
      "Same therapeutic area. WEF capital (~$9B) is ~10× valuation VC ($850M) — WEF includes M&A and all WH-tagged flows; valuation uses FemTech segment estimates.",
  },
  {
    bcgId: "generic-womens-health",
    bcgLabel: "Generic women's health",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "Horizontal / multi-vertical WH companies — no single valuation area.",
  },
  {
    bcgId: "mental-health",
    bcgLabel: "Mental health",
    valuationAreaKey: "mental_health",
    valuationAreaName: "Women's Mental Health",
    status: "aligned",
    note: "Closest capital alignment in the crosswalk ($1.4B WEF vs $920M valuation).",
  },
  {
    bcgId: "endometriosis",
    bcgLabel: "Endometriosis",
    valuationAreaKey: "endometriosis",
    valuationAreaName: "Endometriosis & Pelvic Pain",
    status: "aligned",
    note:
      "Same area. WEF capital ($1.7B) exceeds valuation VC ($310M); valuation engine ranks this #1 gap score.",
  },
  {
    bcgId: "pcos",
    bcgLabel: "PCOS",
    valuationAreaKey: "pcos",
    valuationAreaName: "PCOS & Metabolic Reproductive",
    status: "partial",
    note:
      "Valuation VC ($420M) exceeds WEF WH-specific capital ($100M). Valuation bundles metabolic reproductive burden; WEF splits PCOS from metabolic disorders.",
  },
  {
    bcgId: "infectious-diseases",
    bcgLabel: "Infectious diseases",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "No valuation area — outside verified-dataset sector coverage.",
  },
  {
    bcgId: "endocrine-disorders",
    bcgLabel: "Endocrine disorders",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "Partial overlap with PCOS valuation area; not 1:1.",
  },
  {
    bcgId: "urological-disorders",
    bcgLabel: "Urological disorders",
    valuationAreaKey: "sexual_wellness",
    valuationAreaName: "Sexual Health & Wellness",
    status: "partial",
    note: "Weak overlap — urology/FSD adjacent, not equivalent.",
  },
  {
    bcgId: "menstrual-health",
    bcgLabel: "Menstrual health",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "No dedicated valuation area.",
  },
  {
    bcgId: "cardiovascular",
    bcgLabel: "Cardiovascular disorders",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note:
      "HEADLINE GAP: 11 events / ~$10M (WEF). Not in valuation BURDEN_AREAS — misclassification thesis lives here but gap scoring cannot reach it yet.",
  },
  {
    bcgId: "metabolic",
    bcgLabel: "Metabolic disorders",
    valuationAreaKey: "pcos",
    valuationAreaName: "PCOS & Metabolic Reproductive",
    status: "partial",
    note:
      "WEF splits metabolic ($4M) from PCOS ($100M). Valuation merges metabolic reproductive under PCOS. Neither captures diabetes/CVD-adjacent WH gap cleanly.",
  },
  {
    bcgId: "menopause",
    bcgLabel: "Menopausal health",
    valuationAreaKey: "menopause",
    valuationAreaName: "Menopause & Midlife Health",
    status: "aligned",
    note: "Same area. WEF ($1B) vs valuation ($280M) — scope/timing difference.",
  },
  {
    bcgId: "neurological",
    bcgLabel: "Neurological disorders",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "Includes Alzheimer's (WEF $100B opportunity cite) — no valuation area yet.",
  },
  {
    bcgId: "msk-pain",
    bcgLabel: "MSK & pain disorders",
    valuationAreaKey: null,
    valuationAreaName: null,
    status: "unmapped",
    note: "Includes osteoporosis (WEF $100B opportunity cite) — no valuation area yet.",
  },
];

export interface CapitalComparisonRow {
  bcg: BurdenCapitalGapRow;
  crosswalk: BcgValuationCrosswalkEntry;
  valuationVcM: number | null;
  capitalRatio: number | null;
  valuationGapScore: number | null;
}

/** Join BCG rows with valuation capital and gap scores for vetting / UI. */
export function buildCapitalComparison(): CapitalComparisonRow[] {
  const metrics = computeGapMetrics();
  const metricsByKey = new Map(metrics.map((m) => [m.areaKey, m]));

  return BURDEN_CAPITAL_GAP_DATA.map((bcg) => {
    const crosswalk =
      BCG_VALUATION_CROSSWALK.find((c) => c.bcgId === bcg.id) ?? {
        bcgId: bcg.id,
        bcgLabel: bcg.therapeuticArea,
        valuationAreaKey: null,
        valuationAreaName: null,
        status: "unmapped" as const,
        note: "No crosswalk entry.",
      };

    const valuationVcM = crosswalk.valuationAreaKey
      ? BURDEN_AREAS[crosswalk.valuationAreaKey]?.vcDeployedMillion ?? null
      : null;

    const gap: GapMetrics | undefined = crosswalk.valuationAreaKey
      ? metricsByKey.get(crosswalk.valuationAreaKey)
      : undefined;

    return {
      bcg,
      crosswalk,
      valuationVcM,
      capitalRatio:
        valuationVcM && valuationVcM > 0
          ? bcg.capitalRaisedM / valuationVcM
          : null,
      valuationGapScore: gap?.gapScore ?? null,
    };
  });
}

/** Valuation areas with no WEF Figure 3 row. */
export function valuationAreasWithoutBcgRow(): string[] {
  const mappedKeys = new Set(
    BCG_VALUATION_CROSSWALK.map((c) => c.valuationAreaKey).filter(Boolean),
  );
  return Object.entries(BURDEN_AREAS)
    .filter(([key]) => !mappedKeys.has(key))
    .map(([, area]) => area.name);
}

/** Summary counts for UI disclosure. */
export function crosswalkSummary(): {
  mapped: number;
  partial: number;
  unmapped: number;
  headlineUnmapped: string[];
} {
  const entries = BCG_VALUATION_CROSSWALK;
  return {
    mapped: entries.filter((e) => e.status === "aligned").length,
    partial: entries.filter((e) => e.status === "partial").length,
    unmapped: entries.filter((e) => e.status === "unmapped").length,
    headlineUnmapped: entries
      .filter((e) => e.status === "unmapped" && e.bcgId !== "generic-womens-health")
      .map((e) => e.bcgLabel),
  };
}
