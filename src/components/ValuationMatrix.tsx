'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  getVerifiedAcquisitionsForAnalysis,
  getVerifiedCompaniesForAnalysis,
} from '@/lib/data/verifiedDatasetAdapters';

const companies = getVerifiedCompaniesForAnalysis();
const acquisitions = getVerifiedAcquisitionsForAnalysis();

interface MatrixCell {
  sector: string;
  stage: string;
  avgValuation: number;
  count: number;
  deals: typeof acquisitions;
}

export default function ValuationMatrix() {
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);

  const sectors = [...new Set(companies.map(c => c.sector))].sort();
  const stages = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Late Stage', 'Pre-IPO'];

  // Build matrix data
  const matrix: MatrixCell[][] = stages.map(stage => 
    sectors.map(sector => {
      const sectorCompanies = companies.filter(c => c.sector === sector && c.stage === stage && c.valuation);
      const avgValuation = sectorCompanies.length > 0
        ? sectorCompanies.reduce((sum, c) => sum + (c.valuation || 0), 0) / sectorCompanies.length
        : 0;
      
      const deals = acquisitions.filter(a => {
        const target = companies.find(c => c.id === a.targetId);
        return target?.sector === sector && target?.stage === stage;
      });

      return {
        sector,
        stage,
        avgValuation,
        count: sectorCompanies.length,
        deals
      };
    })
  );

  const maxValuation = Math.max(...matrix.flat().map(c => c.avgValuation));

  const getColor = (value: number) => {
    if (value === 0) return '#f1f5f9';
    const intensity = value / maxValuation;
    if (intensity < 0.25) return '#fce7f3';
    if (intensity < 0.5) return '#fbcfe8';
    if (intensity < 0.75) return '#f9a8d4';
    return '#ec4899';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Valuation Matrix</h3>
      <p className="text-sm text-slate-500 mb-6">Average valuations by sector and stage ($M)</p>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)` }}>
            <div className="p-2"></div>
            {sectors.map(sector => (
              <div key={sector} className="p-2 text-xs font-medium text-slate-600 text-center truncate" title={sector}>
                {sector}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {matrix.map((row, rowIndex) => (
            <div key={stages[rowIndex]} className="grid" style={{ gridTemplateColumns: `120px repeat(${sectors.length}, 1fr)` }}>
              <div className="p-2 text-xs font-medium text-slate-600 flex items-center">
                {stages[rowIndex]}
              </div>
              {row.map((cell, colIndex) => (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className="p-1"
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div
                    className="h-12 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                    style={{ backgroundColor: getColor(cell.avgValuation) }}
                  >
                    {cell.avgValuation > 0 && (
                      <span className="text-xs font-semibold text-slate-700">
                        ${Math.round(cell.avgValuation)}M
                      </span>
                    )}
                    {cell.avgValuation === 0 && cell.count > 0 && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-xs text-slate-500">Low</span>
        <div className="flex gap-1">
          {['#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899'].map((color, i) => (
            <div key={i} className="w-8 h-4 rounded" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-slate-500">High</span>
      </div>

      {/* Tooltip */}
      {hoveredCell && (hoveredCell.avgValuation > 0 || hoveredCell.deals.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
        >
          <h4 className="font-semibold text-slate-800">{hoveredCell.stage} · {hoveredCell.sector}</h4>
          {hoveredCell.avgValuation > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              Average valuation: <span className="font-semibold">${Math.round(hoveredCell.avgValuation)}M</span>
            </p>
          )}
          <p className="text-sm text-slate-600">
            Companies: <span className="font-semibold">{hoveredCell.count}</span>
          </p>
          {hoveredCell.deals.length > 0 && (
            <p className="text-sm text-slate-600">
              Acquisitions: <span className="font-semibold text-pink-600">{hoveredCell.deals.length}</span>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
