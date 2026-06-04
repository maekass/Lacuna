/**
 * Observed deal timing from verified announcements (no simulated event-study curves).
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import CuratedDatasetBanner from '@/components/CuratedDatasetBanner';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

export default function TemporalValidation() {
  const { getVerifiedDealsByYear } = useVerifiedDataset();
  const dealsByYear = useMemo(() => getVerifiedDealsByYear(), [getVerifiedDealsByYear]);
  const maxCount = Math.max(1, ...dealsByYear.map((d) => d.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      <div className="bg-lacuna-pink/20 border-l-4 border-lacuna-blue p-4 rounded-r-lg">
        <h2 className="font-medium text-lacuna-plum text-lg">Deal announcement timing</h2>
        <p className="text-sm text-lacuna-blue mt-1">
          Counts are from verified press releases and SEC filings in the dataset. Event-study
          probability curves are not shown because we do not ship a synthetic panel.
        </p>
      </div>

      <div className="bg-white border border-lacuna-lavender/40 rounded-xl p-6">
        <div className="flex items-end gap-3 h-48">
          {dealsByYear.map((d) => (
            <div key={d.year} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t lacuna-gradient min-h-[4px]"
                style={{ height: `${(d.count / maxCount) * 100}%` }}
                title={`${d.count} deal(s)`}
              />
              <span className="text-xs text-lacuna-blue">{d.year}</span>
              <span className="text-sm font-medium text-lacuna-plum">{d.count}</span>
            </div>
          ))}
        </div>
        {dealsByYear.length === 0 && (
          <p className="text-center text-lacuna-blue text-sm py-8">No verified deals to chart.</p>
        )}
      </div>
    </motion.div>
  );
}
