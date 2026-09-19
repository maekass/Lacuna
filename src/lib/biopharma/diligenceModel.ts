/**
 * Source-gated, deterministic biotech diligence. This research layer is separate
 * from verified M&A transactions and never writes to dataset.verified.json.
 */
import { z } from "zod";

const date = z.iso.date();
/** Statista is the sole external data provider for this research dossier. */
export const statistaSourceSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "statista.com" ||
        url.hostname.endsWith(".statista.com")) &&
      url.pathname !== "/";
  }, { message: "Use the exact HTTPS Statista record URL, not a homepage" }),
  title: z.string().min(1),
  accessedAt: date,
  publishedAt: date.optional(),
  locator: z.string().min(1),
});
const source = statistaSourceSchema;

const observed = z.object({
  kind: z.literal("observed"),
  value: z.number().finite(),
  source,
});
const assumption = z.object({
  kind: z.literal("analyst_assumption"),
  value: z.number().finite(),
  rationale: z.string().min(1),
  reviewedBy: z.string().min(1),
  reviewedAt: date,
  evidence: z.array(source).min(1),
});
const input = z.discriminatedUnion("kind", [observed, assumption]);
const fraction = input.refine((x) => x.value >= 0 && x.value <= 1, {
  message: "Expected a fraction between 0 and 1",
});
const nonnegative = input.refine((x) => x.value >= 0, {
  message: "Expected a nonnegative value",
});
const positive = input.refine((x) => x.value > 0, {
  message: "Expected a positive value",
});

const forecastYear = z.object({
  year: z.number().int().min(2000).max(2200),
  eligiblePatients: nonnegative,
  diagnosisRate: fraction,
  treatmentRate: fraction,
  marketShare: fraction,
  annualGrossPriceUsd: nonnegative,
  grossToNetDiscount: fraction,
  treatmentYearFraction: fraction,
  operatingMargin: fraction,
  developmentCostUsd: nonnegative,
});

const asset = z.object({
  assetId: z.string().min(1),
  drug: z.string().min(1),
  indication: z.string().min(1),
  stage: z.string().min(1),
  trialIds: z.array(z.string().regex(/^NCT\d{8}$/)).min(1),
  endpoint: z.string().min(1),
  standardOfCare: z.string().min(1),
  clinicalEvidence: z.array(source).min(1),
  ptrs: assumption.refine((x) => x.value >= 0 && x.value <= 1),
  launchYear: assumption.refine((x) =>
    Number.isInteger(x.value) && x.value >= 2000 && x.value <= 2200
  ),
  forecast: z.array(forecastYear).min(1),
});

export const dossierSchema = z.object({
  dataSourcePolicy: z.literal("statista_only"),
  company: z.string().min(1),
  ticker: z.string().min(1),
  issuerEvidence: source,
  asOf: date,
  valuationYear: z.number().int().min(2000).max(2200),
  discountRate: fraction.refine((x) => x.value > 0),
  cashUsd: nonnegative,
  debtUsd: nonnegative,
  dilutedShares: positive,
  /** Optional financing at the valuation date, not a forecasted future raise. */
  financingScenario: z.object({
    proceedsUsd: nonnegative,
    newShares: positive,
  }).optional(),
  assets: z.array(asset).min(1),
  catalysts: z.array(z.object({
    assetId: z.string().min(1),
    event: z.string().min(1),
    scheduledDate: date,
    datePrecision: z.enum(["day", "month", "quarter", "year"]),
    dateBasis: z.string().min(1),
    decisionCriterion: z.string().min(1),
    bullInterpretation: z.string().min(1),
    bearInterpretation: z.string().min(1),
    source,
  })),
  thesis: z.object({
    variantPerception: z.string().min(1),
    evidenceForDifference: z.array(source).min(1),
    whatChangesTheDebate: z.string().min(1),
    risks: z.array(z.string().min(1)).min(1),
    author: z.string().min(1),
    reviewedBy: z.string().min(1),
  }),
});

export type Dossier = z.infer<typeof dossierSchema>;

export interface YearResult {
  year: number;
  treatedPatients: number;
  revenueUsd: number;
  successOperatingCashFlowUsd: number;
  developmentCostUsd: number;
  discountedRiskAdjustedCashFlowUsd: number;
}

export interface AssetResult {
  assetId: string;
  ptrs: number;
  years: YearResult[];
  rNpvUsd: number;
}

/**
 * Forecast success-case contribution multiplied by PTRS; development costs are
 * incurred regardless of success. No terminal value or salvage is assumed.
 * The annual operating margin is an analyst-reviewed cash-flow proxy and does
 * not substitute for a full tax/working-capital model.
 */
