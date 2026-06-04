'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CuratedDatasetBanner from '@/components/CuratedDatasetBanner';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';
import type { VerifiedCompanyView } from '@/lib/data/verifiedDataHelpers';

const CURRENT_YEAR = 2026;

interface FeatureVector {
  readonly values: readonly number[];
  readonly hasValuation: boolean;
  readonly hasFunding: boolean;
}

function buildFeatureVector(company: VerifiedCompanyView, sectors: string[]): FeatureVector {
  const sectorOneHot = sectors.map(s => (company.sector === s ? 1 : 0));
  const hasValuation = typeof company.lastKnownValuation === 'number';
  const hasFunding = typeof company.totalFunding === 'number';

  const logVal = hasValuation ? Math.log10((company.lastKnownValuation as number) + 1) / 4 : 0;
  const logFund = hasFunding ? Math.log10((company.totalFunding as number) + 1) / 3 : 0;
  const ageNorm = Math.min(1, (CURRENT_YEAR - company.founded) / 15);
  const isLateStage = /Series C|Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(company.stage) ? 1 : 0;
  const isPublic = /Public/i.test(company.stage) ? 1 : 0;
  const isAcquired = /Acquired/i.test(company.stage) ? 1 : 0;

  return {
    values: [...sectorOneHot, logVal, logFund, ageNorm, isLateStage, isPublic, isAcquired],
    hasValuation,
    hasFunding,
  };
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  const denom = magA * magB;
  return denom === 0 ? 0 : dot / denom;
}

export default function CompanySimilarity() {
  const { verifiedCompanies } = useVerifiedDataset();
  const sectors = useMemo(
    () => Array.from(new Set(verifiedCompanies.map((c) => c.sector))).sort(),
    [verifiedCompanies],
  );
  const [selectedCompany, setSelectedCompany] = useState<string>(verifiedCompanies[0]?.id || '');

  const similarities = useMemo(() => {
    const target = verifiedCompanies.find(c => c.id === selectedCompany);
    if (!target) return [];

    const targetVec = buildFeatureVector(target, sectors);

    return verifiedCompanies
      .filter(c => c.id !== selectedCompany)
      .map(company => {
        const vec = buildFeatureVector(company, sectors);
        const similarity = cosineSimilarity(targetVec.values, vec.values);

        const shared: string[] = [];
        if (company.sector === target.sector) shared.push(`Same sector (${company.sector})`);
        if (company.stage === target.stage) shared.push(`Same stage`);
        if (targetVec.hasValuation && vec.hasValuation) {
          const ratio = Math.max(target.lastKnownValuation!, company.lastKnownValuation!) /
                        Math.min(target.lastKnownValuation!, company.lastKnownValuation!);
          if (ratio < 2) shared.push('Valuation within 2×');
        }
        if (Math.abs(company.founded - target.founded) <= 2) shared.push('Founded within 2 yrs');

        return {
          company,
          similarity: isNaN(similarity) ? 0 : similarity,
          sharedFactors: shared,
          dataCompleteness: (vec.hasValuation ? 1 : 0) + (vec.hasFunding ? 1 : 0),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }, [selectedCompany, verifiedCompanies, sectors]);

  const selected = verifiedCompanies.find(c => c.id === selectedCompany);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Company Similarity Engine</h3>
          <p className="text-sm text-slate-500">Cosine similarity over verified features (sector, valuation, funding, age, stage)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
          <span className="text-xs font-medium text-blue-700">n={verifiedCompanies.length}</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Company</label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          {verifiedCompanies.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.sector}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="font-medium text-slate-800">{selected.name}</p>
          <p className="text-sm text-slate-500">
            {selected.sector} · {selected.stage}
            {selected.lastKnownValuation && ` · $${selected.lastKnownValuation}M valuation`}
            {selected.totalFunding && ` · $${selected.totalFunding}M raised`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Most Similar Companies</h4>
        {similarities.map((result, i) => (
          <motion.div
            key={result.company.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 border border-slate-100 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{result.company.name}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {result.company.sector}
                </span>
                {result.dataCompleteness < 2 && (
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded" title="Some financial fields not publicly disclosed">
                    partial data
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.sharedFactors.length > 0 ? (
                  result.sharedFactors.map((factor, j) => (
                    <span key={j} className="text-xs text-slate-500">• {factor}</span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No structural overlap</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-pink-600">
                {(result.similarity * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400">similarity</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          Feature vector: {sectors.length} sector one-hot dims + log(valuation) +
          log(funding) + normalized age + stage flags. Cosine similarity.
          Companies with undisclosed financials default to 0 on those dims (penalizes match) — flagged as &quot;partial data&quot;.
        </p>
      </div>
    </motion.div>
  );
}
