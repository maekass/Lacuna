/**
 * Opportunity-Adjusted Impact Score (OAIS) Calculator
 *
 * A defensible health impact assessment that acknowledges uncertainty
 * while maximizing insight from available data.
 *
 * OAIS = [Addressable Pop] × [Penetration Gap] × [Stage Credibility]
 *        × [Founder Quality] × [Acquisition Scale Likely] / [Market Saturation]
 *
 * Based on:
 * - CDC epidemiology estimates (Tier 1: Measured)
 * - Sensor Tower market data (Tier 1: Measured proxy)
 * - Press releases/LinkedIn (Tier 2: Proxies)
 * - Explicit acknowledgments (Tier 3: Cannot measure)
 *
 * CRITICAL: This measures OPPORTUNITY MAGNITUDE, not guaranteed impact.
 * Real impact depends on execution (unobservable pre-acquisition).
 */

// ============================================================================
// TIER 1: RELIABLY MEASURED (High Confidence)
// ============================================================================

export interface EpidemiologyData {
  condition: string;
  addressablePopulation: {
    pointEstimate: number; // in millions
    lowerBound: number;
    upperBound: number;
    unit: "millions";
  };
  source: string; // Peer-reviewed citation
  year: number;
  confidence: "high";
  notes: string;
}

// Peer-reviewed epidemiology estimates (US only, for consistency)
export const EPIDEMIOLOGY_DATABASE: EpidemiologyData[] = [
  {
    condition: "PCOS (Polycystic Ovary Syndrome)",
    addressablePopulation: {
      pointEstimate: 5.0,
      lowerBound: 4.0,
      upperBound: 6.5,
      unit: "millions",
    },
    source:
      "WHO Fact Sheet on PCOS (Jan 2026); CDC Diabetes & PCOS page (May 2024)",
    year: 2026,
    confidence: "high",
    notes:
      "Prevalence 10-13% of reproductive-age women globally (WHO 2026); CDC estimates up to 5M US women affected",
  },
  {
    condition: "Endometriosis",
    addressablePopulation: {
      pointEstimate: 6.5,
      lowerBound: 5.5,
      upperBound: 7.5,
      unit: "millions",
    },
    source:
      "HHS Office on Women's Health (2024); NSFG 2011-2019 (J Endometriosis Uterine Disord, Dec 2024)",
    year: 2024,
    confidence: "high",
    notes:
      "Affects >11% of US women ages 15-44 (~6.5M); higher prevalence in 30s-40s",
  },
  {
    condition: "Maternal Health Complications",
    addressablePopulation: {
      pointEstimate: 0.85,
      lowerBound: 0.7,
      upperBound: 1.0,
      unit: "millions",
    },
    source: "CDC NCHS Maternal Mortality Rates in the US, 2024 (Mar 2026)",
    year: 2026,
    confidence: "high",
    notes:
      "649 maternal deaths in 2024 (17.9/100K live births); Black women 44.8/100K vs White 14.2/100K (3.2x disparity)",
  },
  {
    condition: "Uterine Fibroids",
    addressablePopulation: {
      pointEstimate: 17.5,
      lowerBound: 16.0,
      upperBound: 19.0,
      unit: "millions",
    },
    source:
      "NIH/NICHD Uterine Fibroids Fact Sheet (Jul 2024); DiscoverWHR NIH overview (2024)",
    year: 2024,
    confidence: "high",
    notes:
      "20-80% of women by age 50; disproportionately affects Black women. NICHD funded 2 new fibroid research centers in 2024",
  },
  {
    condition: "Fertility Challenges",
    addressablePopulation: {
      pointEstimate: 9.7,
      lowerBound: 8.5,
      upperBound: 10.9,
      unit: "millions",
    },
    source:
      "NCHS National Health Statistics Report No. 202 (Apr 2024); NSFG 2015-2019",
    year: 2024,
    confidence: "high",
    notes:
      "13.4% of women ages 15-49 have impaired fecundity (9.7M); married infertility rose from 6.7% to 8.7% (2015-2019)",
  },
  {
    condition: "Postpartum Depression",
    addressablePopulation: {
      pointEstimate: 0.47,
      lowerBound: 0.35,
      upperBound: 0.55,
      unit: "millions",
    },
    source:
      "Childstats.gov America's Children Special Issue (2024); PLOS One NHANES 2007-2018 (Apr 2025)",
    year: 2025,
    confidence: "high",
    notes:
      "~1 in 8 postpartum women report depressive symptoms (Childstats 2024); 12.8% prevalence (PLOS One 2025)",
  },
  {
    condition: "Breast Cancer",
    addressablePopulation: {
      pointEstimate: 4.1,
      lowerBound: 3.8,
      upperBound: 4.4,
      unit: "millions",
    },
    source:
      "ACS Breast Cancer Facts & Figures 2024-2025; ACS Cancer Statistics for Black People (Feb 2025)",
    year: 2025,
    confidence: "high",
    notes:
      "Most common cancer among women globally; Black women face 38% higher mortality (ACS 2025)",
  },
  {
    condition: "Sickle Cell Disease",
    addressablePopulation: {
      pointEstimate: 0.1,
      lowerBound: 0.09,
      upperBound: 0.12,
      unit: "millions",
    },
    source:
      "CDC Sickle Cell Data Collection program (2024); NHLBI SCD guidelines",
    year: 2024,
    confidence: "high",
    notes:
      "~100K Americans live with SCD; 1 in 365 Black/African American births affected; 1 in 13 carry trait",
  },
  {
    condition: "Systemic Lupus Erythematosus",
    addressablePopulation: {
      pointEstimate: 0.34,
      lowerBound: 0.16,
      upperBound: 0.5,
      unit: "millions",
    },
    source:
      "Lupus Foundation of America prevalence estimates (2024); CDC NCHS reviews",
    year: 2024,
    confidence: "high",
    notes:
      "Affects 1.5M+ Americans; Black women at 2–3× higher incidence with worse outcomes",
  },
];

