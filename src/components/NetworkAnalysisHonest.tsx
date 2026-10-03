/**
 * Honest Network Analysis Component
 *
 * Network analysis for small samples (n=15-20) that is transparent about
 * what we can and cannot reveal.
 *
 * Features:
 * - Tier 1: What we CANNOT claim (power laws, preferential attachment)
 * - Tier 2: Descriptive metrics with bootstrap CIs
 * - Buyer concentration (Gini, HHI) instead of power law fitting
 * - Null model comparison
 * - Exploratory visualization with caveats
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  averageShortestPath,
  communityDetection,
  degreeDistribution,
  giniCoefficient,
  herfindahlIndex,
  networkDensity,
  networkStabilityAnalysis,
  nullModelComparison,
  POWER_LAW_LIMITATIONS,
  strategicPositioning,
  temporalAnalysis,
} from "@/lib/network/networkStatistics";
import StrategicPositioningMap from "./StrategicPositioningMap";
import { getVerifiedNetworkGraph } from "@/lib/data/verifiedDatasetAdapters";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  DISPLAY_FONT,
  displayFont,
  LABEL_FONT,
  labelFont,
  labelFontUppercase,
} from "@/lib/theme/typography";
import AnalysisPanelHeader from "@/components/ui/AnalysisPanelHeader";
import MetricTile from "@/components/ui/MetricTile";

const NETWORK_SEED = 42;

export default function NetworkAnalysisHonest() {
  const dataset = useVerifiedDataset();
  const { nodes: sampleNodes, edges: sampleEdges } = useMemo(
    () => getVerifiedNetworkGraph(dataset),
    [dataset],
  );
  const [activeTab, setActiveTab] = useState<
    | "descriptive"
    | "concentration"
    | "temporal"
    | "communities"
    | "positioning"
    | "stability"
    | "null_model"
    | "limitations"
  >("descriptive");

  // Calculate all network statistics
  const stats = useMemo(() => {
    const degree = degreeDistribution(sampleNodes, sampleEdges);
    const density = networkDensity(sampleNodes.length, sampleEdges.length);
    const paths = averageShortestPath(sampleNodes, sampleEdges);

    // Acquirer concentration analysis
    const acquirers = sampleNodes.filter((n) => n.type === "acquirer");
    const acquirerDeals = acquirers.map((a) => {
      return sampleEdges.filter((e) =>
        e.source === a.id && e.type === "acquisition"
      ).length;
    });

    const gini = giniCoefficient(acquirerDeals);
    const hhi = herfindahlIndex(acquirerDeals);
    const nullModel = nullModelComparison(acquirerDeals, 1000, NETWORK_SEED);
    const temporal = temporalAnalysis(sampleEdges);
    const communities = communityDetection(
      sampleNodes,
      sampleEdges,
      NETWORK_SEED,
    );
    const positioning = strategicPositioning(sampleNodes, sampleEdges);
    const stability = networkStabilityAnalysis(
      sampleNodes,
      sampleEdges,
      100,
      NETWORK_SEED,
    );

    return {
      degree,
      density,
      paths,
      gini,
      hhi,
      nullModel,
      temporal,
      communities,
      positioning,
      stability,
      acquirers,
      acquirerDeals,
    };
  }, [sampleNodes, sampleEdges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      {/* Critical Warning Header */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-2xl">⚠️</span>
          <div>
            <h2
              className="font-medium text-red-900 text-lg"
              style={displayFont}
            >
              Small-N Network Analysis
            </h2>
            <p className="text-sm text-red-700 mt-1">
              Network has only {sampleNodes.length} nodes and{" "}
              {sampleEdges.length} edges.
              <strong>
                Standard network metrics (power laws, centrality) are unreliable
                at this scale.
              </strong>
              Use descriptive concentration metrics instead.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <AnalysisPanelHeader
        title="Honest Network Analysis"
        subtitle="Bootstrap CIs | Gini/HHI Concentration | Null Model Comparison"
      />
      <p className="text-xs text-lacuna-text-muted">
        Bootstrap CIs and simulation-based metrics use seed{" "}
        {NETWORK_SEED}; values are reproducible for identical input data.
      </p>

      {/* Tab Navigation */}
      <div className="border-b border-lacuna-border">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "descriptive", label: "Descriptives + CIs" },
            { id: "concentration", label: "Buyer Concentration" },
            { id: "temporal", label: "Temporal Analysis" },
            { id: "communities", label: "Community Detection" },
            { id: "positioning", label: "Strategic Positioning" },
            { id: "stability", label: "Stability Analysis" },
            { id: "null_model", label: "Null Model Comparison" },
            { id: "limitations", label: "What We Cannot Claim" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#5D4E6D] text-[#5D4E6D] font-medium"
                  : "border-transparent text-lacuna-text-muted hover:text-lacuna-text-primary"
              }`}
              style={{
                fontFamily: LABEL_FONT,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Descriptives Tab */}
      {activeTab === "descriptive" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-lacuna-border p-4 rounded-lg">
              <div
                className="text-xs text-lacuna-text-muted uppercase mb-1"
                style={labelFont}
              >
                Network Size
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: "#5D4E6D",
                }}
              >
                {sampleNodes.length}
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                nodes, {sampleEdges.length} edges
              </div>
            </div>

            <div className="bg-white border border-lacuna-border p-4 rounded-lg">
              <div
                className="text-xs text-lacuna-text-muted uppercase mb-1"
                style={labelFont}
              >
                Density
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: "#4A5D8A",
                }}
              >
                {(stats.density.density * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                {stats.density.interpretation}
              </div>
            </div>

            <div className="bg-white border border-lacuna-border p-4 rounded-lg">
              <div
                className="text-xs text-lacuna-text-muted uppercase mb-1"
                style={labelFont}
              >
                Components
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: "#E8B4B8",
                }}
              >
                {stats.paths.componentSizes.length}
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                {stats.paths.isConnected ? "fully connected" : "fragmented"}
              </div>
            </div>

            <div className="bg-white border border-lacuna-border p-4 rounded-lg">
              <div
                className="text-xs text-lacuna-text-muted uppercase mb-1"
                style={labelFont}
              >
                Diameter
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: "#B8A9C9",
                }}
              >
                {stats.paths.diameter}
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                longest path
              </div>
            </div>
          </div>

          {/* Degree Distribution */}
          <div className="bg-white border border-lacuna-border rounded-lg p-6">
            <h4
              className="font-medium mb-4"
              style={displayFont}
            >
              Degree Distribution (Robust Statistics)
            </h4>
            <p className="text-sm text-lacuna-text-secondary mb-4">
              Reporting <strong>median + IQR</strong>{" "}
              instead of mean ± SD (more robust for small n)
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MetricTile
                value={<>{stats.degree.median}</>}
                label="Median Degree"
              />
              <MetricTile
                value={<>[{stats.degree.iqr[0]}, {stats.degree.iqr[1]}]</>}
                label="IQR"
              />
              <MetricTile
                value={<>{stats.degree.min}-{stats.degree.max}</>}
                label="Range"
              />
              <MetricTile
                value={<>{stats.degree.mean.toFixed(1)}</>}
                label="Mean (less robust)"
              />
            </div>

            {/* Distribution histogram */}
            <div className="mt-4">
              <div
                className="text-xs text-lacuna-text-muted uppercase mb-2"
                style={labelFont}
              >
                Distribution
              </div>
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const counts = new Map<number, number>();
                  stats.degree.distribution.forEach((d) => {
                    counts.set(d, (counts.get(d) || 0) + 1);
                  });
                  const maxCount = Math.max(...Array.from(counts.values()), 1);
                  const sortedDegrees = Array.from(counts.keys()).sort((a, b) =>
                    a - b
                  );

                  return sortedDegrees.map((degree) => {
                    const count = counts.get(degree) || 0;
                    const height = (count / maxCount) * 100;
                    return (
                      <div
                        key={degree}
                        className="flex-1 flex flex-col items-center group"
                      >
                        <div
                          className="w-full bg-[#5D4E6D] rounded-t hover:bg-[#7D6E8D] transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${count} nodes with degree ${degree}`}
                        />
                        <div className="text-xs text-lacuna-text-muted mt-1">
                          {degree}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>


