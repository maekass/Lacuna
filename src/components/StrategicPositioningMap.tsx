/**
 * Strategic Positioning Map
 *
 * QUALITATIVE 2D visualization of acquirer strategies
 * - X-axis: Sector breadth (specialist → generalist)
 * - Y-axis: Deal velocity (slow → fast)
 *
 * Not a statistical claim - exploratory pattern recognition only
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { StrategicPositioningResult } from "@/lib/network/networkStatistics";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { CompanyPosition } from "@/lib/network/strategicPositioningHelpers";
import {
  clamp,
  getStagePosition,
  hashString,
  pillarColors,
  pillarMap,
  sectorAxisPositions,
  sectorNodeColors,
  stageAxisPositions,
} from "@/lib/network/strategicPositioningHelpers";

interface StrategicPositioningMapProps {
  result: StrategicPositioningResult;
}

export default function StrategicPositioningMap(
  { result }: StrategicPositioningMapProps,
) {
  const { verifiedCompanies } = useVerifiedDataset();
  const [hoveredCompany, setHoveredCompany] = useState<CompanyPosition | null>(
    null,
  );
  const [selectedCompany, setSelectedCompany] = useState<CompanyPosition | null>(
    null,
  );
  const [showForegroundPillars, setShowForegroundPillars] = useState(false);

  // SVG dimensions
  const width = 680;
  const height = 520;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Only sectors with a labeled x-axis position are plotted; unmapped sectors
  // would otherwise pile into an unlabeled blob at the chart center.
  const mappedCompanies = useMemo(
    () =>
      verifiedCompanies.filter((company) =>
        company.sector in sectorAxisPositions
      ),
    [verifiedCompanies],
  );

  const companyPositions = useMemo(
    () =>
      mappedCompanies.map((company, index) => {
        const hash = hashString(`${company.id}-${company.name}-${index}`);
        const xJitter = (((hash % 11) - 5) / 100);
        const yJitter = ((((Math.floor(hash / 11)) % 9) - 4) / 120);
        return {
          ...company,
          xPosition: clamp(
            (sectorAxisPositions[company.sector] ?? 0.5) + xJitter,
            0.08,
            0.94,
          ),
          yPosition: clamp(getStagePosition(company.stage) + yJitter, 0.12, 0.96),
          pillar: pillarMap[company.sector],
        };
      }),
    [mappedCompanies],
  );

  const sectorCoverageNote =
    `Showing ${mappedCompanies.length} of ${verifiedCompanies.length} companies ` +
    `across the ${Object.keys(sectorAxisPositions).length} sectors labeled on the x-axis.`;

  const pillarPatterns = useMemo(() => {
    const counts = new Map<string, number>();
    companyPositions.forEach((company) => {
      if (!company.pillar) return;
      counts.set(company.pillar, (counts.get(company.pillar) ?? 0) + 1);
    });
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) {
      return ["No companies map to a Foreground pillar in the current dataset."];
    }
    return ranked.map(([pillar, count]) => `${count} companies align with ${pillar}.`);
  }, [companyPositions]);

  const pillarCoverageSummary = useMemo(() => {
    const covered = companyPositions.filter((company) => company.pillar).length;
    return `${covered} of ${companyPositions.length} companies map to a Foreground Capital pillar.`;
  }, [companyPositions]);

  // Scales (X: sector grouping, Y: stage maturity)
  const xScale = (x: number) => margin.left + (x * innerWidth);
  const yScale = (y: number) =>
    margin.top + innerHeight - (y * innerHeight);

  // Dot size based on valuation when available
  const dotSize = (company: CompanyPosition) => {
    const valuation = company.lastKnownValuation ?? 0;
    return 9 + Math.min(Math.sqrt(Math.max(valuation, 0)) / 3, 10);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Caveat Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
        <p className="text-sm text-amber-800">
          <strong>Qualitative insight only:</strong> {result.caveat}{" "}
          {sectorCoverageNote}
        </p>
      </div>

      {/* 2D Map */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4
            className="font-medium"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            Company Strategic Positioning Map
          </h4>
          <button
            type="button"
            onClick={() => setShowForegroundPillars((value) => !value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${showForegroundPillars ? "border-lacuna-lavender/40 bg-lacuna-pink/10 text-lacuna-plum" : "border-gray-200 bg-white text-gray-600 hover:text-lacuna-plum"}`}
          >
            Foreground Pillars
          </button>
        </div>

        <div className="relative">
          {showForegroundPillars && (
            <div className="absolute right-3 top-3 z-10 rounded-lg border border-lacuna-lavender/40 bg-white/95 p-3 shadow-lg">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-lacuna-plum">
                Foreground Pillars
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(pillarColors).map(([pillar, color]) => (
                  <div key={pillar} className="flex items-center gap-2 text-gray-700">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span>{pillar}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <svg
            width={width}
            height={height}
            className="overflow-visible max-w-full"
          >
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth}
              height={innerHeight}
              fill="#FAFAFB"
            />

            {Object.entries(sectorAxisPositions).map(([sector, value]) => (
              <g key={sector}>
                <line
                  x1={xScale(value)}
                  y1={margin.top}
                  x2={xScale(value)}
                  y2={margin.top + innerHeight}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={xScale(value)}
                  y={margin.top - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {sector}
                </text>
              </g>
            ))}

            {stageAxisPositions.map((stageTick) => (
              <g key={stageTick.label}>
                <line
                  x1={margin.left}
                  y1={yScale(stageTick.value)}
                  x2={margin.left + innerWidth}
                  y2={yScale(stageTick.value)}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 10}
                  y={yScale(stageTick.value) + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {stageTick.label}
                </text>
              </g>
            ))}

            {/* Axes */}
            <line
              x1={margin.left}
              y1={margin.top + innerHeight}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + innerHeight}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* X-axis label */}
            <text
              x={margin.left + innerWidth / 2}
              y={height - 15}
              textAnchor="middle"
              className="text-sm fill-gray-700 font-medium"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              SECTOR CLUSTERING
            </text>

            {/* Y-axis label */}
            <text
              x={15}
              y={margin.top + innerHeight / 2}
              textAnchor="middle"
              className="text-sm fill-gray-700 font-medium"
              transform={`rotate(-90, 15, ${margin.top + innerHeight / 2})`}
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              COMPANY STAGE (EARLY → LATE)
            </text>

            {/* Axis ticks */}
            {Object.values(sectorAxisPositions).map((t) => (
              <g key={`x-${t}`}>
                <line
                  x1={xScale(t)}
                  y1={margin.top + innerHeight}
                  x2={xScale(t)}
                  y2={margin.top + innerHeight + 5}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  x={xScale(t)}
                  y={margin.top + innerHeight + 18}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {t.toFixed(2)}
                </text>
              </g>
            ))}
            {[0.18, 0.34, 0.48, 0.62, 0.76, 0.86, 0.95].map((t) => (
              <g key={`y-${t}`}>
                <line
                  x1={margin.left - 5}
                  y1={yScale(t)}
                  x2={margin.left}
                  y2={yScale(t)}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 10}
                  y={yScale(t) + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {t.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Data points */}
            {companyPositions.map((company) => {
              const radius = dotSize(company);
              const chipColor = company.pillar ? pillarColors[company.pillar] : undefined;
              const chipWidth = company.pillar ? company.pillar.length * 6.4 + 16 : 0;
              return (
              <g
                key={company.id}
                onMouseEnter={() => setHoveredCompany(company)}
                onMouseLeave={() => setHoveredCompany(null)}
                onClick={() =>
                  setSelectedCompany(company === selectedCompany ? null : company)}
                className="cursor-pointer"
              >
                <circle
                  cx={xScale(company.xPosition)}
                  cy={yScale(company.yPosition)}
                  r={radius}
                  fill={sectorNodeColors[company.sector] ?? "#94A3B8"}
                  stroke={selectedCompany?.id === company.id
                    ? "#000"
                    : "#fff"}
                  strokeWidth={selectedCompany?.id === company.id
                    ? 3
                    : 2}
                  opacity={hoveredCompany && hoveredCompany.id !== company.id
                    ? 0.4
                    : 1}
                  className="transition-all"
                />
                <text
                  x={xScale(company.xPosition)}
                  y={yScale(company.yPosition) - radius - 8}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 font-medium pointer-events-none"
                >
                  {company.name}
                </text>
                {showForegroundPillars && company.pillar && chipColor && (
                  <g>
                    <rect
                      x={xScale(company.xPosition) - chipWidth / 2}
                      y={yScale(company.yPosition) - radius + 2}
                      width={chipWidth}
                      height={16}
                      rx={8}
                      fill={chipColor}
                    />
                    <text
                      x={xScale(company.xPosition)}
                      y={yScale(company.yPosition) - radius + 13}
                      textAnchor="middle"
                      className="pointer-events-none text-[10px] fill-white font-medium"
                    >
                      {company.pillar}
                    </text>
                  </g>
                )}
              </g>
              );
            })}
          </svg>

          {/* Tooltip on hover */}
          {hoveredCompany && (
            <div className="absolute left-2 top-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg max-w-xs">
              <div
                className="font-medium text-sm"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {hoveredCompany.name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {hoveredCompany.sector}
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                <div>Stage: {hoveredCompany.stage}</div>
                <div>Pillar: {hoveredCompany.pillar ?? "Not mapped"}</div>
                {typeof hoveredCompany.lastKnownValuation === "number" && (
                  <div>Valuation: ${hoveredCompany.lastKnownValuation}M</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 text-xs">
          {Object.entries(sectorNodeColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Acquirer Detail */}
      {selectedCompany && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h5
                className="font-medium text-lg"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedCompany.name}
              </h5>
              <p className="text-sm text-gray-600">
                {selectedCompany.description}
              </p>
            </div>
            {selectedCompany.pillar && (
              <span
                className="text-xs px-2 py-1 rounded uppercase"
                style={{
                  backgroundColor: `${pillarColors[selectedCompany.pillar]}20`,
                  color: pillarColors[selectedCompany.pillar],
                }}
              >
                {selectedCompany.pillar}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedCompany.founded}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Founded
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedCompany.sector}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Sector
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedCompany.stage}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Stage
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {typeof selectedCompany.lastKnownValuation === "number"
                  ? `$${selectedCompany.lastKnownValuation}M`
                  : "N/A"}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Valuation
              </div>
            </div>
          </div>

          <div>
            <div
              className="text-xs text-gray-500 uppercase mb-1"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Foreground Fit
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedCompany.pillar
                ? (
                  <span
                    className="text-xs px-2 py-1 rounded text-white"
                    style={{ backgroundColor: pillarColors[selectedCompany.pillar] }}
                  >
                    {selectedCompany.pillar}
                  </span>
                )
                : (
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
                    No Foreground pillar mapping
                  </span>
                )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Identified Patterns */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4
          className="font-medium mb-3"
          style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
        >
          Qualitative Patterns Identified
        </h4>
        {pillarPatterns.length > 0
          ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {pillarPatterns.map((pattern, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#5D4E6D] mt-0.5">→</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          )
          : (
            <p className="text-sm text-gray-500 italic">
              No strong patterns detected in current sample
            </p>
          )}
      </div>

      {/* Honest Interpretation */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4
          className="font-medium mb-3"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Strategic Positioning Summary
        </h4>
        <p className="text-sm leading-relaxed">
          Mapped {companyPositions.length}{" "}
          companies across sector × stage dimensions. {pillarCoverageSummary}
          <strong>
            This is exploratory pattern recognition, not statistical hypothesis
            testing.
          </strong>
          Foreground pillar chips are a thematic overlay, not a modeled output.
        </p>
      </div>
    </motion.div>
  );
}
