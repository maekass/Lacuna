// ============================================================================
// EVIDENCE CLASS TAXONOMY  (sprint/research-x-transactions, Block 0)
// ============================================================================
// Classifies each verified company by the KIND of evidence its core product
// rests on. Deterministic: a manual override map (sprint Block 0) takes
// precedence, then a weighted keyword/sector scorer decides the rest.
//
// Adapted to the real verified-dataset field names (`name`, `sector`,
// `description`) rather than the placeholder shape in the sprint doc.
// ============================================================================

export type EvidenceClass =
  | "clinical_therapeutic"
  | "diagnostic_genomic"
  | "fertility_science"
  | "care_delivery"
  | "consumer_wellness";

export const EVIDENCE_CLASSES: readonly EvidenceClass[] = [
  "clinical_therapeutic",
  "diagnostic_genomic",
  "fertility_science",
  "care_delivery",
  "consumer_wellness",
] as const;

/** Minimal structural shape the classifier needs from a company row. */
export interface ClassifiableCompany {
  readonly name: string;
  readonly sector: string;
  readonly description: string;
}

export function isEvidenceClass(value: unknown): value is EvidenceClass {
  return typeof value === "string" &&
    (EVIDENCE_CLASSES as readonly string[]).includes(value);
}

// ----------------------------------------------------------------------------
// Manual overrides (sprint Block 0). Keyed by exact company `name`.
// Two groups:
//   1. Consumer-grade brands the sprint pins to consumer_wellness even though
//      their copy mentions "fertility"/"test"/"telehealth".
//   2. Research-grade IVF/genomics names pinned so keyword drift can never
//      demote them to consumer_wellness.
// ----------------------------------------------------------------------------
export const EVIDENCE_OVERRIDES: Readonly<Record<string, EvidenceClass>> = {
  // Pinned to consumer_wellness (sprint doc)
  "Oura": "consumer_wellness",
  "Whoop": "consumer_wellness",
  "Clue": "consumer_wellness",
  "Natural Cycles": "consumer_wellness",
  "Ava": "consumer_wellness",
  "Proov": "consumer_wellness",
  "Ovubrush": "consumer_wellness",
  "Apostrophe": "consumer_wellness",
  "Nurx": "consumer_wellness",
  "Lemonaid Health": "consumer_wellness",
  "Livongo Health": "consumer_wellness",
  // Pinned research-grade (sprint doc): keep out of consumer_wellness
  "Igenomix": "diagnostic_genomic",
  "Hamilton Thorne": "fertility_science",
  "ORIGIO a/s": "fertility_science",
  "ZyMōt Fertility": "fertility_science",
};

// ----------------------------------------------------------------------------
// Weighted keyword signals per class. Phrases are matched case-insensitively
// against `${name} ${sector} ${description}`. Longer/more specific phrases
// carry more weight. Ties break by CLASS_PRIORITY (most evidence-heavy first).
// ----------------------------------------------------------------------------
type SignalTable = Readonly<Record<EvidenceClass, ReadonlyArray<readonly [string, number]>>>;

