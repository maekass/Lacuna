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

import { useState } from "react";
import { motion } from "framer-motion";
import type {
  StrategicPosition,
  StrategicPositioningResult,
} from "@/lib/network/networkStatistics";

interface StrategicPositioningMapProps {
  result: StrategicPositioningResult;
}

const QUADRANT_COLORS = {
  specialist_high_velocity: "#E8B4B8",
  specialist_low_velocity: "#B8A9C9",
  generalist_high_velocity: "#4A5D8A",
  generalist_low_velocity: "#5D4E6D",
};

const QUADRANT_LABELS = {
  specialist_high_velocity: "Focused Aggressive",
  specialist_low_velocity: "Selective Specialist",
  generalist_high_velocity: "Aggressive Diversifier",
  generalist_low_velocity: "Diversified Observer",
};

export default function StrategicPositioningMap(
  { result }: StrategicPositioningMapProps,
) {
  const [hoveredAcquirer, setHoveredAcquirer] = useState<
    StrategicPosition | null
  >(null);
  const [selectedAcquirer, setSelectedAcquirer] = useState<
    StrategicPosition | null
  >(null);

  // SVG dimensions
  const width = 600;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales (X: 0-1 breadth, Y: 0-2 velocity)
  const maxVelocity = Math.max(...result.positions.map((p) => p.velocity), 1.5);
  const xScale = (x: number) => margin.left + (x * innerWidth);
  const yScale = (y: number) =>
    margin.top + innerHeight - (y / maxVelocity * innerHeight);

  // Dot size based on deal count
  const maxDeals = Math.max(...result.positions.map((p) => p.dealCount), 1);
  const dotSize = (deals: number) => 8 + (deals / maxDeals) * 16;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Caveat Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
        <p className="text-sm text-amber-800">
          <strong>Qualitative insight only:</strong> {result.caveat}
        </p>
      </div>

      {/* 2D Map */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4
          className="font-medium mb-4"
          style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
        >
          Acquirer Strategic Positioning Map
        </h4>

        <div className="relative">
          <svg
            width={width}
            height={height}
            className="overflow-visible max-w-full"
          >
            {/* Background quadrants */}
            <rect
              x={margin.left}
              y={margin.top}
              width={innerWidth / 2}
              height={innerHeight / 2}
              fill="#E8B4B8"
              opacity={0.08}
            />
            <rect
              x={margin.left + innerWidth / 2}
              y={margin.top}
              width={innerWidth / 2}
              height={innerHeight / 2}
              fill="#4A5D8A"
              opacity={0.08}
            />
            <rect
              x={margin.left}
              y={margin.top + innerHeight / 2}
              width={innerWidth / 2}
              height={innerHeight / 2}
              fill="#B8A9C9"
              opacity={0.08}
            />
            <rect
              x={margin.left + innerWidth / 2}
              y={margin.top + innerHeight / 2}
              width={innerWidth / 2}
              height={innerHeight / 2}
              fill="#5D4E6D"
              opacity={0.08}
            />

            {/* Quadrant Labels */}
            <text
              x={margin.left + innerWidth / 4}
              y={margin.top + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              FOCUSED AGGRESSIVE
            </text>
            <text
              x={margin.left + 3 * innerWidth / 4}
              y={margin.top + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              AGGRESSIVE DIVERSIFIER
            </text>
            <text
              x={margin.left + innerWidth / 4}
              y={margin.top + innerHeight - 5}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              SELECTIVE SPECIALIST
            </text>
            <text
              x={margin.left + 3 * innerWidth / 4}
              y={margin.top + innerHeight - 5}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              DIVERSIFIED OBSERVER
            </text>

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

            {/* Midlines (quadrant dividers) */}
            <line
              x1={margin.left + innerWidth / 2}
              y1={margin.top}
              x2={margin.left + innerWidth / 2}
              y2={margin.top + innerHeight}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={margin.left}
              y1={margin.top + innerHeight / 2}
              x2={margin.left + innerWidth}
              y2={margin.top + innerHeight / 2}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
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
              SECTOR BREADTH (SPECIALIST → GENERALIST)
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
              DEAL VELOCITY (SLOW → FAST)
            </text>

            {/* Axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
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
            {[0, 0.5, 1, 1.5].filter((t) => t <= maxVelocity).map((t) => (
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
                  {t.toFixed(1)}/yr
                </text>
              </g>
            ))}

            {/* Data points */}
            {result.positions.map((p) => (
              <g
                key={p.acquirerId}
                onMouseEnter={() => setHoveredAcquirer(p)}
                onMouseLeave={() => setHoveredAcquirer(null)}
                onClick={() =>
                  setSelectedAcquirer(p === selectedAcquirer ? null : p)}
                className="cursor-pointer"
              >
                <circle
                  cx={xScale(p.sectorBreadth)}
                  cy={yScale(p.velocity)}
                  r={dotSize(p.dealCount)}
                  fill={QUADRANT_COLORS[p.classification]}
                  stroke={selectedAcquirer?.acquirerId === p.acquirerId
                    ? "#000"
                    : "#fff"}
                  strokeWidth={selectedAcquirer?.acquirerId === p.acquirerId
                    ? 3
                    : 2}
                  opacity={hoveredAcquirer &&
                      hoveredAcquirer.acquirerId !== p.acquirerId
                    ? 0.4
                    : 1}
                  className="transition-all"
                />
                <text
                  x={xScale(p.sectorBreadth)}
                  y={yScale(p.velocity) - dotSize(p.dealCount) - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 font-medium pointer-events-none"
                >
                  {p.acquirerName}
                </text>
              </g>
            ))}
          </svg>

          {/* Tooltip on hover */}
          {hoveredAcquirer && (
            <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg max-w-xs">
              <div
                className="font-medium text-sm"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {hoveredAcquirer.acquirerName}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {QUADRANT_LABELS[hoveredAcquirer.classification]}
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                <div>Deals: {hoveredAcquirer.dealCount}</div>
                <div>Sectors: {hoveredAcquirer.uniqueSectors}</div>
                <div>Velocity: {hoveredAcquirer.velocity.toFixed(2)}/year</div>
                <div>
                  Breadth: {(hoveredAcquirer.sectorBreadth * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
          {Object.entries(QUADRANT_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    QUADRANT_COLORS[key as keyof typeof QUADRANT_COLORS],
                }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Acquirer Detail */}
      {selectedAcquirer && (
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
                {selectedAcquirer.acquirerName}
              </h5>
              <p className="text-sm text-gray-600">
                {selectedAcquirer.qualitativeDescription}
              </p>
            </div>
            <span
              className="text-xs px-2 py-1 rounded uppercase"
              style={{
                backgroundColor:
                  QUADRANT_COLORS[selectedAcquirer.classification] + "20",
                color: QUADRANT_COLORS[selectedAcquirer.classification],
              }}
            >
              {QUADRANT_LABELS[selectedAcquirer.classification]}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedAcquirer.dealCount}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Total Deals
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedAcquirer.uniqueSectors}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Unique Sectors
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {selectedAcquirer.velocity.toFixed(2)}
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Deals/Year
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div
                className="text-2xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {(selectedAcquirer.sectorBreadth * 100).toFixed(0)}%
              </div>
              <div
                className="text-xs text-gray-500 uppercase mt-1"
                style={{ fontFamily: "'Arial Narrow', sans-serif" }}
              >
                Breadth Score
              </div>
            </div>
          </div>

          <div>
            <div
              className="text-xs text-gray-500 uppercase mb-1"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Targets ({selectedAcquirer.targets.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedAcquirer.targets.map((target, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700"
                >
                  {target}
                </span>
              ))}
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
        {result.patterns.length > 0
          ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {result.patterns.map((pattern, i) => (
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
          Mapped {result.positions.length}{" "}
          acquirers across breadth × velocity dimensions.
          {result.patterns.length > 0
            ? " Identified " + result.patterns.length + " qualitative patterns."
            : " Patterns are weak."}
          <strong>
            This is exploratory pattern recognition, not statistical hypothesis
            testing.
          </strong>
          Findings should be confirmed with larger dataset and qualitative
          validation (interviews with M&A teams).
        </p>
      </div>
    </motion.div>
  );
}
