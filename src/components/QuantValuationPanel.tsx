"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { adaptQuantCompanies } from "@/lib/quant/adaptQuantCompany";
import { deriveEmpiricalPriors } from "@/lib/quant/empiricalPriors";
import { AcquisitionPredictor, ValuationEngine } from "@/lib/quant/quantEngine";
import { gapScoreForSector } from "@/lib/valuation/burdenCapitalGap";

type DriverKey = keyof ReturnType<
  AcquisitionPredictor["predictAcquisition"]
>["driverScores"];

const DRIVER_LABELS: Record<DriverKey, string> = {
  clinicalValidation: "Clinical",
  marketTiming: "Timing",
  teamQuality: "Team",
  strategicFit: "Strategic fit",
  geographicArbitrage: "Geography",
};

interface Row {
  id: string;
  name: string;
  sector: string;
  clinicalStageProxy: string;
  disclosedValuation?: number;
  modelEstimate: number | null;
  /** True when the estimate includes the verified comparable-deals anchor. */
  hasComparableAnchor: boolean;
  acquisitionProbability: number;
  topDriver: string;
  /** Burden-capital gap score (0-100) for this company's sector, or null if unmapped. */
  gapScore: number | null;
}

function formatM(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${Math.round(value)}M`;
}

export default function QuantValuationPanel() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [showAll, setShowAll] = useState(false);

  const { rows, anchoredCount, priors } = useMemo(() => {
    // Data retrieval: derive empirical priors from the verified deal history
    // so valuations and exit base rates are anchored on real transactions.
    const empiricalPriors = deriveEmpiricalPriors(
      verifiedCompanies,
      verifiedAcquisitions,
    );
    const engine = new ValuationEngine(empiricalPriors);
    const predictor = new AcquisitionPredictor(empiricalPriors);
    const adapted = adaptQuantCompanies(verifiedCompanies);

    const built: Row[] = adapted.map(
      ({ company, disclosedValuation, hasValuationInput }) => {
        const valuation = engine.valuateCompany(company);
        const prediction = predictor.predictAcquisition(company);
        const topDriver = (Object.entries(prediction.driverScores) as [
          DriverKey,
          number,
        ][]).sort((a, b) => b[1] - a[1])[0][0];
        const hasComparableAnchor = valuation.valuations.some(
          (v) => v.methodName === "Comparable Deals" && v.confidence > 0,
        );
        // A company is valuable-to-model if any method produced an estimate —
        // including the comparable-deals anchor (no funding required for the
        // sector-median fallback).
        const modelEstimate =
          hasValuationInput || valuation.consensusEstimate > 0
            ? valuation.consensusEstimate
            : null;

        return {
          id: company.id,
          name: company.name,
          sector: company.sector,
          clinicalStageProxy: company.clinicalStage,
          disclosedValuation,
          modelEstimate: modelEstimate && modelEstimate > 0
            ? modelEstimate
            : null,
          hasComparableAnchor,
          acquisitionProbability: prediction.probabilityOfAcquisition,
          topDriver: DRIVER_LABELS[topDriver],
          gapScore: gapScoreForSector(company.sector),
        };
      },
    );

    built.sort((a, b) => {
      if ((a.modelEstimate === null) !== (b.modelEstimate === null)) {
        return a.modelEstimate === null ? 1 : -1;
      }
      return (b.modelEstimate ?? 0) - (a.modelEstimate ?? 0);
    });

    return {
      rows: built,
      anchoredCount: built.filter((r) => r.hasComparableAnchor).length,
      priors: empiricalPriors,
    };
  }, [verifiedCompanies, verifiedAcquisitions]);

  const visibleRows = showAll ? rows : rows.slice(0, 12);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6">
      <CuratedDatasetBanner className="mb-4" />

      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Quant valuation &amp; exit-likelihood (heuristic)
          </h3>
          <p className="text-sm text-lacuna-blue">
            Rule-based valuation and a weighted exit-likelihood score — not a
            trained model and not investment advice.
          </p>
        </div>
        <span className="text-xs text-lacuna-blue/80 px-2 py-1 bg-lacuna-pink/10 rounded shrink-0">
          {anchoredCount}/{rows.length} anchored on verified comparable deals
        </span>
      </div>

      <div
        className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-800 leading-relaxed"
        role="note"
      >
        <strong>Empirically anchored:</strong>{" "}
        valuations now include a comparable-deals method derived from{" "}
        {priors.dealCount} verified acquisitions ({priors.disclosedDealCount}
        {" "}
        with disclosed values, {priors.medianFundingMultipleAll !== undefined
          ? `median exit/funding multiple ${
            priors.medianFundingMultipleAll.toFixed(1)
          }x`
          : "no funding multiples available"}). The exit base rate is the
        dataset&apos;s observed{" "}
        {(priors.overallExitRate * 100).toFixed(0)}% exit share — small-n and
        disclosure-biased, so treat as exploratory framing, not advice.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead>
            <tr className="text-left text-xs text-lacuna-blue/70 border-b border-lacuna-lavender/40">
              <th className="py-2 pr-3 font-medium">Company</th>
              <th className="py-2 px-3 font-medium">Sector</th>
              <th className="py-2 px-3 font-medium">Stage (proxy)</th>
              <th className="py-2 px-3 font-medium text-right">Disclosed</th>
              <th className="py-2 px-3 font-medium text-right">Model est.</th>
              <th className="py-2 px-3 font-medium text-right">
                P(exit&nbsp;5y)
              </th>
              <th className="py-2 px-3 font-medium text-right">Gap</th>
              <th className="py-2 pl-3 font-medium">Top driver</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-lacuna-lavender/20 hover:bg-lacuna-pink/5"
              >
                <td className="py-2 pr-3 font-medium text-lacuna-plum">
                  {row.name}
                </td>
                <td className="py-2 px-3 text-lacuna-blue">{row.sector}</td>
                <td className="py-2 px-3 text-lacuna-blue/80">
                  {row.clinicalStageProxy}
                </td>
                <td className="py-2 px-3 text-right text-lacuna-blue">
                  {typeof row.disclosedValuation === "number"
                    ? formatM(row.disclosedValuation)
                    : <span className="text-lacuna-blue/40">—</span>}
                </td>
                <td className="py-2 px-3 text-right font-semibold text-lacuna-plum">
                  {row.modelEstimate !== null
                    ? (
                      <span
                        title={row.hasComparableAnchor
                          ? "Includes verified comparable-deals anchor"
                          : "Heuristic methods only — no sector comparables"}
                      >
                        {formatM(row.modelEstimate)}
                        {row.hasComparableAnchor && (
                          <span
                            className="ml-1 text-emerald-600"
                            aria-label="anchored on verified deals"
                          >
                            ●
                          </span>
                        )}
                      </span>
                    )
                    : (
                      <span
                        className="text-xs font-normal text-lacuna-blue/40"
                        title="No verified inputs to anchor a valuation"
                      >
                        insufficient inputs
                      </span>
                    )}
                </td>
                <td className="py-2 px-3 text-right text-lacuna-plum">
                  {(row.acquisitionProbability * 100).toFixed(0)}%
                </td>
                <td className="py-2 px-3 text-right">
                  {row.gapScore !== null
                    ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          row.gapScore >= 65
                            ? "bg-emerald-100 text-emerald-700"
                            : row.gapScore >= 35
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                        title="Burden-capital gap score — how underfunded this sector is vs. disease burden"
                      >
                        {row.gapScore.toFixed(0)}
                      </span>
                    )
                    : <span className="text-lacuna-blue/30">—</span>}
                </td>
                <td className="py-2 pl-3 text-lacuna-blue/80">
                  {row.topDriver}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 12 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-sm font-medium text-lacuna-plum hover:text-lacuna-blue transition-colors"
        >
          {showAll ? "Show fewer" : `Show all ${rows.length} companies`}
        </button>
      )}

      <p className="mt-4 text-xs text-lacuna-blue/60 leading-relaxed">
        Model estimate is a confidence-weighted blend of revenue, EBITDA, TAM,
        R&amp;D-cost, and comparable-deals methods. The{" "}
        <span className="text-emerald-600">●</span>{" "}
        marker means the estimate includes an anchor from verified sector deals
        (median exit/funding multiples or median disclosed deal values).
        Exit-likelihood base rate is the dataset&apos;s observed exit share.
        Driver weights remain heuristic; disclosed valuations are point-in-time
        public figures.{" "}
        <span className="text-emerald-700 font-medium">Gap</span>{" "}
        = burden-capital gap score (0-100) — how underfunded the sector is
        relative to disease burden (DALYs × prevalence × mortality vs. VC
        deployed 2019-2024). Exploratory framing only.
      </p>
    </div>
  );
}