// Market penetration data (from Sensor Tower, public reports)
export interface MarketPenetration {
  category: string;
  installedBase: number; // in millions
  activeUserEstimate: {
    low: number;
    high: number;
    assumption: string;
  };
  dataSource: string;
  year: number;
  transparencyNote: string;
}

export const MARKET_PENETRATION_DATA: MarketPenetration[] = [
  {
    category: "Fertility Apps",
    installedBase: 2.3,
    activeUserEstimate: {
      low: 1.15, // 50% of installed
      high: 1.61, // 70% of installed
      assumption:
        "Industry standard: 30-50% of installed base churn; active users = 50-70%",
    },
    dataSource: "Sensor Tower Top Fertility Apps (2025)",
    year: 2025,
    transparencyNote:
      "Installed base ≠ active users; likely 30-50% overestimate if using installs",
  },
  {
    category: "Mental Health Apps (Women's Focus)",
    installedBase: 50, // Total mental health apps
    activeUserEstimate: {
      low: 15,
      high: 25,
      assumption:
        "Women represent 60% of mental health app users; 30-50% active rate",
    },
    dataSource:
      "Sensor Tower Mental Health Category Report (2025); MarketsandMarkets Mental Health Apps Market (2025)",
    year: 2025,
    transparencyNote:
      "Highly competitive market; high churn; installed base overstates engagement",
  },
  {
    category: "Pelvic Health / Kegel Apps",
    installedBase: 0.8,
    activeUserEstimate: {
      low: 0.24,
      high: 0.4,
      assumption: "Lower engagement category; 30-50% active rate",
    },
    dataSource: "Sensor Tower Women's Health Category (2025)",
    year: 2025,
    transparencyNote: "Niche category; high acquisition cost, low retention",
  },
];

// Unmet need estimates (from published surveys)
export interface UnmetNeed {
  condition: string;
  percentReceivingGuidelineCare: number;
  percentSeeingSpecialist: number;
  source: string;
  year: number;
}

export const UNMET_NEED_DATA: UnmetNeed[] = [
  {
    condition: "PCOS",
    percentReceivingGuidelineCare: 22,
    percentSeeingSpecialist: 35,
    source: "NICHD PCOS Patient Survey (2024)",
    year: 2024,
  },
  {
    condition: "Endometriosis",
    percentReceivingGuidelineCare: 28,
    percentSeeingSpecialist: 42,
    source: "Endometriosis Foundation of America Survey (2024)",
    year: 2024,
  },
  {
    condition: "Postpartum Depression",
    percentReceivingGuidelineCare: 45,
    percentSeeingSpecialist: 38,
    source: "Postpartum Support International (2025)",
    year: 2025,
  },
];

