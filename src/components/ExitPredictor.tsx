"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { foregroundPortfolio } from "@/data/verifiedData";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { getVerifiedCompaniesForAnalysis } from "@/lib/data/verifiedDatasetAdapters";
import type {
  VerifiedAcquisitionView,
  VerifiedCompanyView,
  VerifiedDerivedData,
} from "@/lib/data/verifiedDataHelpers";
import type { Company, ExitPrediction } from "@/lib/types";

interface PredictionFactor {
  label: string;
  present: boolean;
  weight: number;
}

interface PredictionRow extends ExitPrediction {
  sector: Company["sector"];
  stage: Company["stage"];
  isAcquired: boolean;
  indicatorScore: number;
  factorDetails: PredictionFactor[];
  similarPriorExits: number;
}

interface PitchBriefProps {
  readonly company: VerifiedCompanyView;
  readonly prediction: PredictionRow;
  readonly comparableExits: readonly VerifiedAcquisitionView[];
  readonly marketPosition: "Emerging" | "Growth" | "Late-stage";
  readonly foregroundFitLabel: string;
  readonly foregroundFitTone: "portfolio" | "sector" | "none";
  readonly onClose: () => void;
}

type PredictorMode = "single" | "leaderboard";

const CURRENT_YEAR = 2026;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getMedian(values: number[], fallback: number) {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function formatDealValue(value?: number) {
  if (typeof value !== "number") return "Undisclosed";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  if (value >= 100) return `$${value.toFixed(0)}M`;
  return `$${value.toFixed(1)}M`;
}

function formatDealDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function getConfidenceLabel(confidence: number) {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.55) return "Medium";
  return "Low";
}

function getMarketPosition(stage: Company["stage"]): "Emerging" | "Growth" | "Late-stage" {
  if (stage === "Seed" || stage === "Series A") return "Emerging";
  if (stage === "Series B" || stage === "Series C") return "Growth";
  return "Late-stage";
}

