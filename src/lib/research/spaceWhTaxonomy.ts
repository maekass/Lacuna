/**
 * Provenance tags and trial→transaction stages for space-linked women's health research.
 * Used to expose coverage gaps — not investment advice.
 */

/** How the asset relates to spaceflight (mutually exclusive primary tag). */
export type SpaceWhProvenanceTag =
  | "space_tested_therapeutic"
  | "space_formulation"
  | "astronaut_operational_pharma"
  | "space_physiology_only";

export const SPACE_WH_PROVENANCE_LABELS: Record<SpaceWhProvenanceTag, string> = {
  space_tested_therapeutic:
    "Therapeutic tested in space (animal/cell efficacy)",
  space_formulation: "Formulation / delivery informed by microgravity",
  astronaut_operational_pharma:
    "Operational pharma used by women in flight (not a product trial)",
  space_physiology_only:
    "Physiology / device / cell study — no therapeutic candidate",
};

/**
 * Ordered pipeline from research signal → commercial transaction.
 * An asset's `furthestStage` is the highest stage with evidence.
 */
export type TrialToTransactionStage =
  | "research_signal"
  | "space_validation"
  | "earth_trial"
  | "company"
  | "transaction";

export const PIPELINE_STAGE_ORDER: readonly TrialToTransactionStage[] = [
  "research_signal",
  "space_validation",
  "earth_trial",
  "company",
  "transaction",
] as const;

export const PIPELINE_STAGE_LABELS: Record<TrialToTransactionStage, string> = {
  research_signal: "Research signal",
  space_validation: "Space validation",
  earth_trial: "Earth trial signal",
  company: "Company in Lacuna dataset",
  transaction: "Verified M&A transaction",
};

/** Women's health areas used for gap matrix rows. */
export type SpaceWhTherapeuticArea =
  | "osteoporosis_postmenopausal"
  | "contraception_menstrual"
  | "oncology_breast"
  | "oncology_gynecologic"
  | "fertility_ovarian"
  | "menstrual_devices"
  | "menopause_adjacent";

export const THERAPEUTIC_AREA_LABELS: Record<SpaceWhTherapeuticArea, string> = {
  osteoporosis_postmenopausal: "Osteoporosis (postmenopausal)",
  contraception_menstrual: "Contraception / menstrual suppression",
  oncology_breast: "Breast oncology",
  oncology_gynecologic: "Gynecologic oncology",
  fertility_ovarian: "Fertility / ovarian function",
  menstrual_devices: "Menstrual devices",
  menopause_adjacent: "Menopause-adjacent (bone / hormones)",
};

export function stageIndex(stage: TrialToTransactionStage): number {
  return PIPELINE_STAGE_ORDER.indexOf(stage);
}

export function furthestStage(
  reached: Iterable<TrialToTransactionStage>,
): TrialToTransactionStage {
  let best: TrialToTransactionStage = "research_signal";
  for (const stage of reached) {
    if (stageIndex(stage) > stageIndex(best)) best = stage;
  }
  return best;
}

/** Stages not yet reached — the gap list for an asset. */
export function missingStages(
  furthest: TrialToTransactionStage,
): TrialToTransactionStage[] {
  const idx = stageIndex(furthest);
  return PIPELINE_STAGE_ORDER.filter((_, i) => i > idx);
}