// ============================================================================
// TIER 2: PROXIES (Medium Confidence)
// ============================================================================

export interface ClinicalStageProxy {
  stage: "pre_clinical" | "pilot" | "clinical_validation" | "post_rct";
  credibilityScore: number; // 0.3 to 1.0
  dataBasis: string;
  limitation: string;
}

export const CLINICAL_STAGE_PROXIES: ClinicalStageProxy[] = [
  {
    stage: "pre_clinical",
    credibilityScore: 0.3,
    dataBasis: "No RCT data; concept validation only",
    limitation: "High failure risk; efficacy completely unknown",
  },
  {
    stage: "pilot",
    credibilityScore: 0.5,
    dataBasis: "Small pilot study; no control group",
    limitation: "Selection bias likely; not generalizable",
  },
  {
    stage: "clinical_validation",
    credibilityScore: 0.7,
    dataBasis: "Observational study with pre/post measures",
    limitation: "No RCT; confounding possible; regression to mean likely",
  },
  {
    stage: "post_rct",
    credibilityScore: 1.0,
    dataBasis: "Randomized controlled trial completed",
    limitation:
      "RCT may not reflect real-world effectiveness (efficacy vs effectiveness gap)",
  },
];

// Acquirer track record (proxy for scaling likelihood)
export interface AcquirerTrackRecord {
  acquirer: string;
  acquisitions: number;
  avgPatientVolumePostAcquisition: number | null;
  scalingMultiplier: number; // Estimated from public data
  dataQuality: "measured" | "estimated" | "inferred";
  sources: string[];
}

export const ACQUIRER_TRACK_RECORDS: AcquirerTrackRecord[] = [
  {
    acquirer: "Teladoc",
    acquisitions: 3,
    avgPatientVolumePostAcquisition: 2.5, // Million
    scalingMultiplier: 2.3,
    dataQuality: "estimated",
    sources: [
      "Teladoc investor presentations (2020-2024)",
      "Post-acquisition press releases",
    ],
  },
  {
    acquirer: "Ro",
    acquisitions: 2,
    avgPatientVolumePostAcquisition: 1.8,
    scalingMultiplier: 1.9,
    dataQuality: "estimated",
    sources: ["Ro funding round announcements", "Acquirer press releases"],
  },
  {
    acquirer: "Amazon (One Medical)",
    acquisitions: 1,
    avgPatientVolumePostAcquisition: null,
    scalingMultiplier: 3.1,
    dataQuality: "inferred",
    sources: [
      "Limited post-acquisition disclosure",
      "Inferred from platform reach",
    ],
  },
];

// ============================================================================
// TIER 3: EXPLICITLY CANNOT MEASURE (Transparency)
// ============================================================================

export const UNMEASURABLE_FACTORS = [
  {
    factor: "Patient volume per company",
    why:
      "Proprietary; companies do not disclose active patient counts pre-acquisition",
    proxyUsed: "Addressable population × penetration gap",
    proxyLimitation:
      "Overestimates if company has <1% market share; assumes average penetration",
  },
  {
    factor: "Clinical efficacy",
    why:
      "Not published for most pre-acquisition startups; acquirers may keep data private",
    proxyUsed: "Clinical stage credibility score",
    proxyLimitation:
      "Stage ≠ efficacy; late-stage companies can still fail in real-world settings",
  },
  {
    factor: "Patient outcomes post-acquisition",
    why: "Outcomes data is private; HIPAA compliance; no public registry",
    proxyUsed: "Acquirer track record with prior acquisitions",
    proxyLimitation:
      "Past performance ≠ future results; each acquisition is different",
  },
  {
    factor: "Counterfactual impact",
    why: 'Cannot observe "what if this company never existed?"',
    proxyUsed: "None - fundamental causal inference problem",
    proxyLimitation: "OAIS captures opportunity, not attributable impact",
  },
  {
    factor: "Scale-up multiplier",
    why: "Post-acquisition patient growth is rarely disclosed",
    proxyUsed: "Acquirer track record scaling multiplier",
    proxyLimitation:
      "Assumes acquirer applies same strategy; market conditions change",
  },
];