const SIGNALS: SignalTable = {
  clinical_therapeutic: [
    ["pharma", 5], ["therapeutics", 4], ["clinical-stage", 5], ["drug", 4],
    ["biotech", 3], ["biologic", 4], ["hormone therapy", 3], ["inhibitor", 4],
    ["antibody", 4], ["antibody-drug conjugate", 6], ["adc", 3], ["gnrh", 4],
    ["estrogen", 3], ["estradiol", 4], ["estetrol", 4], ["relugolix", 4],
    ["fezolinetant", 4], ["elinzanetant", 4], ["vasomotor", 4], ["oncology", 3],
    ["radiation oncology", 5], ["brachytherapy", 4], ["ablation", 4],
    ["surgical", 4], ["surgery", 2], ["implant", 4], ["mesh sling", 5],
    ["stimulator", 4], ["neuromodulation", 5], ["vessel sealing", 5],
    ["resection", 4], ["retractor", 4], ["contraceptive implant", 5],
    ["medication", 3], ["fibroid", 2], ["treatment of", 3], ["hemorrhage", 3],
    ["non-hormonal", 2], ["cream", 4], ["psoriasis", 4], ["dermatitis", 4],
  ],
  diagnostic_genomic: [
    ["diagnostic", 5], ["diagnostics", 5], ["diagnosis", 4], ["assay", 4],
    ["screening", 4], ["genetic testing", 6], ["genetic screening", 6],
    ["genomic", 5], ["genome", 4], ["sequencing", 5], ["biomarker", 4],
    ["molecular diagnostic", 6], ["nipt", 5], ["non-invasive prenatal", 6],
    ["carrier screen", 5], ["preimplantation genetic", 6], ["prognostic", 4],
    ["point-of-care", 5], ["elastography", 5], ["radiography", 5], ["cfdna", 4],
    ["exome", 4], ["microbiome testing", 5], ["prenatal screening", 5],
    ["early detection", 4], ["multi-cancer", 4], ["specimen", 3], ["clia", 4],
    ["lesion localization", 4], ["molecular test", 5], ["rapid test", 4],
    ["test strips", 2],
  ],
  fertility_science: [
    ["ivf", 5], ["assisted reproduct", 6], ["assisted reproductive", 6],
    ["embryo", 5], ["culture media", 6], ["micro-tools", 5], ["labware", 5],
    ["sperm separation", 6], ["sperm", 3], ["cryopreservation", 5],
    ["donor egg", 5], ["donor", 3], ["fertility clinic", 6],
    ["fertility network", 6], ["fertility medications", 6], ["insemination", 5],
    ["oocyte", 5], ["intracervical", 5], ["ovulation", 2], ["art labs", 6],
    ["ivf labs", 6], ["ivf clinic", 6], ["embryo transfer", 6],
  ],
  care_delivery: [
    ["telehealth", 5], ["telemedicine", 5], ["virtual clinic", 6],
    ["virtual care", 5], ["physical and virtual", 5], ["functional medicine", 5],
    ["care provider", 5], ["midwife", 6], ["physical therapy", 6],
    ["benefits platform", 5], ["benefit solution", 5], ["navigation", 4],
    ["real-world evidence", 5], ["ehr", 5], ["online therapy", 6],
    ["menopause clinic", 6], ["perimenopause", 4], ["care platform", 5],
    ["clinic combining", 6], ["maternity clinic", 6], ["reproductive care", 4],
    ["hybrid", 2], ["clinics", 3], ["digital health", 4],
  ],
  consumer_wellness: [
    ["wearable", 6], ["smart ring", 6], ["fitness", 4], ["meditation", 6],
    ["sleep app", 5], ["tracking app", 5], ["period", 4], ["intimate care", 6],
    ["menstrual cup", 6], ["menstrual product", 6], ["sexual wellness", 6],
    ["trainer", 4], ["breast pump", 5], ["compounding pharmacy", 4],
    ["education brand", 5], ["organic cotton", 5], ["consumer", 4],
    ["at-home", 2], ["app", 2], ["dispensers", 5],
  ],
};

// Light sector prior — nudges thin descriptions toward the typical class.
const SECTOR_PRIOR: Readonly<Record<string, EvidenceClass>> = {
  "Gynecological Surgery": "clinical_therapeutic",
  "Diagnostics": "diagnostic_genomic",
  "Precision Medicine": "diagnostic_genomic",
  "Wearables": "consumer_wellness",
};

// Tie-break order: prefer the more evidence-heavy class when scores tie.
const CLASS_PRIORITY: readonly EvidenceClass[] = [
  "clinical_therapeutic",
  "diagnostic_genomic",
  "fertility_science",
  "care_delivery",
  "consumer_wellness",
];

function scoreClass(
  haystack: string,
  signals: ReadonlyArray<readonly [string, number]>,
): number {
  let score = 0;
  for (const [phrase, weight] of signals) {
    if (haystack.includes(phrase)) score += weight;
  }
  return score;
}

/**
 * Classify a single company into its {@link EvidenceClass}. Override map wins;
 * otherwise the weighted keyword scorer (plus a light sector prior) decides,
 * with {@link CLASS_PRIORITY} breaking ties. Always returns a valid class.
 */
export function classifyEvidence(company: ClassifiableCompany): EvidenceClass {
  const override = EVIDENCE_OVERRIDES[company.name];
  if (override) return override;

  const haystack =
    `${company.name} ${company.sector} ${company.description}`.toLowerCase();

  const scores = new Map<EvidenceClass, number>();
  for (const cls of EVIDENCE_CLASSES) {
    scores.set(cls, scoreClass(haystack, SIGNALS[cls]));
  }

  const prior = SECTOR_PRIOR[company.sector];
  if (prior) scores.set(prior, (scores.get(prior) ?? 0) + 1);

  let best: EvidenceClass = "care_delivery";
  let bestScore = -1;
  for (const cls of CLASS_PRIORITY) {
    const s = scores.get(cls) ?? 0;
    if (s > bestScore) {
      best = cls;
      bestScore = s;
    }
  }
  // No signal matched at all → fall back to a neutral service bucket.
  return bestScore <= 0 ? "care_delivery" : best;
}
