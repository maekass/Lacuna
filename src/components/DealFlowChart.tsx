'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DealYear {
  year: number;
  count: number;
}

interface DealFlowChartProps {
  data: DealYear[];
  width?: number;
  height?: number;
}

export default function DealFlowChart({ data, width = 600, height = 300 }: DealFlowChartProps) {
  const maxCount = Math.max(...data.map(d => d.count));
  const barWidth = (width - 80) / data.length;
  const scale = (height - 100) / maxCount;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Deal Activity Over Time</h3>
      <p className="text-sm text-slate-500 mb-6">M&amp;A and strategic investments in women&apos;s health</p>
      
      <svg width={width} height={height} className="w-full">
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