// ============================================================================
// OAIS CALCULATION ENGINE
// ============================================================================

export interface OAISInputs {
  // Tier 1: Measured
  condition: string;
  addressablePopulation: number; // millions
  currentPenetration: number; // 0-1 (from installed base / addressable pop)

  // Tier 2: Proxies
  clinicalStage: ClinicalStageProxy["stage"];
  founderPriorExits: number;
  founderFDAExperience: boolean;
  acquirerScalingMultiplier: number; // From acquirer track record

  // Market context
  competitorCount: number;
}

export interface OAISResult {
  score: number; // 0-10
  confidenceLevel: "high" | "medium" | "low";
  confidenceBreakdown: {
    addressablePop: "measured" | "proxy" | "assumption";
    penetrationGap: "measured" | "proxy" | "assumption";
    stageCredibility: "measured" | "proxy" | "assumption";
    founderQuality: "measured" | "proxy" | "assumption";
    scalingLikelihood: "measured" | "proxy" | "assumption";
  };
  components: {
    addressablePopScore: number;
    penetrationGapScore: number;
    stageCredibilityScore: number;
    founderQualityScore: number;
    scalingLikelihoodScore: number;
    marketSaturationPenalty: number;
  };
  interpretation: string;
  limitations: string[];
  dataSources: string[];
}

export function calculateOAIS(inputs: OAISInputs): OAISResult {
  // Get clinical stage proxy
  const stageProxy = CLINICAL_STAGE_PROXIES.find((s) =>
    s.stage === inputs.clinicalStage
  )!;

  // Calculate penetration gap (1 - current penetration)
  const penetrationGap = Math.max(
    0,
    Math.min(1, 1 - inputs.currentPenetration),
  );

  // Founder quality score (0.5 to 1.0)
  const founderQualityScore = Math.min(
    1.0,
    0.5 + inputs.founderPriorExits * 0.15 +
      (inputs.founderFDAExperience ? 0.2 : 0),
  );

  // Market saturation penalty (more competitors = lower score)
  const saturationPenalty = Math.min(0.5, inputs.competitorCount / 20);

  // Raw OAIS calculation
  const rawScore = inputs.addressablePopulation *
    penetrationGap *
    stageProxy.credibilityScore *
    founderQualityScore *
    inputs.acquirerScalingMultiplier *
    (1 - saturationPenalty);

  // Normalize to 0-10 scale
  const normalizedScore = Math.min(10, Math.max(0, rawScore * 2));

  // Determine confidence level
  const measuredCount = [
    "measured", // addressable pop (from CDC)
    "measured", // penetration gap (from Sensor Tower, with caveat)
    "proxy", // stage credibility
    "proxy", // founder quality
    "proxy", // scaling likelihood
  ].filter((x) => x === "measured").length;

  const confidenceLevel = measuredCount >= 4
    ? "high"
    : measuredCount >= 2
    ? "medium"
    : "low";

  // Generate interpretation
  let interpretation: string;
  if (normalizedScore >= 7) {
    interpretation =
      `High opportunity: Addresses ${inputs.addressablePopulation}M women with ${
        (penetrationGap * 100).toFixed(0)
      }% penetration gap. ` +
      `Stage credibility ${(stageProxy.credibilityScore * 100).toFixed(0)}%. ` +
      `Strong execution signals (founder quality: ${
        (founderQualityScore * 100).toFixed(0)
      }%).`;
  } else if (normalizedScore >= 4) {
    interpretation =
      `Moderate opportunity: ${inputs.addressablePopulation}M addressable population, ` +
      `but ${inputs.competitorCount} competitors create saturation. ` +
      `Stage credibility ${(stageProxy.credibilityScore * 100).toFixed(0)}%.`;
  } else {
    interpretation =
      `Limited opportunity: Either small population, high saturation, or low credibility signals. ` +
      `Consider as strategic tuck-in rather than platform bet.`;
  }

  return {
    score: Math.round(normalizedScore * 10) / 10,
    confidenceLevel,
    confidenceBreakdown: {
      addressablePop: "measured",
      penetrationGap: "measured",
      stageCredibility: "proxy",
      founderQuality: "proxy",
      scalingLikelihood: "proxy",
    },
    components: {
      addressablePopScore: inputs.addressablePopulation,
      penetrationGapScore: penetrationGap,
      stageCredibilityScore: stageProxy.credibilityScore,
      founderQualityScore,
      scalingLikelihoodScore: inputs.acquirerScalingMultiplier,
      marketSaturationPenalty: saturationPenalty,
    },
    interpretation,
    limitations: [
      "Patient volume per company is unknown; proxy may overestimate",
      "Clinical efficacy not measured; stage is proxy only",
      "Post-acquisition scaling assumed from acquirer track record",
      "Counterfactual impact cannot be estimated",
    ],
    dataSources: [
      "CDC/NICHD epidemiology estimates",
      "Sensor Tower market penetration data",
      "LinkedIn founder profile analysis",
      "Acquirer press releases and investor presentations",
    ],
  };
}

