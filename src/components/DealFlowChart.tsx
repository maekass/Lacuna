"use client";

import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";

interface DealYear {
  year: number;
  count: number;
}

type MomentumLabel = "High" | "Stable" | "Cooling";

const MOMENTUM_BADGE_CLASSES: Record<MomentumLabel, string> = {
  High: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Stable: "bg-amber-50 text-amber-700 border border-amber-200",
  Cooling: "bg-red-50 text-red-700 border border-red-200",
};

function classifyMomentum(
  recentTotal: number,
  priorTotal: number,
): MomentumLabel {
  if (recentTotal === 0 && priorTotal === 0) return "Stable";
  if (priorTotal === 0) return recentTotal > 0 ? "High" : "Stable";

  const ratio = recentTotal / priorTotal;
  if (ratio > 1.2) return "High";
  if (ratio < 0.8) return "Cooling";
  return "Stable";
}

interface DealFlowChartProps {
  data: DealYear[];
  width?: number;
  height?: number;
}

export default function DealFlowChart(
  { data, width = 600, height = 300 }: DealFlowChartProps,
) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barWidth = data.length > 0 ? (width - 80) / data.length : 0;
  const scale = (height - 100) / maxCount;
  const rollingAverage = data.map((point, index) => {
    const window = data.slice(Math.max(0, index - 2), index + 1);
    const total = window.reduce((sum, item) => sum + item.count, 0);
    return {
      year: point.year,
      average: total / window.length,
    };
  });
  const trendLinePoints = rollingAverage.map((point, index) => {
    const x = 50 + index * barWidth + barWidth / 2;
    const y = height - 50 - point.average * scale;
    return `${x},${y}`;
  }).join(" ");
  const recentTotal = data.slice(-3).reduce(
    (sum, point) => sum + point.count,
    0,
  );
  const priorTotal = data.slice(-6, -3).reduce(
    (sum, point) => sum + point.count,
    0,
  );
  const momentum = classifyMomentum(recentTotal, priorTotal);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Deal Activity Over Time
          </h3>
          <p className="text-sm text-slate-500">
            M&amp;A and strategic investments in women&apos;s health
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            MOMENTUM_BADGE_CLASSES[momentum]
          }`}
        >
          Momentum: {momentum}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <line
            key={i}
            x1={40}
            y1={height - 50 - (tick * (height - 100))}
            x2={width - 40}
            y2={height - 50 - (tick * (height - 100))}
            stroke="#e2e8f0"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <text
            key={i}
            x={30}
            y={height - 50 - (tick * (height - 100)) + 4}
            textAnchor="end"
            className="text-xs fill-slate-400"
          >
            {Math.round(maxCount * tick)}
          </text>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = d.count * scale;
          const x = 50 + i * barWidth;
          const y = height - 50 - barHeight;

          return (
            <motion.g
              key={d.year}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {/* Bar */}
              <rect
                x={x + 5}
                y={y}
                width={barWidth - 10}
                height={barHeight}
                fill="url(#barGradient)"
                rx={4}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="text-xs font-semibold fill-slate-700"
              >
                {d.count}
              </text>

              {/* Year label */}
              <text
                x={x + barWidth / 2}
                y={height - 30}
                textAnchor="middle"
                className="text-xs fill-slate-500"
              >
                {d.year}
              </text>
            </motion.g>
          );
        })}

        {trendLinePoints && (
          <polyline
            points={trendLinePoints}
            stroke="#7C3AED"
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B9D" />
            <stop offset="100%" stopColor="#9D4EDD" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
