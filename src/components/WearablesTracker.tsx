'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { verifiedCompanies, verifiedAcquisitions } from '@/data/verifiedData';

export default function WearablesTracker() {
  const wearablesData = useMemo(() => {
    const wearables = verifiedCompanies.filter(c => c.sector === 'Wearables');
    const wearablesWithValuation = wearables.filter(
      (c): c is typeof wearables[number] & { lastKnownValuation: number } =>
        typeof c.lastKnownValuation === 'number'
    );

    const totalDisclosedValuation = wearablesWithValuation.reduce(
      (sum, c) => sum + c.lastKnownValuation,
      0
    );
    const medianValuation = wearablesWithValuation.length > 0
      ? wearablesWithValuation
          .map(c => c.lastKnownValuation)
          .sort((a, b) => a - b)[Math.floor(wearablesWithValuation.length / 2)]
      : 0;

    const wearableAcquisitions = verifiedAcquisitions.filter(a => {
      const target = verifiedCompanies.find(c => c.id === a.targetId);
      return target?.sector === 'Wearables';
    });

    return {
      companies: wearables,
      withValuation: wearablesWithValuation.length,
      totalDisclosedValuation,
      medianValuation,
      acquisitionCount: wearableAcquisitions.length,
    };
  }, []);

  if (wearablesData.companies.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-semibold text-slate-800">Wearables Ecosystem</h3>
        <p className="text-sm text-slate-500 mt-2">
          No companies in this sector are in the verified dataset yet.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Wearables Ecosystem</h3>
          <p className="text-sm text-slate-500 mt-1">
            Verified women&apos;s-health wearables tracked in this dataset
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
          <span className="text-sm font-medium text-purple-700">
            {wearablesData.companies.length} companies
          </span>
        </div>
      </div>

      {/* Stats Grid — only what we can verify */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            ${(wearablesData.totalDisclosedValuation / 1000).toFixed(1)}B
          </p>
          <p className="text-xs text-slate-600 mt-1">Sum of disclosed valuations</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {wearablesData.withValuation}/{wearablesData.companies.length} companies
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            ${wearablesData.medianValuation}M
          </p>
          <p className="text-xs text-slate-600 mt-1">Median disclosed valuation</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Among those with public data</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            {wearablesData.acquisitionCount}
          </p>
          <p className="text-xs text-slate-600 mt-1">Verified acquisitions</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In this sector</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            {wearablesData.companies.length - wearablesData.withValuation}
          </p>
          <p className="text-xs text-slate-600 mt-1">Undisclosed valuations</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Honestly tracked as gaps</p>
        </div>
      </div>

      {/* Company List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Companies
        </h4>

        {wearablesData.companies.map((company, i) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{company.name}</span>
                <span className="text-xs px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200">
                  {company.hq}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{company.description}</p>
            </div>
            <div className="text-right ml-4">
              {typeof company.lastKnownValuation === 'number' ? (
                <p className="font-semibold text-slate-700">${company.lastKnownValuation}M</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Not disclosed</p>
              )}
              <p className="text-xs text-slate-400">{company.stage}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
        All figures sourced from press releases, Crunchbase, and company filings.
        Valuations reflect the last publicly disclosed round and may not represent
        current market value. Companies without a public valuation are listed
        without one rather than estimated.
      </div>
    </motion.div>
  );
}
