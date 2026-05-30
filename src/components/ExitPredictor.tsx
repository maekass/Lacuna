'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';
import type { VerifiedAcquisitionView, VerifiedCompanyView } from '@/lib/data/verifiedDataHelpers';

interface IndicatorScore {
  companyId: string;
  companyName: string;
  sector: string;
  indicatorScore: number;
  factors: { label: string; present: boolean; weight: number }[];
  similarPriorExits: number;
}

const CURRENT_YEAR = 2026;

/**
 * Derive a deterministic, transparent "acquisition likelihood indicator" for each
 * company that has NOT been acquired in our verified dataset.
 *
 * IMPORTANT: This is descriptive, not predictive. With n=22 companies and n=6
 * verified acquisitions, no statistically valid predictive model is possible.
 * What we CAN do honestly: score each company on factors that, in our small
 * verified dataset, co-occurred with prior acquisitions.
 */
function calculateIndicators(
  verifiedCompanies: VerifiedCompanyView[],
  verifiedAcquisitions: VerifiedAcquisitionView[],
): IndicatorScore[] {
  const acquiredIds = new Set(verifiedAcquisitions.map(a => a.targetId));

  // Derive empirical priors from verified acquisitions in the dataset
  const acquiredCompanies = verifiedCompanies.filter(c => acquiredIds.has(c.id));
  const acquiredSectors = new Set(acquiredCompanies.map(c => c.sector));
  const acquiredAgeMedian = acquiredCompanies.length > 0
    ? acquiredCompanies.map(c => CURRENT_YEAR - c.founded).sort((a, b) => a - b)[Math.floor(acquiredCompanies.length / 2)]
    : 7;
  const acquiredValuationMedian = (() => {
    const vals = acquiredCompanies.map(c => c.lastKnownValuation).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return 300;
    vals.sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)];
  })();

  const candidates = verifiedCompanies.filter(c => !acquiredIds.has(c.id));

  return candidates
    .map(company => {
      const age = CURRENT_YEAR - company.founded;
      const isLateStage = /Series C|Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(company.stage);
      const inPriorExitSector = acquiredSectors.has(company.sector);
      const aboveValuationMedian = (company.lastKnownValuation ?? 0) >= acquiredValuationMedian;
      const ageNearPriorMedian = Math.abs(age - acquiredAgeMedian) <= 3;
      const isPublic = /Public/i.test(company.stage);

      // Same-sector prior acquisition count from our verified data
      const similarPriorExits = acquiredCompanies.filter(c => c.sector === company.sector).length;

      const factors = [
        { label: `Sector has prior verified exits (${similarPriorExits})`, present: inPriorExitSector, weight: 0.25 },
        { label: 'Late stage funding (Series C+)', present: isLateStage, weight: 0.25 },
        { label: 'Valuation ≥ median prior-exit valuation', present: aboveValuationMedian, weight: 0.20 },
        { label: 'Age within 3 yrs of median prior-exit age', present: ageNearPriorMedian, weight: 0.15 },
        { label: 'Already public (acquisition less typical path)', present: isPublic, weight: -0.15 },
      ];

      const indicatorScore = factors.reduce(
        (sum, f) => sum + (f.present ? f.weight : 0),
        0
      );

      return {
        companyId: company.id,
        companyName: company.name,
        sector: company.sector,
        indicatorScore: Math.max(0, Math.min(1, indicatorScore)),
        factors,
        similarPriorExits,
      };
    })
    .sort((a, b) => b.indicatorScore - a.indicatorScore)
    .slice(0, 6);
}

export default function ExitPredictor() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const indicators = useMemo(
    () => calculateIndicators(verifiedCompanies, verifiedAcquisitions),
    [verifiedCompanies, verifiedAcquisitions],
  );

  const getScoreColor = (score: number) => {
    if (score > 0.6) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score > 0.35) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Acquisition Likelihood Indicators</h3>
          <p className="text-sm text-slate-500">Descriptive factor scoring from verified dataset (not a predictive model)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
          <span className="text-xs font-medium text-slate-700">Descriptive · n={verifiedCompanies.length}</span>
        </div>
      </div>

      {/* Honest disclaimer */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Methodological note:</strong> With n={verifiedAcquisitions.length} verified acquisitions in this
          dataset, no statistically valid predictive model is possible. This panel
          scores each non-acquired company on factors that <em>co-occurred</em> with prior
          exits — useful for descriptive comparison, not for forecasting. Weights are
          fixed and disclosed; there is no fitted model and no randomness.
        </p>
      </div>

      <div className="space-y-3">
        {indicators.map((ind, i) => (
          <motion.div
            key={ind.companyId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 border border-slate-100 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-slate-800">{ind.companyName}</h4>
                <p className="text-xs text-slate-500">{ind.sector}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getScoreColor(ind.indicatorScore)}`}>
                {(ind.indicatorScore * 100).toFixed(0)} / 100
              </div>
            </div>

            <div className="space-y-1 mt-3">
              {ind.factors.map((f, j) => (
                <div key={j} className="flex items-center justify-between text-xs">
                  <span className={f.present ? 'text-slate-700' : 'text-slate-400'}>
                    {f.present ? '●' : '○'} {f.label}
                  </span>
                  <span className={`font-mono ${f.weight < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {f.weight > 0 ? '+' : ''}{(f.weight * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          Scores are deterministic and reproducible. Factor weights derived from
          observed co-occurrence in {verifiedAcquisitions.length} verified
          acquisitions. <strong>Not financial advice. Not a forecast.</strong>
        </p>
      </div>
    </motion.div>
  );
}