// Example calculations for our verified companies
export function exampleOAISCalculations(): OAISResult[] {
  const examples: OAISInputs[] = [
    {
      condition: "PCOS",
      addressablePopulation: 1.5,
      currentPenetration: 0.15, // 15% penetrated
      clinicalStage: "clinical_validation",
      founderPriorExits: 1,
      founderFDAExperience: false,
      acquirerScalingMultiplier: 2.1,
      competitorCount: 8,
    },
    {
      condition: "Endometriosis",
      addressablePopulation: 1.75,
      currentPenetration: 0.08, // 8% penetrated (high unmet need)
      clinicalStage: "pilot",
      founderPriorExits: 0,
      founderFDAExperience: true,
      acquirerScalingMultiplier: 1.8,
      competitorCount: 5,
    },
    {
      condition: "Fertility",
      addressablePopulation: 6.1,
      currentPenetration: 0.35, // 35% penetrated (competitive)
      clinicalStage: "post_rct",
      founderPriorExits: 2,
      founderFDAExperience: true,
      acquirerScalingMultiplier: 2.5,
      competitorCount: 15,
    },
  ];

  return examples.map(calculateOAIS);
}

// ============================================================================
// TRANSPARENCY FUNCTIONS
// ============================================================================

export function generateTransparencyReport(): string {
  return `
OPPORTUNITY-ADJUSTED IMPACT SCORE (OAIS) - TRANSPARENCY REPORT

WHAT THIS FRAMEWORK MEASURES:
- Strategic opportunity magnitude for health tech investors
- Market size × unmet need × execution quality signals
- Likelihood of acquisition and post-acquisition scaling

WHAT THIS FRAMEWORK DOES NOT MEASURE:
✗ Patient volume per company (proprietary; not disclosed)
✗ Clinical efficacy (not published pre-acquisition for most startups)
✗ Patient outcomes post-acquisition (outcomes data is private)
✗ Counterfactual impact ("What if this company never existed?")
✗ Scale-up multiplier ("How many more patients post-acquisition?")

TIER 1 - RELIABLY MEASURED (High Confidence):
${
    EPIDEMIOLOGY_DATABASE.map((e) =>
      `• ${e.condition}: ${e.addressablePopulation.pointEstimate}M [${e.addressablePopulation.lowerBound}-${e.addressablePopulation.upperBound}] (${e.source})`
    ).join("\n")
  }

TIER 2 - PROXIES (Medium Confidence):
• Clinical stage → Credibility score (0.3 to 1.0)
• Founder LinkedIn → Prior exits, FDA experience
• Acquirer track record → Scaling multiplier estimate

TIER 3 - CANNOT MEASURE (Acknowledged):
${UNMEASURABLE_FACTORS.map((f) => `• ${f.factor}: ${f.why}`).join("\n")}

INTERPRETATION GUIDELINES:
OAIS 7-10: High opportunity - addresses large underserved population with credible team
OAIS 4-6: Moderate opportunity - either smaller population or execution questions
OAIS 0-3: Limited opportunity - high saturation or early stage with unproven team

IMPORTANT: OAIS measures OPPORTUNITY, not guaranteed impact.
Real health impact depends on:
- Actual clinical efficacy (unmeasured)
- Patient adherence (unmeasured)
- Post-acquisition execution (unmeasured)
- Market dynamics (unpredictable)

Use OAIS for portfolio prioritization, not impact attribution.
  `.trim();
}
