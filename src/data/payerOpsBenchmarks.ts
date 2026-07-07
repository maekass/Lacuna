/**
 * Public payer-ops benchmarks scraped from published industry and policy sources.
 * Used to ground segment defaults and {@link MODEL_ASSUMPTIONS} in opportunityModel.ts.
 *
 * Refresh metadata: `npm run payer-ops:benchmarks:fetch`
 */

export interface PublicBenchmark<T extends number | string = number> {
  value: T;
  unit: string;
  /** Short citation (organization + year + report title fragment). */
  source: string;
  sourceUrl: string;
  /** ISO date when value was verified against the source. */
  retrievedAt: string;
  notes?: string;
}

export const PAYER_OPS_BENCHMARK_RETRIEVED_AT = "2026-07-04";

/** CAQH 2023 Index — medical prior authorization (Table: cost per transaction by mode). */
export const CAQH_2023_PRIOR_AUTH = {
  payerCostManual: {
    value: 3.52,
    unit: "USD per transaction",
    source:
      "CAQH, 2023 Index Report — plan labor cost, manual prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes: "Labor only; excludes system costs and pre/post transaction work.",
  },
  payerCostElectronic: {
    value: 0.05,
    unit: "USD per transaction",
    source:
      "CAQH, 2023 Index Report — plan labor cost, fully electronic prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  providerCostManual: {
    value: 10.97,
    unit: "USD per transaction",
    source:
      "CAQH, 2023 Index Report — provider labor cost, manual prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  providerCostElectronic: {
    value: 5.79,
    unit: "USD per transaction",
    source:
      "CAQH, 2023 Index Report — provider labor cost, fully electronic prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  providerMinutesElectronic: {
    value: 11,
    unit: "minutes per transaction",
    source:
      "CAQH, 2023 Index Report — average provider time, electronic prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  providerMinutesPortal: {
    value: 16,
    unit: "minutes per transaction",
    source:
      "CAQH, 2023 Index Report — average provider time, portal prior authorization",
    sourceUrl:
      "https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** KFF analyses of CMS Marketplace transparency data. */
export const KFF_CLAIM_DENIALS = {
  marketplaceInNetworkDenialRate2023: {
    value: 20,
    unit: "percent of in-network claims",
    source:
      "KFF, Claims Denials and Appeals in ACA Marketplace Plans in 2023 (CMS transparency PUF)",
    sourceUrl:
      "https://www.kff.org/private-insurance/claims-denials-and-appeals-in-aca-marketplace-plans-in-2023/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  marketplaceInNetworkDenialRate2024: {
    value: 19,
    unit: "percent of in-network claims",
    source: "KFF, Claims Denials and Appeals in ACA Marketplace Plans in 2024",
    sourceUrl:
      "https://www.kff.org/patient-consumer-protections/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  adminDenialReasonShare2023: {
    value: 21,
    unit: "percent of in-network denial reasons",
    source:
      "KFF 2023 Marketplace denials brief — administrative denial reason share",
    sourceUrl:
      "https://www.kff.org/private-insurance/claims-denials-and-appeals-in-aca-marketplace-plans-in-2023/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes:
      "Administrative reasons among reported denial reasons for in-network claims.",
  },
  medicareAdvantagePriorAuthDenialRate2024: {
    value: 7.7,
    unit: "percent of prior authorization requests",
    source:
      "KFF, Medicare Advantage prior authorization denials analysis (2024 CMS data)",
    sourceUrl:
      "https://www.kff.org/patient-consumer-protections/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes:
      "Cited within KFF 2024 marketplace brief; MA PA denial rate nearly 8%.",
  },
  medicareAdvantageAppealOverturnRate2023: {
    value: 81.7,
    unit: "percent of appealed prior authorization denials",
    source:
      "KFF via HFMA summary of CMS Medicare Advantage prior authorization appeals (2023)",
    sourceUrl:
      "https://www.hfma.org/fast-finance/aca-marketplace-plans-payment-denial/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** Massachusetts Health Policy Commission — fully insured commercial claim denials. */
export const MA_HPC_ADMIN_DENIALS = {
  overallDenialRate2024: {
    value: 20.4,
    unit: "percent of all claims",
    source:
      "Massachusetts HPC Datapoints Issue 33 (2024 fully-insured commercial claims)",
    sourceUrl:
      "https://masshpc.gov/publications/datapoints-series/issue-33-evidence-administrative-complexity-health-insurance-claim",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  adminDenialShareOfClaims2024: {
    value: 16.6,
    unit: "percent of all claims",
    source:
      "Massachusetts HPC Datapoints Issue 33 — administrative denial categories F–I",
    sourceUrl:
      "https://masshpc.gov/publications/datapoints-series/issue-33-evidence-administrative-complexity-health-insurance-claim",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  adminDenialShareOfDeniedClaimsProfMedSurg2024: {
    value: 80,
    unit: "percent of denied professional medical/surgical claims",
    source:
      "Massachusetts HPC Datapoints Issue 33 — administrative denial share of denied claims",
    sourceUrl:
      "https://masshpc.gov/publications/datapoints-series/issue-33-evidence-administrative-complexity-health-insurance-claim",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** HHS OIG / CMS Medicaid managed care prior authorization. */
export const MEDICAID_PRIOR_AUTH = {
  mcoPriorAuthDenialRate2019: {
    value: 12.5,
    unit: "percent of prior authorization requests",
    source:
      "HHS OIG, Medicaid MCO prior authorization denials (2019), via KFF/HFMA summaries",
    sourceUrl:
      "https://www.kff.org/patient-consumer-protections/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  appealedDenialOverturnRate2019: {
    value: 46,
    unit: "percent of externally reviewed appealed denials",
    source: "HHS OIG Medicaid MCO prior authorization appeals (2019), via HFMA",
    sourceUrl:
      "https://www.hfma.org/fast-finance/aca-marketplace-plans-payment-denial/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** AMA physician survey figures used in payer ops pain-point cards. */
export const AMA_PRIOR_AUTH = {
  requestsNeedingExtraDocumentation: {
    value: 40,
    unit: "percent of pended requests",
    source:
      "AMA 2023 Prior Authorization Survey (~40% require additional documentation)",
    sourceUrl:
      "https://www.ama-assn.org/practice-management/prior-authorization",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes:
      "Rounded from AMA survey reporting ~40% of pended requests need more documentation.",
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** Johns Hopkins — systematic review + news release (clinical harm, not unit costs). */
export const JOHNS_HOPKINS_PRIOR_AUTH = {
  studiesInSystematicReview: {
    value: 25,
    unit: "studies",
    source:
      "Johns Hopkins systematic review of prior authorization adverse effects",
    sourceUrl:
      "https://pure.johnshopkins.edu/en/publications/adverse-effects-of-health-plan-prior-authorization-on-clinical-ef/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
  physicianHoursPerWeekOnPriorAuth: {
    value: 13,
    unit: "hours per physician per week",
    source:
      "AMA physician survey, cited in Johns Hopkins prior authorization systematic review (2025)",
    sourceUrl:
      "https://pure.johnshopkins.edu/en/publications/adverse-effects-of-health-plan-prior-authorization-on-clinical-ef/",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes:
      "Hopkins Medicine news release (2025) summarizes AMA survey burden; primary publication is the Pure record.",
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** NIHCR / Altarum literature review on prior authorization costs (gray literature). */
export const NIHCR_PRIOR_AUTH = {
  physicianPracticeCostLowEstimate: {
    value: 2200,
    unit: "USD per physician per year (2010 dollars)",
    source:
      "NIHCR Foundation / Altarum, Impacts of Prior Authorization on Health Care Costs and Quality (2019)",
    sourceUrl:
      "https://www.nihcr.org/wp-content/uploads/Altarum-Prior-Authorization-Review-November-2019.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
    notes:
      "Lower-bound staff-time estimate focused on PA interactions with insurers.",
  },
  physicianPracticeCostHighEstimate: {
    value: 3400,
    unit: "USD per physician per year (2010 dollars)",
    source: "NIHCR Foundation / Altarum, Impacts of Prior Authorization (2019)",
    sourceUrl:
      "https://www.nihcr.org/wp-content/uploads/Altarum-Prior-Authorization-Review-November-2019.pdf",
    retrievedAt: PAYER_OPS_BENCHMARK_RETRIEVED_AT,
  },
} as const satisfies Record<string, PublicBenchmark<number>>;

/** Segment default bindings — which public benchmark grounds each simulator input. */
export const SEGMENT_BENCHMARK_BINDINGS = {
  commercial: {
    denialRate: KFF_CLAIM_DENIALS.marketplaceInNetworkDenialRate2023,
    avoidableRate:
      MA_HPC_ADMIN_DENIALS.adminDenialShareOfDeniedClaimsProfMedSurg2024,
    adminCost: CAQH_2023_PRIOR_AUTH.payerCostManual,
  },
  medicaid: {
    denialRate: MEDICAID_PRIOR_AUTH.mcoPriorAuthDenialRate2019,
    avoidableRate: MEDICAID_PRIOR_AUTH.appealedDenialOverturnRate2019,
    adminCost: CAQH_2023_PRIOR_AUTH.payerCostManual,
  },
  medicare: {
    denialRate: KFF_CLAIM_DENIALS.medicareAdvantagePriorAuthDenialRate2024,
    avoidableRate: KFF_CLAIM_DENIALS.medicareAdvantageAppealOverturnRate2023,
    adminCost: CAQH_2023_PRIOR_AUTH.payerCostManual,
  },
} as const;

/** Flat export for scripts and footnotes. */
export const PAYER_OPS_PUBLIC_BENCHMARKS = {
  caqh2023PriorAuth: CAQH_2023_PRIOR_AUTH,
  kffClaimDenials: KFF_CLAIM_DENIALS,
  maHpcAdminDenials: MA_HPC_ADMIN_DENIALS,
  medicaidPriorAuth: MEDICAID_PRIOR_AUTH,
  amaPriorAuth: AMA_PRIOR_AUTH,
  johnsHopkinsPriorAuth: JOHNS_HOPKINS_PRIOR_AUTH,
  nihcrPriorAuth: NIHCR_PRIOR_AUTH,
  segmentBindings: SEGMENT_BENCHMARK_BINDINGS,
} as const;

/** Numeric segment defaults derived from {@link SEGMENT_BENCHMARK_BINDINGS}. */
export function benchmarkSegmentDefaults(): Record<
  "commercial" | "medicaid" | "medicare",
  { denialRate: number; avoidableRate: number; adminCost: number }
> {
  return {
    commercial: {
      denialRate: SEGMENT_BENCHMARK_BINDINGS.commercial.denialRate.value,
      avoidableRate: SEGMENT_BENCHMARK_BINDINGS.commercial.avoidableRate.value,
      adminCost: SEGMENT_BENCHMARK_BINDINGS.commercial.adminCost.value,
    },
    medicaid: {
      denialRate: SEGMENT_BENCHMARK_BINDINGS.medicaid.denialRate.value,
      avoidableRate: SEGMENT_BENCHMARK_BINDINGS.medicaid.avoidableRate.value,
      adminCost: SEGMENT_BENCHMARK_BINDINGS.medicaid.adminCost.value,
    },
    medicare: {
      denialRate: SEGMENT_BENCHMARK_BINDINGS.medicare.denialRate.value,
      avoidableRate: SEGMENT_BENCHMARK_BINDINGS.medicare.avoidableRate.value,
      adminCost: SEGMENT_BENCHMARK_BINDINGS.medicare.adminCost.value,
    },
  };
}
