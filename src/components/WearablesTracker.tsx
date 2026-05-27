'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { companies, acquisitions } from '@/data/maDeals';

interface WearableCompany {
  name: string;
  focus: string;
  stage: string;
  valuation: number;
  athleteRelevant: boolean;
}

export default function WearablesTracker() {
  const wearablesData = useMemo(() => {
    const wearableCompanies = companies.filter(c => c.sector === 'Wearables');
    
    const companiesWithDetails: WearableCompany[] = wearableCompanies.map(c => ({
      name: c.name,
      focus: c.description,
      stage: c.stage,
      valuation: c.valuation || 0,
      athleteRelevant: [
        'menstrual cycle', 'women\'s health', 'sleep', 'recovery', 
        'fertility', 'performance'
      ].some(term => c.description.toLowerCase().includes(term))
    }));

    const totalValuation = companiesWithDetails.reduce((sum, c) => sum + c.valuation, 0);
    const athleteFocused = companiesWithDetails.filter(c => c.athleteRelevant);
    
    // Find related acquisitions
    const wearableAcquisitions = acquisitions.filter(a => {
      const target = companies.find(c => c.id === a.targetId);
      return target?.sector === 'Wearables';
    });

    return {
      companies: companiesWithDetails,
      totalValuation,
      athleteFocusedCount: athleteFocused.length,
      acquisitionCount: wearableAcquisitions.length,
      avgValuation: companiesWithDetails.length > 0 ? totalValuation / companiesWithDetails.length : 0
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Wearables Ecosystem Tracker</h3>
          <p className="text-sm text-slate-500 mt-1">
            M&amp;A intelligence for women&apos;s health wearables — athlete performance &amp; biomarker tracking
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
          <span className="text-2xl">⌚</span>
          <span className="text-sm font-medium text-purple-700">
            {wearablesData.companies.length} Companies Tracked
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            ${(wearablesData.totalValuation / 1000).toFixed(1)}B
          </p>
          <p className="text-xs text-slate-600">Total Valuation</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            ${(wearablesData.avgValuation).toFixed(0)}M
          </p>
          <p className="text-xs text-slate-600">Average Valuation</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            {wearablesData.athleteFocusedCount}
          </p>
          <p className="text-xs text-slate-600">Athlete-Focused</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-slate-800">
            {wearablesData.acquisitionCount}
          </p>
          <p className="text-xs text-slate-600">Acquisitions</p>
        </div>
      </div>

      {/* Company List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Key Players in Women&apos;s Health Wearables
        </h4>
        
        {wearablesData.companies.map((company, i) => (
          <motion.div
            key={company.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{company.name}</span>
                {company.athleteRelevant && (
                  <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                    Athlete-Relevant
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{company.focus}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">${company.valuation}M</p>
              <p className="text-xs text-slate-400">{company.stage}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Investment Thesis */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Investment Thesis: Athlete-Specific Gaps</h4>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="font-medium text-purple-800">Menstrual Cycle Integration</p>
            <p className="text-xs text-purple-600 mt-1">
              Tracking performance through cycle phases — underfunded vs general fitness
            </p>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg">
            <p className="font-medium text-pink-800">ACL Prevention Analytics</p>
            <p className="text-xs text-pink-600 mt-1">
              2-8x higher rates in female athletes — limited predictive wearable tech
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg">
            <p className="font-medium text-rose-800">Postpartum Return-to-Play</p>
            <p className="text-xs text-rose-600 mt-1">
              Nearly zero wearables address this transition — massive whitespace
            </p>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-4 text-xs text-slate-400 italic">
        Data compiled from public sources. M&A tracking includes strategic investments 
        and acquisitions 2020-2024. Athlete-relevance flagged based on physiological tracking capabilities.
      </div>
    </motion.div>
  );
}