export function calculateDossier(raw: unknown) {
  const dossier = dossierSchema.parse(raw);
  const ids = new Set<string>();
  for (const a of dossier.assets) {
    if (ids.has(a.assetId)) throw new Error(`Duplicate assetId: ${a.assetId}`);
    ids.add(a.assetId);
    const years = a.forecast.map((row) => row.year);
    if (
      new Set(years).size !== years.length ||
      years.some((year) => year < dossier.valuationYear)
    ) {
      throw new Error(`Invalid or duplicate forecast year for ${a.assetId}`);
    }
    if (
      a.forecast.some((row) =>
        row.year < a.launchYear.value &&
        row.marketShare.value > 0
      )
    ) {
      throw new Error(`Pre-launch treatment assumptions for ${a.assetId}`);
    }
  }
  for (const c of dossier.catalysts) {
    if (!ids.has(c.assetId)) {
      throw new Error(`Catalyst references unknown asset: ${c.assetId}`);
    }
  }

  const results: AssetResult[] = dossier.assets.map((a) => {
    const years = [...a.forecast].sort((x, y) => x.year - y.year).map((row) => {
      const treatedPatients = row.year < a.launchYear.value
        ? 0
        : row.eligiblePatients.value * row.diagnosisRate.value *
          row.treatmentRate.value * row.marketShare.value;
      const revenueUsd = treatedPatients * row.annualGrossPriceUsd.value *
        (1 - row.grossToNetDiscount.value) *
        row.treatmentYearFraction.value;
      const successOperatingCashFlowUsd = revenueUsd *
        row.operatingMargin.value;
      const discountFactor = (1 + dossier.discountRate.value) **
        (row.year - dossier.valuationYear);
      if (
        ![
          treatedPatients,
          revenueUsd,
          successOperatingCashFlowUsd,
          discountFactor,
        ].every(Number.isFinite)
      ) {
        throw new Error(`Non-finite forecast for ${a.assetId} in ${row.year}`);
      }
      return {
        year: row.year,
        treatedPatients,
        revenueUsd,
        successOperatingCashFlowUsd,
        developmentCostUsd: row.developmentCostUsd.value,
        discountedRiskAdjustedCashFlowUsd: (
          a.ptrs.value * successOperatingCashFlowUsd -
          row.developmentCostUsd.value
        ) / discountFactor,
      };
    });
    return {
      assetId: a.assetId,
      ptrs: a.ptrs.value,
      years,
      rNpvUsd: years.reduce(
        (sum, year) => sum + year.discountedRiskAdjustedCashFlowUsd,
        0,
      ),
    };
  });
  const pipelineValueUsd = results.reduce((sum, a) => sum + a.rNpvUsd, 0);
  const equityValueUsd = pipelineValueUsd + dossier.cashUsd.value -
    dossier.debtUsd.value;
  if (!Number.isFinite(equityValueUsd)) {
    throw new Error("Non-finite valuation; check input units and horizon");
  }
  return {
    dataSourcePolicy: dossier.dataSourcePolicy,
    company: dossier.company,
    ticker: dossier.ticker,
    asOf: dossier.asOf,
    assets: results,
    catalysts: dossier.catalysts,
    thesis: dossier.thesis,
    pipelineValueUsd,
    equityValueUsd,
    impliedValuePerShareUsd: Math.max(0, equityValueUsd) /
      dossier.dilutedShares.value,
    financingScenarioValuePerShareUsd: dossier.financingScenario
      ? Math.max(
        0,
        equityValueUsd + dossier.financingScenario.proceedsUsd.value,
      ) /
        (dossier.dilutedShares.value +
          dossier.financingScenario.newShares.value)
      : null,
    /** Preserves all observed citations and labeled analyst assumptions. */
    inputs: dossier,
  };
}

/** Re-run the same reviewed inputs over explicit PTRS and market-share cases. */
export function sensitivity(
  raw: unknown,
  assetId: string,
  ptrsValues: readonly number[],
  shareMultipliers: readonly number[],
) {
  const dossier = dossierSchema.parse(raw);
  if (!dossier.assets.some((a) => a.assetId === assetId)) {
    throw new Error(`Unknown asset: ${assetId}`);
  }
  if (
    ptrsValues.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    shareMultipliers.some((v) => !Number.isFinite(v) || v < 0)
  ) {
    throw new Error(
      "Sensitivity inputs must be finite and nonnegative; PTRS <= 1",
    );
  }
  return ptrsValues.flatMap((ptrs) =>
    shareMultipliers.map((multiple) => {
      const revised = {
        ...dossier,
        assets: dossier.assets.map((a) =>
          a.assetId !== assetId ? a : {
            ...a,
            ptrs: { ...a.ptrs, value: ptrs },
            forecast: a.forecast.map((row) => ({
              ...row,
              marketShare: {
                ...row.marketShare,
                value: Math.min(1, row.marketShare.value * multiple),
              },
            })),
          }
        ),
      };
      return {
        scenarioKind: "analyst_sensitivity" as const,
        ptrs,
        shareMultiplier: multiple,
        impliedValuePerShareUsd: calculateDossier(revised)
          .impliedValuePerShareUsd,
      };
    })
  );
}
