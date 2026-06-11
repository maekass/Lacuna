"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { adaptQuantCompanies } from "@/lib/quant/adaptQuantCompany";
import {
  AcquisitionPredictor,
  ValuationEngine,
} from "@/lib/quant/quantEngine";

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
  acquisitionProbability: number;
  topDriver: string;
}

function formatM(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${Math.round(value)}M`;
}

export default function QuantValuationPanel() {
  const { verifiedCompanies } = useVerifiedDataset();
  const [showAll, setShowAll] = useState(false);

  const { rows, anchoredCount } = useMemo(() => {
    const engine = new ValuationEngine();
    const predictor = new AcquisitionPredictor();
    const adapted = adaptQuantCompanies(verifiedCompanies);

    const built: Row[] = adapted.map(
      ({ company, disclosedValuation, hasValuationInput }) => {
        const valuation = engine.valuateCompany(company);
        const prediction = predictor.predictAcquisition(company);
        const topDriver = (Object.entries(prediction.driverScores) as [
          DriverKey,
          number,
        ][]).sort((a, b) => b[1] - a[1])[0][0];

        return {
          id: company.id,
          name: company.name,
          sector: company.sector,
          clinicalStageProxy: company.clinicalStage,
          disclosedValuation,
          modelEstimate: hasValuationInput ? valuation.consensusEstimate : null,
          acquisitionProbability: prediction.probabilityOfAcquisition,
          topDriver: DRIVER_LABELS[topDriver],
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
      anchoredCount: built.filter((r) => r.modelEstimate !== null).length,
    };
  }, [verifiedCompanies]);

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
          {anchoredCount}/{rows.length} companies have a funding anchor
        </span>
      </div>

      <div
        className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed"
        role="note"
      >
        The verified dataset has no revenue, TAM, clinical-efficacy, or team
        data. Valuations run on disclosed funding and a stage proxy only, so
        most companies show <em>insufficient inputs</em>. The engine&apos;s
        health-impact and portfolio modeling are illustrative and live in the
        library, not shown here, because the live data lacks clinical inputs.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-xs text-lacuna-blue/70 border-b border-lacuna-lavender/40">
              <th className="py-2 pr-3 font-medium">Company</th>
              <th className="py-2 px-3 font-medium">Sector</th>
              <th className="py-2 px-3 font-medium">Stage (proxy)</th>
              <th className="py-2 px-3 font-medium text-right">Disclosed</th>
              <th className="py-2 px-3 font-medium text-right">Model est.</th>
              <th className="py-2 px-3 font-medium text-right">P(exit&nbsp;5y)</th>
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
                    ? formatM(row.modelEstimate)
                    : (
                      <span
                        className="text-xs font-normal text-lacuna-blue/40"
                        title="No disclosed funding to anchor a valuation"
                      >
                        insufficient inputs
                      </span>
                    )}
                </td>
                <td className="py-2 px-3 text-right text-lacuna-plum">
                  {(row.acquisitionProbability * 100).toFixed(0)}%
                </td>
                <td className="py-2 pl-3 text-lacuna-blue/80">{row.topDriver}</td>
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
        and R&amp;D-cost methods — on live data, only the R&amp;D-cost method
        has a verified input. Exit-likelihood weights are heuristic, the base
        rate is un-calibrated, and disclosed valuations are point-in-time public
        figures. Exploratory framing only.
      </p>
    </div>
  );
}