function PitchBrief(
  {
    company,
    prediction,
    comparableExits,
    marketPosition,
    foregroundFitLabel,
    foregroundFitTone,
    onClose,
  }: PitchBriefProps,
) {
  const foregroundFitClasses = foregroundFitTone === "portfolio"
    ? "bg-lacuna-pink/10 text-lacuna-plum border-lacuna-lavender/40"
    : foregroundFitTone === "sector"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 print:block print:bg-transparent print:p-0">
      <button
        type="button"
        aria-label="Close pitch brief"
        onClick={onClose}
        className="absolute inset-0 cursor-default print:hidden"
      />
      <div className="print:shadow-none relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl print:max-w-none print:rounded-none">
        <div className="print:shadow-none p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lacuna-blue/70">
                Pitch Brief
              </p>
              <h4 className="mt-1 text-2xl font-semibold text-lacuna-plum">
                {company.name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-lacuna-lavender/40 px-3 py-2 text-sm font-medium text-lacuna-plum transition-colors hover:bg-lacuna-pink/10"
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-3 py-1 text-lg leading-none text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mb-6 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-2xl font-semibold text-lacuna-plum print:block sm:hidden">
                {company.name}
              </h4>
              <span className="rounded-full bg-lacuna-pink/10 px-3 py-1 text-xs font-medium text-lacuna-plum">
                {company.sector}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {prediction.stage}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {company.hq}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {company.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h5 className="text-sm font-semibold text-slate-800">Exit Outlook</h5>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Exit probability:</span>{" "}
                  {(prediction.exitProbability * 100).toFixed(1)}%
                </p>
                <p>
                  <span className="font-medium text-slate-800">Predicted acquirer:</span>{" "}
                  {prediction.predictedAcquirer}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Confidence level:</span>{" "}
                  {getConfidenceLabel(prediction.confidence)} ({(prediction.confidence * 100).toFixed(0)}%)
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h5 className="text-sm font-semibold text-slate-800">Market Position</h5>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Cluster:</span>{" "}
                  {marketPosition}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Stage basis:</span>{" "}
                  {prediction.stage}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-slate-800">Foreground Fit</h5>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${foregroundFitClasses}`}>
                {foregroundFitLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h5 className="text-sm font-semibold text-slate-800">Comparable Exits</h5>
              <span className="text-xs text-slate-500">Same sector, verified dataset</span>
            </div>
            <div className="space-y-3">
              {comparableExits.length > 0
                ? comparableExits.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{deal.targetName}</p>
                        <p className="text-sm text-slate-600">{deal.acquirerName}</p>
                      </div>
                      <div className="text-sm text-slate-600 sm:text-right">
                        <p className="font-medium text-slate-800">{formatDealValue(deal.dealValue)}</p>
                        <p>{formatDealDate(deal.closedDate ?? deal.announcedDate)}</p>
                      </div>
                    </div>
                  </div>
                ))
                : (
                  <p className="text-sm text-slate-500">
                    No same-sector verified exits are available in the current dataset.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickLikelyAcquirer(
  sectorAcquirerCounts: Map<string, number> | undefined,
  overallAcquirerCounts: Map<string, number>,
) {
  const source = sectorAcquirerCounts && sectorAcquirerCounts.size > 0
    ? sectorAcquirerCounts
    : overallAcquirerCounts;

  const topAcquirer = [...source.entries()].sort((a, b) => {
    if (b[1] === a[1]) return a[0].localeCompare(b[0]);
    return b[1] - a[1];
  })[0];

  return topAcquirer?.[0] ?? "No clear analog";
}

function buildPredictions(data: VerifiedDerivedData): PredictionRow[] {
  const analysisCompanies = getVerifiedCompaniesForAnalysis(data);
  const acquiredIds = new Set(data.verifiedAcquisitions.map((a) => a.targetId));
  const acquisitionByTargetId = new Map(
    data.verifiedAcquisitions.map((deal) => [deal.targetId, deal]),
  );
  const acquiredCompanies = analysisCompanies.filter((company) =>
    acquiredIds.has(company.id)
  );
  const acquiredSectors = new Set(acquiredCompanies.map((c) => c.sector));
  const acquiredAgeMedian = getMedian(
    acquiredCompanies.map((c) => CURRENT_YEAR - c.founded),
    7,
  );
  const acquiredValuationMedian = getMedian(
    acquiredCompanies.map((c) => c.valuation).filter((v): v is number => typeof v === "number"),
    300,
  );

  const acquirerNameById = new Map<string, string>([
    ...data.verifiedAcquirers.map((a): [string, string] => [a.id, a.name]),
    ...data.verifiedCompanies.map((c): [string, string] => [c.id, c.name]),
  ]);
  const companyById = new Map(analysisCompanies.map((company) => [company.id, company]));
  const sectorAcquirerCounts = new Map<string, Map<string, number>>();
  const overallAcquirerCounts = new Map<string, number>();

  for (const deal of data.verifiedAcquisitions) {
    const targetCompany = companyById.get(deal.targetId);
    if (!targetCompany) continue;

    const acquirerName = acquirerNameById.get(deal.acquirerId) ?? deal.acquirerName;
    const sectorCounts = sectorAcquirerCounts.get(targetCompany.sector) ?? new Map<string, number>();
    sectorCounts.set(acquirerName, (sectorCounts.get(acquirerName) ?? 0) + 1);
    sectorAcquirerCounts.set(targetCompany.sector, sectorCounts);
    overallAcquirerCounts.set(
      acquirerName,
      (overallAcquirerCounts.get(acquirerName) ?? 0) + 1,
    );
  }

  return analysisCompanies
    .map((company) => {
      const age = CURRENT_YEAR - company.founded;
      const isLateStage = ["Series C", "Series D", "Series F", "Late Stage", "Pre-IPO"].includes(company.stage);
      const inPriorExitSector = acquiredSectors.has(company.sector);
      const aboveValuationMedian = (company.valuation ?? 0) >= acquiredValuationMedian;
      const ageNearPriorMedian = Math.abs(age - acquiredAgeMedian) <= 3;
      const isPublic = company.stage === "Public";
      const similarPriorExits = acquiredCompanies.filter((c) => c.sector === company.sector).length;

      const factorDetails: PredictionFactor[] = [
        {
          label: `Sector has prior verified exits (${similarPriorExits})`,
          present: inPriorExitSector,
          weight: 0.25,
        },
        {
          label: "Late stage funding (Series C+)",
          present: isLateStage,
          weight: 0.25,
        },
        {
          label: "Valuation ≥ median prior-exit valuation",
          present: aboveValuationMedian,
          weight: 0.2,
        },
        {
          label: "Age within 3 yrs of median prior-exit age",
          present: ageNearPriorMedian,
          weight: 0.15,
        },
        {
          label: "Already public (acquisition less typical path)",
          present: isPublic,
          weight: -0.15,
        },
      ];

      const indicatorScore = clamp(
        factorDetails.reduce((sum, factor) => sum + (factor.present ? factor.weight : 0), 0),
        0,
        1,
      );
      const acquisition = acquisitionByTargetId.get(company.id);
      const predictedAcquirer = acquisition
        ? (acquirerNameById.get(acquisition.acquirerId) ?? acquisition.acquirerName)
        : pickLikelyAcquirer(
          sectorAcquirerCounts.get(company.sector),
          overallAcquirerCounts,
        );
      const confidence = clamp(
        0.35 +
          factorDetails.filter((factor) => factor.present && factor.weight > 0).length * 0.1 +
          Math.min(similarPriorExits * 0.05, 0.2) +
          (acquisition ? 0.1 : 0),
        0.35,
        0.95,
      );

      return {
        companyId: company.id,
        companyName: company.name,
        sector: company.sector,
        stage: company.stage,
        exitProbability: indicatorScore,
        predictedAcquirer,
        confidence,
        factors: factorDetails.filter((factor) => factor.present).map((factor) => factor.label),
        calculatedAt: new Date(),
        isAcquired: acquiredIds.has(company.id),
        indicatorScore,
        factorDetails,
        similarPriorExits,
      };
    })
    .sort((a, b) => b.exitProbability - a.exitProbability);
}

function toCsvValue(value: string | number) {
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

/**
 * Derive a deterministic, transparent acquisition likelihood indicator from the
 * verified dataset. This panel is descriptive, not predictive.
 */
export default function ExitPredictor() {
  const dataset = useVerifiedDataset();
  const { verifiedCompanies, verifiedAcquisitions } = dataset;
  const [mode, setMode] = useState<PredictorMode>("single");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isPitchBriefOpen, setIsPitchBriefOpen] = useState(false);
  const predictions = useMemo(
    () => buildPredictions(dataset),
    [dataset],
  );
  const selectablePredictions = useMemo(
    () => predictions.filter((prediction) => !prediction.isAcquired),
    [predictions],
  );
  const companyById = useMemo(
    () => new Map(verifiedCompanies.map((company) => [company.id, company])),
    [verifiedCompanies],
  );
  const foregroundNameSet = useMemo(
    () => new Set<string>(foregroundPortfolio),
    [],
  );
  const foregroundSectorSet = useMemo(
    () => new Set(
      verifiedCompanies
        .filter((company) => foregroundNameSet.has(company.name))
        .map((company) => company.sector),
    ),
    [foregroundNameSet, verifiedCompanies],
  );

  useEffect(() => {
    if (
      selectablePredictions.length > 0 &&
      !selectablePredictions.some((prediction) => prediction.companyId === selectedCompanyId)
    ) {
      setSelectedCompanyId(selectablePredictions[0].companyId);
    }
  }, [selectablePredictions, selectedCompanyId]);

  useEffect(() => {
    setIsPitchBriefOpen(false);
  }, [selectedCompanyId]);

  const selectedPrediction = useMemo(
    () =>
      selectablePredictions.find((prediction) => prediction.companyId === selectedCompanyId) ??
      selectablePredictions[0],
    [selectablePredictions, selectedCompanyId],
  );
  const selectedCompany = selectedPrediction
    ? companyById.get(selectedPrediction.companyId)
    : undefined;
  const comparableExits = useMemo(() => {
    if (!selectedCompany) return [] as VerifiedAcquisitionView[];

    return verifiedAcquisitions
      .filter((deal) => companyById.get(deal.targetId)?.sector === selectedCompany.sector)
      .sort((a, b) => {
        const aTime = new Date(a.closedDate ?? a.announcedDate).getTime();
        const bTime = new Date(b.closedDate ?? b.announcedDate).getTime();
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [companyById, selectedCompany, verifiedAcquisitions]);
  const foregroundFit = useMemo(() => {
    if (!selectedCompany) {
      return {
        label: "No current Foreground signal",
        tone: "none" as const,
      };
    }

    if (foregroundNameSet.has(selectedCompany.name)) {
      return {
        label: "In Foreground Portfolio",
        tone: "portfolio" as const,
      };
    }

    if (foregroundSectorSet.has(selectedCompany.sector)) {
      return {
        label: "Sector Fit ✓",
        tone: "sector" as const,
      };
    }

    return {
      label: "No current Foreground signal",
      tone: "none" as const,
    };
  }, [foregroundNameSet, foregroundSectorSet, selectedCompany]);

  const getScoreColor = (score: number) => {
    if (score > 0.6) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score > 0.35) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const downloadLeaderboardCsv = () => {
    const header = [
      "Rank",
      "Company",
      "Sector",
      "Stage",
      "Exit Probability",
      "Predicted Acquirer",
      "Confidence",
      "Acquired",
    ];
    const rows = predictions.map((prediction, index) => [
      index + 1,
      prediction.companyName,
      prediction.sector,
      prediction.stage,
      (prediction.exitProbability * 100).toFixed(1),
      prediction.predictedAcquirer,
      (prediction.confidence * 100).toFixed(1),
      prediction.isAcquired ? "Yes" : "No",
    ]);
    const csvString = [header, ...rows]
      .map((row) => row.map((value) => toCsvValue(value)).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csvString], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "lacuna-exit-probability-leaderboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Acquisition Likelihood Indicators
          </h3>
          <p className="text-sm text-slate-500">
            {mode === "single"
              ? "Descriptive factor scoring from verified dataset (not a predictive model)"
              : "Ranked descriptive baseline across all verified companies, including historical acquisitions"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-lacuna-pink/10 p-1">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === "single" ? "bg-white text-lacuna-plum shadow-sm" : "text-lacuna-blue"}`}
            >
              Single Company
            </button>
            <button
              type="button"
              onClick={() => setMode("leaderboard")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === "leaderboard" ? "bg-white text-lacuna-plum shadow-sm" : "text-lacuna-blue"}`}
            >
              Leaderboard
            </button>
          </div>
          {mode === "leaderboard" && (
            <button
              type="button"
              onClick={downloadLeaderboardCsv}
              className="px-3 py-1.5 rounded-xl border border-lacuna-lavender/40 bg-white text-sm font-medium text-lacuna-plum hover:bg-lacuna-pink/10 transition-colors"
            >
              Export CSV
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
            <span className="text-xs font-medium text-slate-700">
              Descriptive · n={verifiedCompanies.length}
            </span>
          </div>
        </div>
      </div>

      {/* Honest disclaimer */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Methodological note:</strong>{" "}
          With n={verifiedAcquisitions.length}{" "}
          verified acquisitions in this dataset, no statistically valid
          predictive model is possible. {mode === "single"
            ? (
              <>
                This panel scores each non-acquired company on factors that <em>co-occurred</em>{" "}
                with prior exits — useful for descriptive comparison, not for forecasting.
              </>
            )
            : (
              <>
                The leaderboard applies the same deterministic factor scoring across all companies,
                including acquired companies as a historical baseline.
              </>
            )}{" "}
          Weights are fixed and disclosed; there is no fitted model and no randomness.
        </p>
      </div>

      {mode === "single" ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="exit-predictor-company"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Select company
            </label>
            <select
              id="exit-predictor-company"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-lacuna-lavender/60 focus:ring-2 focus:ring-lacuna-lavender/30"
            >
              {selectablePredictions.map((prediction) => (
                <option key={prediction.companyId} value={prediction.companyId}>
                  {prediction.companyName}
                </option>
              ))}
            </select>
          </div>

          {selectedPrediction && selectedCompany ? (
            <motion.div
              key={selectedPrediction.companyId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-lg border border-slate-100 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">
                    {selectedPrediction.companyName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedPrediction.sector} · {selectedPrediction.stage} · {selectedCompany.hq}
                  </p>
                </div>
                <div
                  className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${
                    getScoreColor(selectedPrediction.indicatorScore)
                  }`}
                >
                  {(selectedPrediction.exitProbability * 100).toFixed(0)} / 100
                </div>
              </div>

              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Predicted acquirer
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedPrediction.predictedAcquirer}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Confidence
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {getConfidenceLabel(selectedPrediction.confidence)} ({(selectedPrediction.confidence * 100).toFixed(0)}%)
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {selectedPrediction.factorDetails.map((f, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={f.present ? "text-slate-700" : "text-slate-400"}
                    >
                      {f.present ? "●" : "○"} {f.label}
                    </span>
                    <span
                      className={`font-mono ${
                        f.weight < 0 ? "text-rose-500" : "text-slate-400"
                      }`}
                    >
                      {f.weight > 0 ? "+" : ""}
                      {(f.weight * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsPitchBriefOpen(true)}
                className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 lacuna-gradient"
              >
                Generate Pitch Brief
              </button>
            </motion.div>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              No non-acquired companies are available for single-company analysis.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-lacuna-lavender/40 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-lacuna-pink/10 text-lacuna-plum">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Rank</th>
                <th className="px-4 py-3 text-left font-semibold">Company</th>
                <th className="px-4 py-3 text-left font-semibold">Sector</th>
                <th className="px-4 py-3 text-left font-semibold">Stage</th>
                <th className="px-4 py-3 text-left font-semibold">Exit Probability</th>
                <th className="px-4 py-3 text-left font-semibold">Predicted Acquirer</th>
                <th className="px-4 py-3 text-left font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((prediction, index) => (
                <tr
                  key={prediction.companyId}
                  className="border-t border-lacuna-lavender/20 hover:bg-lacuna-pink/10"
                >
                  <td className="px-4 py-3 font-semibold text-lacuna-plum">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lacuna-plum">
                        {prediction.companyName}
                      </span>
                      {prediction.isAcquired && (
                        <span className="rounded-full bg-lacuna-pink/10 px-2 py-0.5 text-xs font-medium text-lacuna-plum">
                          Acquired ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-lacuna-blue">
                    {prediction.sector}
                  </td>
                  <td className="px-4 py-3 text-lacuna-blue">
                    {prediction.stage}
                  </td>
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-lacuna-pink/10">
                        <div
                          className="h-full rounded-full bg-lacuna-plum"
                          style={{ width: `${(prediction.exitProbability * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-lacuna-plum">
                        {(prediction.exitProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-lacuna-blue">
                    {prediction.predictedAcquirer}
                  </td>
                  <td className="px-4 py-3 text-lacuna-blue">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPitchBriefOpen && selectedPrediction && selectedCompany && (
        <PitchBrief
          company={selectedCompany}
          prediction={selectedPrediction}
          comparableExits={comparableExits}
          marketPosition={getMarketPosition(selectedPrediction.stage)}
          foregroundFitLabel={foregroundFit.label}
          foregroundFitTone={foregroundFit.tone}
          onClose={() => setIsPitchBriefOpen(false)}
        />
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          Scores are deterministic and reproducible. Factor weights derived from
          observed co-occurrence in {verifiedAcquisitions.length}{" "}
          verified acquisitions.{" "}
          <strong>Not financial advice. Not a forecast.</strong>
        </p>
      </div>
    </motion.div>
  );
}
