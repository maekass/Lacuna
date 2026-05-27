'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { companies } from '@/data/maDeals';

export default function CompanySimilarity() {
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0]?.id || '');

  const similarities = useMemo(() => {
    const target = companies.find(c => c.id === selectedCompany);
    if (!target) return [];

    // Compute cosine similarity based on features
    const targetVector = [
      target.sector === 'Fertility' ? 1 : 0,
      target.sector === 'Mental Health' ? 1 : 0,
      target.sector === 'Wearables' ? 1 : 0,
      target.sector === 'General Wellness' ? 1 : 0,
      target.sector === 'Pelvic Health' ? 1 : 0,
      target.valuation ? Math.log(target.valuation) / 10 : 0,
      target.employees / 1000,
      ['Late Stage', 'Pre-IPO'].includes(target.stage) ? 1 : 0.5,
    ];

    return companies
      .filter(c => c.id !== selectedCompany)
      .map(company => {
        const vector = [
          company.sector === 'Fertility' ? 1 : 0,
          company.sector === 'Mental Health' ? 1 : 0,
          company.sector === 'Wearables' ? 1 : 0,
          company.sector === 'General Wellness' ? 1 : 0,
          company.sector === 'Pelvic Health' ? 1 : 0,
          company.valuation ? Math.log(company.valuation) / 10 : 0,
          company.employees / 1000,
          ['Late Stage', 'Pre-IPO'].includes(company.stage) ? 1 : 0.5,
        ];

        // Cosine similarity
        const dot = targetVector.reduce((sum, v, i) => sum + v * vector[i], 0);
        const magA = Math.sqrt(targetVector.reduce((sum, v) => sum + v * v, 0));
        const magB = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        const similarity = dot / (magA * magB);

        // Determine shared factors
        const shared: string[] = [];
        if (company.sector === target.sector) shared.push(`Same sector (${company.sector})`);
        if (Math.abs((company.valuation || 0) - (target.valuation || 0)) < 200) shared.push('Similar valuation range');
        if (company.stage === target.stage) shared.push(`Same stage (${company.stage})`);
        if (Math.abs(company.employees - target.employees) < 100) shared.push('Similar team size');

        return { company, similarity: isNaN(similarity) ? 0 : similarity, sharedFactors: shared };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }, [selectedCompany]);

  const selected = companies.find(c => c.id === selectedCompany);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Company Similarity Engine</h3>
          <p className="text-sm text-slate-500">Vector embeddings + cosine similarity analysis</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
          <span className="text-xs font-medium text-blue-700">ML-Matrix</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Company</label>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.sector}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="font-medium text-slate-800">{selected.name}</p>
          <p className="text-sm text-slate-500">{selected.sector} · {selected.stage} · ${selected.valuation}M</p>
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
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.sharedFactors.map((factor, j) => (
                  <span key={j} className="text-xs text-slate-500">• {factor}</span>
                ))}
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
        <p className="text-xs text-slate-400">
          Similarity computed using 8-dimensional feature vectors: sector encoding, 
          log(valuation), normalized employees, stage maturity. Cosine similarity metric.
        </p>
      </div>
    </motion.div>
  );
}
