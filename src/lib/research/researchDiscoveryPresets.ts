/**
 * Institution presets for domestic study discovery (NIH RePORTER + CT.gov).
 * Separate from the static catalog — used to ground LLM expansion candidates.
 */

import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";

export type ResearchDiscoveryPresetId =
  | "mit"
  | "harvard"
  | "broad"
  | "nih";

export interface ResearchDiscoveryPreset {
  id: ResearchDiscoveryPresetId;
  label: string;
  institution: DomesticInstitution;
  /** NIH RePORTER org_names (wildcard match). */
  nihOrgNames: readonly string[];
  /** ClinicalTrials.gov lead sponsor queries. */
  ctgSponsors: readonly string[];
  /** Women's health condition keywords for CT.gov query.cond. */
  conditionQuery: string;
  /** NIH advanced_text_search terms (project title / abstract / terms). */
  nihTextSearch: string;
  /** Known labs / centers for LLM context hints (not auto-cited). */
  labHints: readonly string[];
}

export const RESEARCH_DISCOVERY_PRESETS: Readonly<
  Record<ResearchDiscoveryPresetId, ResearchDiscoveryPreset>
> = {
  mit: {
    id: "mit",
    label: "MIT",
    institution: "mit",
    nihOrgNames: [
      "Massachusetts Institute of Technology",
      "MIT",
    ],
    ctgSponsors: [
      "Massachusetts Institute of Technology",
      "MIT",
    ],
    conditionQuery:
      "endometriosis PCOS infertility preterm birth breast cancer ovarian contraception",
    nihTextSearch:
      "endometriosis PCOS infertility gynecology reproductive maternal",
    labHints: [
      "MIT Center for Gynepathology Research (CGR)",
      "Griffith Lab — tissue engineering / physiomimetic models",
      "Female Medicine through Machine Learning (FMML)",
      "Koch Institute for Integrative Cancer Research",
    ],
  },
  broad: {
    id: "broad",
    label: "Broad Institute",
    institution: "harvard_mit_collab",
    nihOrgNames: ["Broad Institute"],
    ctgSponsors: ["Broad Institute"],
    conditionQuery:
      "endometriosis PCOS breast cancer ovarian fertility genomics",
    nihTextSearch:
      "women reproductive gynecologic breast ovarian genomics gnomAD",
    labHints: [
      "Broad Institute of MIT and Harvard",
      "Cancer Program / DepMap / CCLE",
      "Medical and Population Genetics (MPG)",
    ],
  },
  harvard: {
    id: "harvard",
    label: "Harvard affiliates",
    institution: "harvard",
    nihOrgNames: [
      "Harvard University",
      "Harvard Medical School",
      "Brigham and Women's Hospital",
      "Massachusetts General Hospital",
      "Dana-Farber Cancer Institute",
    ],
    ctgSponsors: [
      "Brigham and Women's Hospital",
      "Massachusetts General Hospital",
      "Dana-Farber Cancer Institute",
      "Harvard Medical School",
    ],
    conditionQuery:
      "endometriosis PCOS breast cancer ovarian infertility maternal lupus",
    nihTextSearch:
      "women reproductive gynecologic breast ovarian PCOS endometriosis",
    labHints: [
      "Nurses' Health Study (Chan School)",
      "Black Women's Health Study (BU Slone)",
      "Brigham Center for Hereditary Cancer",
    ],
  },
  nih: {
    id: "nih",
    label: "NIH",
    institution: "nih",
    nihOrgNames: [
      "National Institutes of Health",
      "National Cancer Institute",
      "National Heart, Lung, and Blood Institute",
    ],
    ctgSponsors: [
      "National Institutes of Health",
      "National Cancer Institute",
      "National Heart, Lung, and Blood Institute",
    ],
    conditionQuery:
      "endometriosis PCOS sickle cell lupus breast cancer maternal",
    nihTextSearch:
      "women reproductive gynecologic PCOS endometriosis maternal sickle",
    labHints: [
      "All of Us Research Program",
      "Women's Health Initiative (WHI)",
      "NICHD Reproductive Medicine Network",
    ],
  },
} as const;

export const RESEARCH_DISCOVERY_PRESET_IDS = Object.keys(
  RESEARCH_DISCOVERY_PRESETS,
) as ResearchDiscoveryPresetId[];
