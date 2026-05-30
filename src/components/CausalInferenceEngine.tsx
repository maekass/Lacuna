/**
 * Descriptive acquisition patterns from the verified dataset.
 * Panel-style causal models require longitudinal data not present in this release.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

interface SectorRow {
  sector: string;
  companies: number;
  acquired: number;
  rate: number;
}

export default function CausalInferenceEngine() {
  const { verifiedAcquisitions, verifiedCompanies } = useVerifiedDataset();
  const sectorRows = useMemo((): SectorRow[] => {
    const acquiredIds = new Set(verifiedAcquisitions.map((d) => d.targetId));
    const bySector = new Map<string, { total: number; acquired: number }>();

    for (const c of verifiedCompanies) {
      const row = bySector.get(c.sector) ?? { total: 0, acquired: 0 };
      row.total += 1;
      if (acquiredIds.has(c.id)) row.acquired += 1;
      bySector.set(c.sector, row);
    }

    return [...bySector.entries()]
      .map(([sector, { total, acquired }]) => ({
        sector,
        companies: total,
        acquired,
        rate: total > 0 ? acquired / total : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [verifiedAcquisitions, verifiedCompanies]);

  const totalDeals = verifiedAcquisitions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-lacuna-lavender/25 border-l-4 border-lacuna-plum p-4 rounded-r-lg">
        <h2 className="font-medium text-lacuna-plum text-lg">Observed deal patterns (verified)</h2>
        <p className="text-sm text-lacuna-blue mt-1">
          This view reports counts from {totalDeals} verified transactions. Causal effect estimates
          with confidence intervals require a longitudinal panel not included in the public dataset.
        </p>
      </div>

      <div className="bg-white border border-lacuna-lavender/40 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-lacuna-pink/15 text-lacuna-plum">
            <tr>
              <th className="text-left p-3 font-medium">Sector</th>
              <th className="text-right p-3 font-medium">Companies</th>
              <th className="text-right p-3 font-medium">In verified deals</th>
              <th className="text-right p-3 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((row) => (
              <tr key={row.sector} className="border-t border-lacuna-lavender/30">
                <td className="p-3 text-lacuna-plum">{row.sector}</td>
                <td className="p-3 text-right text-lacuna-blue">{row.companies}</td>
                <td className="p-3 text-right text-lacuna-blue">{row.acquired}</td>
                <td className="p-3 text-right font-medium text-lacuna-plum">
                  {(row.rate * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
