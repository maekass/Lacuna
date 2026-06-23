/**
 * Founder Characteristics Analysis
 *
 * DESCRIPTIVE comparison of women vs men founded companies
 * NOT causal claims about discrimination
 *
 * Visualizes:
 * - Sector distribution side-by-side
 * - Stage at acquisition
 * - Time to acquisition
 * - Acquisition values
 * - Network/board size (when available)
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  stage: string;
  yearFounded?: number;
  yearAcquired?: number;
  acquisitionValue?: number;
  hasWomenFounder: boolean;
  founderCount: number;
  boardSize?: number;
}

interface FounderCharacteristicsProps {
  companies: CompanyProfile[];
}

const COLORS = {
  women: "#E8B4B8",
  men: "#4A5D8A",
  womenDark: "#C792A0",
  menDark: "#2E3F60",
};

export default function FounderCharacteristics(
  { companies }: FounderCharacteristicsProps,
) {
  const [view, setView] = useState<"sector" | "stage" | "timeline" | "value">(
    "sector",
  );

  const womenLed = useMemo(() => companies.filter((c) => c.hasWomenFounder), [
    companies,
  ]);
  const menLed = useMemo(() => companies.filter((c) => !c.hasWomenFounder), [
    companies,
  ]);

  // Sector distribution
  const sectorComparison = useMemo(() => {
    const sectors = new Set([
      ...womenLed.map((c) => c.sector),
      ...menLed.map((c) => c.sector),
    ]);
    return Array.from(sectors).map((sector) => {
      const womenCount = womenLed.filter((c) => c.sector === sector).length;
      const menCount = menLed.filter((c) => c.sector === sector).length;
      return {
        sector,
        womenCount,
        menCount,
        womenPct: womenLed.length > 0
          ? (womenCount / womenLed.length) * 100
          : 0,
        menPct: menLed.length > 0 ? (menCount / menLed.length) * 100 : 0,
        diff: (womenLed.length > 0 ? womenCount / womenLed.length : 0) -
          (menLed.length > 0 ? menCount / menLed.length : 0),
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [womenLed, menLed]);

  // Stage distribution
  const stageComparison = useMemo(() => {
    const stages = [
      "Pre-Seed",
      "Seed",
      "Series A",
      "Series B",
      "Series C",
      "Series D+",
      "Acquired",
      "Public",
    ];
    return stages.map((stage) => {
      const womenCount = womenLed.filter((c) => c.stage === stage).length;
      const menCount = menLed.filter((c) => c.stage === stage).length;
      return {
        stage,
        womenCount,
        menCount,
        womenPct: womenLed.length > 0
          ? (womenCount / womenLed.length) * 100
          : 0,
        menPct: menLed.length > 0 ? (menCount / menLed.length) * 100 : 0,
      };
    });
  }, [womenLed, menLed]);

  // Time to acquisition
  const timeToAcq = useMemo(() => {
    const womenAcq = womenLed
      .filter((c) => c.yearAcquired && c.yearFounded !== undefined)
      .map((c) => c.yearAcquired! - c.yearFounded!);
    const menAcq = menLed
      .filter((c) => c.yearAcquired && c.yearFounded !== undefined)
      .map((c) => c.yearAcquired! - c.yearFounded!);

    return {
      women: {
        mean: womenAcq.length > 0
          ? womenAcq.reduce((a, b) => a + b, 0) / womenAcq.length
          : 0,
        median: womenAcq.length > 0
          ? womenAcq.sort((a, b) => a - b)[Math.floor(womenAcq.length / 2)]
          : 0,
        count: womenAcq.length,
        range: womenAcq.length > 0
          ? [Math.min(...womenAcq), Math.max(...womenAcq)]
          : [0, 0],
      },
      men: {
        mean: menAcq.length > 0
          ? menAcq.reduce((a, b) => a + b, 0) / menAcq.length
          : 0,
        median: menAcq.length > 0
          ? menAcq.sort((a, b) => a - b)[Math.floor(menAcq.length / 2)]
          : 0,
        count: menAcq.length,
        range: menAcq.length > 0
          ? [Math.min(...menAcq), Math.max(...menAcq)]
          : [0, 0],
      },
    };
  }, [womenLed, menLed]);

  // Acquisition value comparison
  const valueComparison = useMemo(() => {
    const womenValues = womenLed
      .filter((c) => c.acquisitionValue && c.acquisitionValue > 0)
      .map((c) => c.acquisitionValue!);
    const menValues = menLed
      .filter((c) => c.acquisitionValue && c.acquisitionValue > 0)
      .map((c) => c.acquisitionValue!);

    return {
      women: {
        mean: womenValues.length > 0
          ? womenValues.reduce((a, b) => a + b, 0) / womenValues.length
          : 0,
        median: womenValues.length > 0
          ? womenValues.sort((a, b) =>
            a - b
          )[Math.floor(womenValues.length / 2)]
          : 0,
        count: womenValues.length,
        total: womenValues.reduce((a, b) => a + b, 0),
      },
      men: {
        mean: menValues.length > 0
          ? menValues.reduce((a, b) => a + b, 0) / menValues.length
          : 0,
        median: menValues.length > 0
          ? menValues.sort((a, b) => a - b)[Math.floor(menValues.length / 2)]
          : 0,
        count: menValues.length,
        total: menValues.reduce((a, b) => a + b, 0),
      },
    };
  }, [womenLed, menLed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="border-b border-lacuna-border pb-4">
        <h3
          className="text-xl font-light tracking-tight"
          style={{
            fontFamily: "'Bodoni MT', Didot, serif",
            textTransform: "uppercase",
          }}
        >
          Founder Characteristics Analysis
        </h3>
        <p
          className="text-xs tracking-widest text-lacuna-text-muted mt-1"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Descriptive Profile Comparison | NOT Causal Claims
        </p>
      </div>

      {/* Sample Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg">
          <div
            className="text-xs text-pink-700 uppercase mb-2"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Women-Founded Companies
          </div>
          <div
            className="text-3xl font-light"
            style={{
              fontFamily: "'Bodoni MT', Didot, serif",
              color: COLORS.womenDark,
            }}
          >
            {womenLed.length}
          </div>
          <div className="text-xs text-lacuna-text-secondary mt-1">
            {((womenLed.length / companies.length) * 100).toFixed(0)}% of
            dataset
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div
            className="text-xs text-blue-700 uppercase mb-2"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            Men-Founded Companies
          </div>
          <div
            className="text-3xl font-light"
            style={{
              fontFamily: "'Bodoni MT', Didot, serif",
              color: COLORS.menDark,
            }}
          >
            {menLed.length}
          </div>
          <div className="text-xs text-lacuna-text-secondary mt-1">
            {((menLed.length / companies.length) * 100).toFixed(0)}% of dataset
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex flex-wrap gap-2">
        {(["sector", "stage", "timeline", "value"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              view === v
                ? "bg-[#5D4E6D] text-white"
                : "bg-lacuna-surface-subtle text-lacuna-text-primary hover:bg-lacuna-surface-subtle"
            }`}
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            {v === "sector"
              ? "By Sector"
              : v === "stage"
              ? "By Stage"
              : v === "timeline"
              ? "Time to Acquisition"
              : "Acquisition Value"}
          </button>
        ))}
      </div>

      {/* Sector View */}
      {view === "sector" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Sector Distribution Comparison
          </h4>

          <div className="space-y-4">
            {sectorComparison.map((s) => (
              <div key={s.sector}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.sector}</span>
                  {Math.abs(s.diff * 100) > 15 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        s.diff > 0
                          ? "bg-pink-100 text-pink-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {s.diff > 0 ? "+" : ""}
                      {(s.diff * 100).toFixed(0)}pp gap
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 rounded transition-all duration-500"
                      style={{
                        backgroundColor: COLORS.women,
                        width: `${
                          (s.womenPct / Math.max(...sectorComparison.map((x) =>
                            Math.max(x.womenPct, x.menPct)
                          ))) * 100
                        }%`,
                        minWidth: s.womenCount > 0 ? "20px" : "0",
                      }}
                    />
                    <span className="text-xs text-lacuna-text-secondary">
                      {s.womenCount} ({s.womenPct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 rounded transition-all duration-500"
                      style={{
                        backgroundColor: COLORS.men,
                        width: `${
                          (s.menPct / Math.max(...sectorComparison.map((x) =>
                            Math.max(x.womenPct, x.menPct)
                          ))) * 100
                        }%`,
                        minWidth: s.menCount > 0 ? "20px" : "0",
                      }}
                    />
                    <span className="text-xs text-lacuna-text-secondary">
                      {s.menCount} ({s.menPct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <strong>Confounding Insight:</strong>{" "}
            Women founders are over-represented in
            {sectorComparison.filter((s) =>
              s.diff > 0.15
            ).map((s) =>
              ` ${s.sector}`
            ).join(", ") || " some sectors"}, which may have systematically
            different acquisition profiles. This sector mix confounds gender
            comparisons.
          </div>
        </motion.div>
      )}

      {/* Stage View */}
      {view === "stage" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Stage Distribution Comparison
          </h4>

          <div className="space-y-3">
            {stageComparison.filter((s) => s.womenCount > 0 || s.menCount > 0)
              .map((s) => (
                <div key={s.stage}>
                  <div className="text-sm font-medium mb-1">{s.stage}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 rounded"
                        style={{
                          backgroundColor: COLORS.women,
                          width: `${Math.min(s.womenPct, 100)}%`,
                          minWidth: s.womenCount > 0 ? "15px" : "0",
                        }}
                      />
                      <span className="text-xs">{s.womenCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 rounded"
                        style={{
                          backgroundColor: COLORS.men,
                          width: `${Math.min(s.menPct, 100)}%`,
                          minWidth: s.menCount > 0 ? "15px" : "0",
                        }}
                      />
                      <span className="text-xs">{s.menCount}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Timeline View */}
      {view === "timeline" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Time to Acquisition (Years)
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <div
                className="text-xs text-pink-700 uppercase mb-2"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Women-Founded
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: "'Bodoni MT', Didot, serif",
                  color: COLORS.womenDark,
                }}
              >
                {timeToAcq.women.mean.toFixed(1)}y
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                Median: {timeToAcq.women.median}y | n={timeToAcq.women.count}
                {" "}
                acquisitions
              </div>
              <div className="text-xs text-lacuna-text-muted mt-1">
                Range: {timeToAcq.women.range[0]}-{timeToAcq.women.range[1]}y
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div
                className="text-xs text-blue-700 uppercase mb-2"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Men-Founded
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: "'Bodoni MT', Didot, serif",
                  color: COLORS.menDark,
                }}
              >
                {timeToAcq.men.mean.toFixed(1)}y
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                Median: {timeToAcq.men.median}y | n={timeToAcq.men.count}{" "}
                acquisitions
              </div>
              <div className="text-xs text-lacuna-text-muted mt-1">
                Range: {timeToAcq.men.range[0]}-{timeToAcq.men.range[1]}y
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-lacuna-surface-muted rounded text-sm text-lacuna-text-primary">
            <strong>Difference:</strong>{" "}
            {Math.abs(timeToAcq.women.mean - timeToAcq.men.mean).toFixed(1)}
            {" "}
            years ({timeToAcq.women.mean > timeToAcq.men.mean
              ? "women longer"
              : "men longer"}).
            <br />
            <span className="text-amber-600">
              ⚠ Small sample sizes (n={timeToAcq.women.count}{" "}
              women, n={timeToAcq.men.count} men) limit statistical reliability.
            </span>
          </div>
        </motion.div>
      )}

      {/* Value View */}
      {view === "value" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-lacuna-border rounded-lg p-6"
        >
          <h4
            className="font-medium mb-4"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Acquisition Value Comparison
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <div
                className="text-xs text-pink-700 uppercase mb-2"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Women-Founded (n={valueComparison.women.count})
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: "'Bodoni MT', Didot, serif",
                  color: COLORS.womenDark,
                }}
              >
                ${valueComparison.women.mean.toFixed(0)}M
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                Mean acquisition value
              </div>
              <div className="mt-2 pt-2 border-t border-pink-200">
                <div className="text-xs text-lacuna-text-muted">
                  Median: ${valueComparison.women.median}M
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  Total: ${valueComparison.women.total.toFixed(0)}M
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div
                className="text-xs text-blue-700 uppercase mb-2"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Men-Founded (n={valueComparison.men.count})
              </div>
              <div
                className="text-3xl font-light"
                style={{
                  fontFamily: "'Bodoni MT', Didot, serif",
                  color: COLORS.menDark,
                }}
              >
                ${valueComparison.men.mean.toFixed(0)}M
              </div>
              <div className="text-xs text-lacuna-text-secondary mt-1">
                Mean acquisition value
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="text-xs text-lacuna-text-muted">
                  Median: ${valueComparison.men.median}M
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  Total: ${valueComparison.men.total.toFixed(0)}M
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <strong>Important caveat:</strong>{" "}
            Mean values dominated by outliers in such small samples
            (n={valueComparison.women.count + valueComparison.men.count}{" "}
            total). Median is more robust but still uncertain with this n.
            <strong>
              Do NOT interpret as evidence of valuation discrimination.
            </strong>
          </div>
        </motion.div>
      )}

      {/* Bottom-line Interpretation */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4
          className="font-medium mb-3"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Descriptive Summary
        </h4>
        <p className="text-sm leading-relaxed">
          <strong>What this analysis shows:</strong>{" "}
          Systematic profile differences between women-founded and men-founded
          companies in our dataset across sector, stage, and value dimensions.
          <br />
          <br />
          <strong>What it does NOT show:</strong>{" "}
          Causal relationships, discrimination, or generalizable patterns. These
          characteristics are <em>confounders</em>{" "}
          that must be controlled before any fairness analysis. After
          adjustment, apparent gender effects often disappear.
          <br />
          <br />
          <strong>Recommendation:</strong>{" "}
          Treat as exploratory profile analysis. Use logistic regression with
          sector/stage controls before drawing conclusions about gender effects.
        </p>
      </div>
    </motion.div>
  );
}
