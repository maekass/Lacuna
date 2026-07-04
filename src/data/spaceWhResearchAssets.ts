/**
 * Curated space-linked women's health research assets.
 * Citations are public (ISS National Lab, NASA, journals). Not investment advice.
 */

import type {
  SpaceWhProvenanceTag,
  SpaceWhTherapeuticArea,
} from "@/lib/research/spaceWhTaxonomy";

export interface SpaceWhCitation {
  label: string;
  url: string;
}

export interface SpaceWhResearchAsset {
  id: string;
  name: string;
  summary: string;
  provenanceTag: SpaceWhProvenanceTag;
  therapeuticAreas: SpaceWhTherapeuticArea[];
  /** ClinicalTrials.gov query.cond / free-text terms for Earth trial discovery. */
  ctgovSearchTerms: string[];
  /** Names used to match verified companies / acquirers (case-insensitive). */
  entityAliases: string[];
  /** Optional known NCT IDs (Earth trials only — not spaceflight IDs). */
  knownNctIds?: string[];
  citations: SpaceWhCitation[];
  /** Explicit gap notes for UI (honest limits). */
  gapNotes: string[];
}

export const SPACE_WH_RESEARCH_ASSETS: readonly SpaceWhResearchAsset[] = [
  {
    id: "bp-nell-peg",
    name: "BP-NELL-PEG (NELL-1 osteoporosis therapeutic)",
    summary:
      "PEGylated NELL-1 conjugated to inactive bisphosphonate; tested in mice on ISS Rodent Research-5. Dual anabolic/anti-resorptive candidate for extreme bone loss — Earth indication includes postmenopausal osteoporosis.",
    provenanceTag: "space_tested_therapeutic",
    therapeuticAreas: [
      "osteoporosis_postmenopausal",
      "menopause_adjacent",
    ],
    ctgovSearchTerms: [
      "NELL-1",
      "osteoporosis postmenopausal",
      "bisphosphonate conjugate bone anabolic",
    ],
    entityAliases: [],
    citations: [
      {
        label: "ISS National Lab — osteoporosis therapeutic case study",
        url: "https://issnationallab.org/case_study/new-osteoporosis-therapeutic/",
      },
      {
        label: "npj Microgravity 2023 — BP-NELL-PEG ISS study",
        url: "https://doi.org/10.1038/s41526-023-00319-7",
      },
    ],
    gapNotes: [
      "Preclinical only — no approved human product.",
      "No sponsor company in Lacuna verified dataset.",
      "Earth CT.gov hits for NELL-1 are sparse; space validation has not translated to a public Phase 2/3 WH program in Lacuna's catalog.",
    ],
  },
  {
    id: "astronaut-coc-menstrual-suppression",
    name: "Combined oral contraceptives (astronaut menstrual suppression)",
    summary:
      "Continuous COCs used operationally by female astronauts for amenorrhea and contraception. Not a space efficacy trial — operational medicine with VTE and bone-density interaction concerns.",
    provenanceTag: "astronaut_operational_pharma",
    therapeuticAreas: ["contraception_menstrual", "menopause_adjacent"],
    ctgovSearchTerms: [
      "oral contraceptive continuous amenorrhea",
      "levonorgestrel IUD",
      "contraceptive implant progestin",
    ],
    entityAliases: ["Organon", "Organon (via Merck spinoff)"],
    citations: [
      {
        label: "npj Microgravity 2016 — medically induced amenorrhea",
        url: "https://www.nature.com/articles/npjmgrav20168",
      },
      {
        label: "PubMed — albumin, oral contraceptives, VTE in astronauts",
        url: "https://pubmed.ncbi.nlm.nih.gov/35389755/",
      },
      {
        label: "NASA OCHMO VTE risk assessment (2025)",
        url: "https://www.nasa.gov/wp-content/uploads/2025/02/venous-thromboembolism-vte-report-ochmo-012825.pdf",
      },
    ],
    gapNotes: [
      "Operational use ≠ product development pipeline.",
      "Sex-specific PK/PD of contraceptives in microgravity largely unstudied.",
      "Lacuna links Organon (Merck spinoff) as an acquirer — not a space-originated contraceptive asset.",
    ],
  },
  {
    id: "pembrolizumab-iss-formulation",
    name: "Pembrolizumab (Keytruda) microgravity crystallization",
    summary:
      "Merck ISS protein-crystal growth informed uniform crystalline suspensions and a subcutaneous delivery path. Not a women's-health-only drug; indications include some gynecologic and breast cancers.",
    provenanceTag: "space_formulation",
    therapeuticAreas: ["oncology_breast", "oncology_gynecologic"],
    ctgovSearchTerms: [
      "pembrolizumab endometrial",
      "pembrolizumab breast cancer",
      "pembrolizumab cervical",
    ],
    entityAliases: ["Merck", "Organon (via Merck spinoff)"],
    citations: [
      {
        label: "NASA — ISS research informs FDA-approved cancer therapy",
        url: "https://www.nasa.gov/missions/station/iss-research/space-station-research-informs-new-fda-approved-cancer-therapy/",
      },
      {
        label: "ISS National Lab — Merck pembrolizumab crystallization",
        url: "https://issnationallab.org/press-releases/merk-lab-research-could-improve-cancer-drug-delivery/",
      },
    ],
    gapNotes: [
      "Formulation/delivery win — not a new WH mechanism of action.",
      "Merck is not a Lacuna verified acquirer entity; Organon (Merck spinoff) appears on WH deals only.",
    ],
  },
  {
    id: "microquin-tmbim6",
    name: "MicroQuin TMBIM6 small-molecule (breast/ovarian models)",
    summary:
      "ISS 3D breast cancer cultures and TMBIM6 crystallization informed a small-molecule candidate reported active across cancer lines including breast and ovarian. Early-stage biotech — not in verified M&A set.",
    provenanceTag: "space_formulation",
    therapeuticAreas: ["oncology_breast", "oncology_gynecologic"],
    ctgovSearchTerms: [
      "TMBIM6",
      "breast cancer targeted therapy",
      "ovarian cancer small molecule",
    ],
    entityAliases: ["MicroQuin"],
    citations: [
      {
        label: "ISS National Lab — Orbital Oncology / MicroQuin",
        url: "https://issnationallab.org/upward/orbital-oncology-microquin/",
      },
    ],
    gapNotes: [
      "No public late-stage CT.gov program under TMBIM6 in Lacuna's live search defaults.",
      "No company or deal in verified dataset — classic research→transaction gap.",
    ],
  },
  {
    id: "rr20-female-reproductive",
    name: "NASA Rodent Research-20 / female reproductive physiology",
    summary:
      "Long-duration spaceflight effects on ovarian function, fecundity, and transgenerational outcomes in mice. Maps risk for fertility and ovarian reserve — no therapeutic tested.",
    provenanceTag: "space_physiology_only",
    therapeuticAreas: ["fertility_ovarian"],
    ctgovSearchTerms: [
      "ovarian reserve anti-Mullerian",
      "female fertility microgravity",
      "premature ovarian insufficiency",
    ],
    entityAliases: [],
    citations: [
      {
        label: "KU Medical Center — NASA female fertility research",
        url: "https://www.kumc.edu/about/news/news-archive/nasa-female-fertility-research.html",
      },
      {
        label: "PNAS abstract — female reproductive dysfunction after spaceflight",
        url: "https://www.pnas.org/doi/abs/10.1073/pnas.2606092123",
      },
    ],
    gapNotes: [
      "Physiology gap: risk characterized, no space-tested therapeutic for ovarian protection.",
      "Earth fertility companies exist in Lacuna, but none are linked to this space program.",
    ],
  },
  {
    id: "orion-ovarian-cells",
    name: "Axiom ORION — ovarian granulosa/theca cells",
    summary:
      "Microgravity modulation of ovarian cell hormone production (ASI / Axiom). Fertility mechanism research — no drug candidate.",
    provenanceTag: "space_physiology_only",
    therapeuticAreas: ["fertility_ovarian"],
    ctgovSearchTerms: [
      "granulosa cell",
      "ovarian hormone production",
      "IVF ovarian stimulation",
    ],
    entityAliases: [],
    citations: [
      {
        label: "Axiom Space — ORION research",
        url: "https://axiomspace.com/research/orion",
      },
    ],
    gapNotes: [
      "No path from cell study to Lacuna company or deal.",
    ],
  },
  {
    id: "astrocup-menstrual-cups",
    name: "AstroCup — menstrual cups in spaceflight conditions",
    summary:
      "Lunette menstrual cups on suborbital flight; material integrity only. Device autonomy research — not a pharmaceutical.",
    provenanceTag: "space_physiology_only",
    therapeuticAreas: ["menstrual_devices", "contraception_menstrual"],
    ctgovSearchTerms: [
      "menstrual cup",
      "menstrual hygiene",
    ],
    entityAliases: ["Lunette"],
    citations: [
      {
        label: "npj Women's Health — AstroCup",
        url: "https://www.nature.com/articles/s44294-025-00112-9",
      },
    ],
    gapNotes: [
      "Device, not pharma. No femtech menstrual-cup company in verified M&A set.",
    ],
  },
] as const;

export const SPACE_WH_RESEARCH_MODEL = {
  module: "src/data/spaceWhResearchAssets.ts",
  exportName: "SPACE_WH_RESEARCH_ASSETS",
  definition:
    "Curated public citations of space-linked women's health research. Pipeline stages computed against Lacuna verified dataset + CT.gov search terms. Exposes gaps — not a complete catalog or investment thesis.",
} as const;
