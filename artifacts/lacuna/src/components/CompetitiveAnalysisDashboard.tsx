/**
 * Competitive Analysis Dashboard
 *
 * DESCRIPTIVE analysis of acquirer behavior
 * - What they've done, not what they intended
 * - Tab-based with 4 views: Portfolio, Velocity, Market Structure, Type Comparison
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  analyzeMarketStructure,
  analyzePortfolio,
  analyzeVelocity,
  compareAcquirerTypes,
  type ExternalEvent,
} from "@/lib/competitive/acquirerAnalysis";
import { getVerifiedCompetitiveAnalysisData } from "@/lib/data/verifiedDatasetAdapters";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

export default function CompetitiveAnalysisDashboard() {
  const dataset = useVerifiedDataset();
  const {
    acquirers: ACQUIRERS,
    companies: COMPANIES,
    acquisitions: ACQUISITIONS,
  } = useMemo(
    () => getVerifiedCompetitiveAnalysisData(dataset),
    [dataset],
  );
  const externalEvents = useMemo<ExternalEvent[]>(
    () =>
      dataset.verifiedAcquisitions.map((d) => ({
        year: new Date(d.announcedDate).getFullYear(),
        type: "strategy_announcement" as const,
        description: `${d.acquirerName} — ${d.targetName} (${d.dealType})`,
      })),
    [dataset.verifiedAcquisitions],
  );

  const [activeTab, setActiveTab] = useState<
    "portfolio" | "velocity" | "market_structure" | "type_comparison"
  >("portfolio");
  const [selectedAcquirer, setSelectedAcquirer] = useState<string>(
    ACQUIRERS[0]?.id ?? "",
  );

  const portfolioAnalyses = useMemo(
    () =>
      ACQUIRERS.map((a) => analyzePortfolio(a, ACQUISITIONS, COMPANIES))
        .filter((p) => p.totalAcquisitions > 0),
    [ACQUIRERS, ACQUISITIONS, COMPANIES],
  );

  const velocityAnalyses = useMemo(
    () =>
      ACQUIRERS.map((a) => analyzeVelocity(a, ACQUISITIONS, externalEvents))
        .filter((v) => v.yearlyData.length > 0),
    [ACQUIRERS, ACQUISITIONS, externalEvents],
  );

  const marketStructure = useMemo(
    () => analyzeMarketStructure(ACQUIRERS, ACQUISITIONS, COMPANIES),
    [ACQUIRERS, ACQUISITIONS, COMPANIES],
  );

  const typeComparison = useMemo(
    () => compareAcquirerTypes(ACQUIRERS, ACQUISITIONS, COMPANIES),
    [ACQUIRERS, ACQUISITIONS, COMPANIES],
  );

  const selectedPortfolio = portfolioAnalyses.find((p) =>
    p.acquirerId === selectedAcquirer
  );
  const selectedVelocity = velocityAnalyses.find((v) =>
    v.acquirerId === selectedAcquirer
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      {/* Critical Warning */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-2xl">⚠️</span>
          <div>
            <h2
              className="font-medium text-amber-900 text-lg"
            >
              Descriptive Analysis Only
            </h2>
            <p className="text-sm text-amber-700 mt-1">
              This framework maps what acquirers have{" "}
              <strong>actually done</strong>, not what they{" "}
              <strong>intended</strong>. No claims about strategic intent,
              synergy, or competitive dynamics — those are unobservable.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-lacuna-border pb-4">
        <h3
          className="text-2xl font-light tracking-tight"
          
        >
          Competitive Analysis Framework
        </h3>
        <p
          className="text-sm tracking-widest text-lacuna-text-muted mt-1"
          
        >
          Acquirer Portfolio | Deal Velocity | Market Structure | Type
          Comparison
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-lacuna-border">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "portfolio", label: "Portfolio Analysis" },
            { id: "velocity", label: "Deal Velocity" },
            { id: "market_structure", label: "Market Structure" },
            { id: "type_comparison", label: "Type Comparison" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#5D4E6D] text-[#5D4E6D] font-medium"
                  : "border-transparent text-lacuna-text-muted hover:text-lacuna-text-primary"
              }`}
              
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio Analysis Tab */}
      {activeTab === "portfolio" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Acquirer Selector */}
          <div className="flex flex-wrap gap-2">
            {portfolioAnalyses.map((p) => (
              <button
                key={p.acquirerId}
                onClick={() => setSelectedAcquirer(p.acquirerId)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedAcquirer === p.acquirerId
                    ? "bg-[#5D4E6D] text-white"
                    : "bg-lacuna-surface-subtle text-lacuna-text-primary hover:bg-lacuna-surface-subtle"
                }`}
              >
                {p.acquirerName} ({p.totalAcquisitions})
              </button>
            ))}
          </div>

          {selectedPortfolio && (
            <>
              {/* Overview */}
              <div className="bg-white border border-lacuna-border rounded-lg p-6">
                <h4
                  className="font-medium mb-3"
                >
                  {selectedPortfolio.acquirerName} Portfolio Overview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-lacuna-surface-muted p-3 rounded-lg text-center">
                    <div
                      className="text-2xl font-light"
                      style={{
                        color: "#5D4E6D",
                      }}
                    >
                      {selectedPortfolio.totalAcquisitions}
                    </div>
                    <div
                      className="text-xs text-lacuna-text-muted uppercase mt-1"
                    >
                      Acquisitions
                    </div>
                  </div>
                  <div className="bg-lacuna-surface-muted p-3 rounded-lg text-center">
                    <div
                      className="text-2xl font-light"
                      style={{
                        color: "#4A5D8A",
                      }}
                    >
                      ${selectedPortfolio.valueStats.median}M
                    </div>
                    <div
                      className="text-xs text-lacuna-text-muted uppercase mt-1"
                    >
                      Median Deal Value
                    </div>
                  </div>
                  <div className="bg-lacuna-surface-muted p-3 rounded-lg text-center">
                    <div
                      className="text-2xl font-light"
                      style={{
                        color: "#E8B4B8",
                      }}
                    >
                      {selectedPortfolio.ageAtAcquisitionStats.median}y
                    </div>
                    <div
                      className="text-xs text-lacuna-text-muted uppercase mt-1"
                    >
                      Median Target Age
                    </div>
                  </div>
                  <div className="bg-lacuna-surface-muted p-3 rounded-lg text-center">
                    <div
                      className="text-2xl font-light"
                      style={{
                        color: "#B8A9C9",
                      }}
                    >
                      {selectedPortfolio.sectorComposition.length}
                    </div>
                    <div
                      className="text-xs text-lacuna-text-muted uppercase mt-1"
                    >
                      Unique Sectors
                    </div>
                  </div>
                </div>

                {/* Sector Composition - Stacked Bar */}
                <div className="mb-4">
                  <h5
                    className="text-sm font-medium mb-2"
                  >
                    Sector Composition
                  </h5>
                  <div className="space-y-2">
                    {selectedPortfolio.sectorComposition.map((s) => (
                      <div key={s.sector} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate">{s.sector}</div>
                        <div className="flex-1 h-6 bg-lacuna-surface-subtle rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#E8B4B8] to-[#5D4E6D] flex items-center justify-end pr-2 text-xs text-white"
                            style={{
                              width: `${s.percentage}%`,
                              minWidth: "40px",
                            }}
                          >
                            {s.count} ({s.percentage.toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stage Composition */}
                <div className="mb-4">
                  <h5
                    className="text-sm font-medium mb-2"
                  >
                    Stage Composition
                  </h5>
                  <div className="space-y-2">
                    {selectedPortfolio.stageComposition.map((s) => (
                      <div key={s.stage} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate capitalize">
                          {s.stage.replace(/_/g, " ")}
                        </div>
                        <div className="flex-1 h-6 bg-lacuna-surface-subtle rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#4A5D8A] to-[#B8A9C9] flex items-center justify-end pr-2 text-xs text-white"
                            style={{
                              width: `${s.percentage}%`,
                              minWidth: "40px",
                            }}
                          >
                            {s.count} ({s.percentage.toFixed(0)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Descriptive Pattern */}
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                  <strong>Observed pattern (facts only):</strong>{" "}
                  {selectedPortfolio.descriptivePattern}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Deal Velocity Tab */}
      {activeTab === "velocity" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Acquirer Selector */}
          <div className="flex flex-wrap gap-2">
            {velocityAnalyses.map((v) => (
              <button
                key={v.acquirerId}
                onClick={() => setSelectedAcquirer(v.acquirerId)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedAcquirer === v.acquirerId
                    ? "bg-[#5D4E6D] text-white"
                    : "bg-lacuna-surface-subtle text-lacuna-text-primary hover:bg-lacuna-surface-subtle"
                }`}
              >
                {v.acquirerName}
              </button>
            ))}
          </div>

          {selectedVelocity && (
            <div className="bg-white border border-lacuna-border rounded-lg p-6">
              <h4
                className="font-medium mb-3"
              >
                {selectedVelocity.acquirerName} Deal Velocity
              </h4>

              {/* Period Comparison */}
              {selectedVelocity.periods.length === 2 && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedVelocity.periods.map((p) => (
                    <div
                      key={p.period}
                      className="bg-lacuna-surface-muted p-3 rounded-lg text-center"
                    >
                      <div
                        className="text-xs text-lacuna-text-muted uppercase"
                      >
                        {p.period} ({p.yearRange[0]}-{p.yearRange[1]})
                      </div>
                      <div
                        className="text-2xl font-light mt-1"
                        style={{
                          color: "#5D4E6D",
                        }}
                      >
                        {p.avgPerYear.toFixed(1)}/yr
                      </div>
                      <div className="text-xs text-lacuna-text-secondary mt-1">
                        {p.totalDeals} deals
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Yearly Bar Chart */}
              <div className="mb-4">
                <h5
                  className="text-xs uppercase text-lacuna-text-muted mb-2"
                >
                  Acquisitions Per Year
                </h5>
                <div className="flex items-end gap-1 h-32">
                  {(() => {
                    const maxCount = Math.max(
                      ...selectedVelocity.yearlyData.map((d) => d.count),
                      1,
                    );
                    return selectedVelocity.yearlyData.map((d) => (
                      <div
                        key={d.year}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div className="text-xs text-lacuna-text-secondary mb-1">
                          {d.count}
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-[#5D4E6D] to-[#B8A9C9] rounded-t"
                          style={{
                            height: `${(d.count / maxCount) * 100}%`,
                            minHeight: d.count > 0 ? "4px" : "0",
                          }}
                          title={`${d.year}: ${d.count} deals`}
                        />
                        <div className="text-xs text-lacuna-text-muted mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {d.year}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* External Events */}
              {selectedVelocity.events.length > 0 && (
                <div className="mb-4">
                  <h5
                    className="text-sm font-medium mb-2"
                  >
                    External Events (Context)
                  </h5>
                  <div className="space-y-1">
                    {selectedVelocity.events.map((e, i) => (
                      <div
                        key={i}
                        className="text-sm text-lacuna-text-primary border-l-2 border-[#B8A9C9] pl-3 py-1"
                      >
                        <span className="text-xs text-lacuna-text-muted">
                          {e.year}
                        </span>{" "}
                        • {e.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend */}
              <div className="bg-lacuna-surface-muted p-3 rounded-lg mb-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-lacuna-text-muted uppercase">
                      Trend
                    </div>
                    <div className="font-medium capitalize">
                      {selectedVelocity.trend.direction}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-lacuna-text-muted uppercase">
                      Slope
                    </div>
                    <div className="font-medium">
                      {selectedVelocity.trend.slope.toFixed(2)}/yr²
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-lacuna-text-muted uppercase">
                      R²
                    </div>
                    <div className="font-medium">
                      {selectedVelocity.trend.rSquared.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Descriptive + Caveat */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                <strong>Observed pattern:</strong>{" "}
                {selectedVelocity.descriptivePattern}
              </div>
              <div className="mt-2 bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800">
                <strong>Caveat:</strong>{" "}
                {selectedVelocity.trend.caveat}. Correlation with events does
                not imply causation.
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Market Structure Tab */}
      {activeTab === "market_structure" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-white border border-lacuna-border rounded-lg p-6">
            <h4
              className="font-medium mb-3"
            >
              Sector Contestability
            </h4>
            <p className="text-sm text-lacuna-text-secondary mb-4">
              Companies with 3+ plausible buyers (same sector match) are
              &quot;high contestability.&quot; Higher rate = more competitive
              sector.
            </p>

            <div className="space-y-2 mb-4">
              {marketStructure.sectorContestability.map((s) => (
                <div key={s.sector} className="flex items-center gap-3">
                  <div className="w-40 text-sm truncate">{s.sector}</div>
                  <div className="flex-1 h-6 bg-lacuna-surface-subtle rounded overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end pr-2 text-xs text-white ${
                        s.rate > 0.6
                          ? "bg-red-400"
                          : s.rate > 0.3
                          ? "bg-amber-400"
                          : "bg-green-400"
                      }`}
                      style={{ width: `${s.rate * 100}%`, minWidth: "40px" }}
                    >
                      {s.contestable}/{s.total} ({(s.rate * 100).toFixed(0)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800 mb-3">
              <strong>Observed pattern:</strong>{" "}
              {marketStructure.descriptivePattern}
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800">
              <strong>Critical caveat:</strong> {marketStructure.caveat}
            </div>
          </div>

          {/* Contestable Targets List */}
          <div className="bg-white border border-lacuna-border rounded-lg p-6">
            <h4
              className="font-medium mb-3"
            >
              Most Contestable Targets
            </h4>
            <div className="space-y-2">
              {marketStructure.contestableTargets
                .filter((t) => t.contestability === "high")
                .slice(0, 5)
                .map((t) => (
                  <div
                    key={t.companyId}
                    className="border border-lacuna-border p-3 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="font-medium text-sm">
                          {t.companyName}
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          {t.sector} • {t.stage.replace(/_/g, " ")}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded uppercase">
                        High Contestability
                      </span>
                    </div>
                    <div className="text-xs text-lacuna-text-secondary mt-2">
                      <strong>
                        Plausible buyers ({t.potentialBuyers.length}):
                      </strong>{" "}
                      {t.potentialBuyers.map((b) => b.acquirerName).join(", ")}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Type Comparison Tab */}
      {activeTab === "type_comparison" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="bg-white border border-lacuna-border rounded-lg p-6">
            <h4
              className="font-medium mb-3"
            >
              Acquirer Type Comparison
            </h4>
            <p className="text-sm text-lacuna-text-secondary mb-4">
              Compares behavior across acquirer types: Strategic Healthcare,
              Strategic Tech, PE, Corporate Health
            </p>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr
                  className="text-xs text-lacuna-text-muted uppercase border-b border-lacuna-border"
                >
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Acquirers</th>
                  <th className="text-right py-2">Deals</th>
                  <th className="text-right py-2">Median $</th>
                  <th className="text-right py-2">Median Age</th>
                </tr>
              </thead>
              <tbody>
                {typeComparison.byType.map((t) => (
                  <tr
                    key={t.type}
                    className="border-b border-lacuna-border-subtle"
                  >
                    <td className="py-2 font-medium capitalize">
                      {t.type.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 text-right">{t.count}</td>
                    <td className="py-2 text-right">{t.totalAcquisitions}</td>
                    <td className="py-2 text-right">
                      ${t.valueStats.medianTargetValue}M
                    </td>
                    <td className="py-2 text-right">
                      {t.valueStats.medianTargetAge}y
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Stage by Type */}
            <div className="space-y-4">
              {typeComparison.byType.map((t) => (
                <div
                  key={t.type}
                  className="bg-lacuna-surface-muted p-3 rounded-lg"
                >
                  <div className="font-medium text-sm capitalize mb-2">
                    {t.type.replace(/_/g, " ")}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-lacuna-text-muted uppercase mb-1">
                        Top Stages
                      </div>
                      {t.stageDistribution.slice(0, 3).map((s) => (
                        <div
                          key={s.stage}
                          className="text-xs text-lacuna-text-primary"
                        >
                          {s.stage.replace(/_/g, " ")}: {s.count}{" "}
                          ({s.percentage.toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs text-lacuna-text-muted uppercase mb-1">
                        Top Sectors
                      </div>
                      {t.sectorDistribution.slice(0, 3).map((s) => (
                        <div
                          key={s.sector}
                          className="text-xs text-lacuna-text-primary"
                        >
                          {s.sector}: {s.count} ({s.percentage.toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparative Findings */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded mt-4">
              <strong className="text-sm text-blue-800">
                Descriptive findings:
              </strong>
              <ul className="mt-1 space-y-1">
                {typeComparison.comparativeFindings.map((f, i) => (
                  <li key={i} className="text-sm text-blue-700">• {f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded mt-3 text-sm text-amber-800">
              <strong>Caveat:</strong> {typeComparison.caveat}
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom-line What We DON'T Do */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4
          className="font-medium mb-3"
          
        >
          What This Analysis Does NOT Do
        </h4>
        <ul className="text-sm space-y-1 leading-relaxed">
          <li>
            ✗ Claim strategic intent (unobservable; would require internal
            documents)
          </li>
          <li>
            ✗ Predict synergy realization (retrospective sense-making, rarely
            accurate)
          </li>
          <li>
            ✗ Identify competitive overlaps (we don&apos;t have rejected deals)
          </li>
          <li>
            ✗ Predict next acquisitions (cannot model unobserved decision
            processes)
          </li>
          <li>
            ✗ Prescribe strategy (that&apos;s consulting; this is analysis)
          </li>
        </ul>
        <p className="text-sm mt-3 pt-3 border-t border-white/30">
          This framework <strong>describes</strong>{" "}
          observable acquirer behavior. Interpretation belongs to the reader.
        </p>
      </div>
    </motion.div>
  );
}
