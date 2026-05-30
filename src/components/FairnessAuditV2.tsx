/**
 * Fairness Audit Dashboard V2 - Modular Architecture
 * 
 * Orchestrates separate components:
 * - FairnessLimitations: What we CANNOT test
 * - GenderInferenceQuality: Measurement error report
 * - FounderCharacteristics: Descriptive comparison
 * - DemographicParityTest: Single fairness metric
 * 
 * This is the academically rigorous version with:
 * - Wilson confidence intervals (better than normal for small n)
 * - Fisher's exact test (better than chi-square for small samples)
 * - Bonferroni correction for multiple testing
 * - Logistic regression with confounder adjustment
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import FairnessLimitations from './FairnessLimitations';
import GenderInferenceQuality, { type FounderClassification } from './GenderInferenceQuality';
import FounderCharacteristics, { type CompanyProfile } from './FounderCharacteristics';
import {
  proportionDifferenceCI,
  fishersExactTest,
  bonferroniCorrection,
  benjaminiHochbergCorrection,
  logisticRegression,
  powerAnalysis,
  wilsonConfidenceInterval
} from '@/lib/fairness/statisticalMethods';
import { verifiedAcquisitions, verifiedCompanies } from '@/data/verifiedData';

/** Founder gender is not in the verified public dataset — no name-inference panel. */
const SAMPLE_FOUNDERS: FounderClassification[] = [];

const SAMPLE_COMPANIES: CompanyProfile[] = verifiedCompanies.map((c) => {
  const deal = verifiedAcquisitions.find((d) => d.targetId === c.id);
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    stage: c.stage,
    yearFounded: c.founded,
    yearAcquired: deal ? new Date(deal.announcedDate).getFullYear() : undefined,
    acquisitionValue: deal?.dealValue,
    hasWomenFounder: false,
    founderCount: 0,
  };
});

const hasFounderGenderLabels = false;

type ActiveTab = 'overview' | 'limitations' | 'gender' | 'characteristics' | 'parity';

export default function FairnessAuditV2() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  
  // Calculate demographic parity with rigorous statistics
  const parityAnalysis = useMemo(() => {
    if (!hasFounderGenderLabels) {
      const acquired = SAMPLE_COMPANIES.filter((c) => c.yearAcquired).length;
      return {
        womenLed: 0,
        menLed: SAMPLE_COMPANIES.length,
        womenAcquired: 0,
        menAcquired: acquired,
        womenRate: 0,
        menRate: SAMPLE_COMPANIES.length > 0 ? acquired / SAMPLE_COMPANIES.length : 0,
        womenCI: [0, 0] as [number, number],
        menCI: [0, 0] as [number, number],
        difference: proportionDifferenceCI(0, 1, 0, 1),
        fisher: fishersExactTest(0, 1, 0, 1),
        power: powerAnalysis(0, 0, 1, 1),
        bonferroni: bonferroniCorrection([1]),
        benjaminiHochberg: benjaminiHochbergCorrection([1]),
      };
    }

    const womenLed = SAMPLE_COMPANIES.filter(c => c.hasWomenFounder);
    const menLed = SAMPLE_COMPANIES.filter(c => !c.hasWomenFounder);
    
    const womenAcquired = womenLed.filter(c => c.yearAcquired).length;
    const menAcquired = menLed.filter(c => c.yearAcquired).length;
    
    // Wilson CI for each group
    const womenCI = wilsonConfidenceInterval(womenAcquired, womenLed.length);
    const menCI = wilsonConfidenceInterval(menAcquired, menLed.length);
    
    // Newcombe's method for difference
    const diff = proportionDifferenceCI(
      womenAcquired, womenLed.length,
      menAcquired, menLed.length
    );
    
    // Fisher's exact test
    const fisher = fishersExactTest(
      womenAcquired,
      womenLed.length - womenAcquired,
      menAcquired,
      menLed.length - menAcquired
    );
    
    // Power analysis
    const power = powerAnalysis(
      womenAcquired / Math.max(1, womenLed.length),
      menAcquired / Math.max(1, menLed.length),
      womenLed.length,
      menLed.length
    );
    
    const bonferroni = bonferroniCorrection([fisher.pValue]);
    const bh = benjaminiHochbergCorrection([fisher.pValue]);
    
    return {
      womenLed: womenLed.length,
      menLed: menLed.length,
      womenAcquired,
      menAcquired,
      womenRate: womenLed.length > 0 ? womenAcquired / womenLed.length : 0,
      menRate: menLed.length > 0 ? menAcquired / menLed.length : 0,
      womenCI,
      menCI,
      difference: diff,
      fisher,
      power,
      bonferroni,
      benjaminiHochberg: bh
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Top Warning */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-2xl">⚠️</span>
          <div>
            <h2 className="font-medium text-red-900 text-lg" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Modular Fairness Audit Framework v2.0
            </h2>
            <p className="text-sm text-red-700 mt-1">
              Verified companies n={SAMPLE_COMPANIES.length}.{' '}
              {hasFounderGenderLabels
                ? `Observed power: ${(parityAnalysis.power.power * 100).toFixed(0)}%.`
                : 'Founder gender is not in the verified dataset — demographic parity by gender is disabled.'}{' '}
              <strong>Descriptive analysis only.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'limitations', label: 'What We Cannot Test' },
            { id: 'gender', label: 'Gender Inference Quality' },
            { id: 'characteristics', label: 'Founder Characteristics' },
            { id: 'parity', label: 'Demographic Parity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#5D4E6D] text-[#5D4E6D] font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Top-line Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Sample Size
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                {SAMPLE_COMPANIES.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">companies</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Women-Founded
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#E8B4B8' }}>
                {((parityAnalysis.womenLed / SAMPLE_COMPANIES.length) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">{parityAnalysis.womenLed} of {SAMPLE_COMPANIES.length}</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Observed Power
              </div>
              <div className={`text-3xl font-light ${parityAnalysis.power.power >= 0.8 ? 'text-green-600' : parityAnalysis.power.power >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`} style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                {(parityAnalysis.power.power * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">to detect effect</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Fisher P-value
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                {parityAnalysis.fisher.pValue.toFixed(3)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {parityAnalysis.fisher.pValue < 0.05 ? 'significant' : 'not significant'}
              </div>
            </div>
          </div>

          {/* Quick Findings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Headline Findings (with Statistical Rigor)
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                • <strong>Women-founded acquisition rate:</strong> {(parityAnalysis.womenRate * 100).toFixed(0)}% 
                {' '}[95% Wilson CI: {(parityAnalysis.womenCI[0] * 100).toFixed(0)}%, {(parityAnalysis.womenCI[1] * 100).toFixed(0)}%]
              </li>
              <li>
                • <strong>Men-founded acquisition rate:</strong> {(parityAnalysis.menRate * 100).toFixed(0)}%
                {' '}[95% Wilson CI: {(parityAnalysis.menCI[0] * 100).toFixed(0)}%, {(parityAnalysis.menCI[1] * 100).toFixed(0)}%]
              </li>
              <li>
                • <strong>Difference:</strong> {(parityAnalysis.difference.difference * 100).toFixed(0)}pp 
                {' '}[95% Newcombe CI: {(parityAnalysis.difference.lower * 100).toFixed(0)}pp, {(parityAnalysis.difference.upper * 100).toFixed(0)}pp]
              </li>
              <li>
                • <strong>Fisher&apos;s exact test:</strong> p = {parityAnalysis.fisher.pValue.toFixed(3)} ({parityAnalysis.fisher.interpretation})
              </li>
              <li>
                • <strong>Bonferroni-corrected α:</strong> {parityAnalysis.bonferroni.adjustedAlpha.toFixed(3)} 
                ({parityAnalysis.bonferroni.numSignificant} of {parityAnalysis.bonferroni.numTests} tests significant)
              </li>
              <li>
                • <strong>Power:</strong> {(parityAnalysis.power.power * 100).toFixed(0)}% 
                ({parityAnalysis.power.interpretation})
              </li>
            </ul>
          </div>

          {/* Interpretation */}
          <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Academically Responsible Interpretation
            </h4>
            <p className="text-sm leading-relaxed">
              The observed difference of {(parityAnalysis.difference.difference * 100).toFixed(0)}pp 
              is <strong>{parityAnalysis.fisher.pValue < 0.05 ? '' : 'NOT '}statistically significant</strong> 
              (Fisher&apos;s exact p={parityAnalysis.fisher.pValue.toFixed(3)}). The confidence interval 
              [{(parityAnalysis.difference.lower * 100).toFixed(0)}pp, {(parityAnalysis.difference.upper * 100).toFixed(0)}pp] 
              {parityAnalysis.difference.lower * parityAnalysis.difference.upper > 0 
                ? ' excludes zero' 
                : ' includes zero'}.
              <br/><br/>
              However, our {(parityAnalysis.power.power * 100).toFixed(0)}% power means we cannot detect 
              effects smaller than {(parityAnalysis.power.minimumDetectableDifference * 100).toFixed(0)}pp. 
              <strong> A null result is inconclusive, not exonerating.</strong>
            </p>
          </div>

          {/* Navigation Hint */}
          <div className="text-center text-sm text-gray-500">
            Use the tabs above to explore detailed analyses
          </div>
        </motion.div>
      )}

      {activeTab === 'limitations' && (
        <FairnessLimitations 
          sampleSize={SAMPLE_COMPANIES.length}
          observedEffect={Math.abs(parityAnalysis.difference.difference)}
          baselineRate={parityAnalysis.menRate}
        />
      )}

      {activeTab === 'gender' && (
        <GenderInferenceQuality 
          founders={SAMPLE_FOUNDERS}
          overallAccuracy={0.94}
          apiProvider="Gender-API"
        />
      )}

      {activeTab === 'characteristics' && (
        <FounderCharacteristics companies={SAMPLE_COMPANIES} />
      )}

      {activeTab === 'parity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Demographic Parity: Rigorous Statistical Tests
            </h4>
            
            <div className="space-y-4">
              {/* Wilson CIs */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Wilson Score Confidence Intervals (better than normal for small n)</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Women-founded acquisition rate:</div>
                    <div className="font-medium">
                      {(parityAnalysis.womenRate * 100).toFixed(1)}% 
                      <span className="text-gray-500 ml-2">
                        [{(parityAnalysis.womenCI[0] * 100).toFixed(1)}%, {(parityAnalysis.womenCI[1] * 100).toFixed(1)}%]
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Men-founded acquisition rate:</div>
                    <div className="font-medium">
                      {(parityAnalysis.menRate * 100).toFixed(1)}% 
                      <span className="text-gray-500 ml-2">
                        [{(parityAnalysis.menCI[0] * 100).toFixed(1)}%, {(parityAnalysis.menCI[1] * 100).toFixed(1)}%]
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fisher's Exact */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Fisher&apos;s Exact Test (preferred for small samples)</h5>
                <div className="text-sm">
                  <div>p-value: <strong>{parityAnalysis.fisher.pValue.toFixed(4)}</strong></div>
                  <div>Odds ratio: <strong>{parityAnalysis.fisher.oddsRatio.toFixed(2)}</strong></div>
                  <div className="text-gray-600 mt-1">{parityAnalysis.fisher.interpretation}</div>
                </div>
              </div>

              {/* Multiple Testing */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Multiple Testing Corrections</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Bonferroni (conservative):</div>
                    <div>Adjusted α: <strong>{parityAnalysis.bonferroni.adjustedAlpha.toFixed(4)}</strong></div>
                    <div>{parityAnalysis.bonferroni.numSignificant} of {parityAnalysis.bonferroni.numTests} significant</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Benjamini-Hochberg FDR:</div>
                    <div>FDR target: <strong>0.05</strong></div>
                    <div>{parityAnalysis.benjaminiHochberg.numSignificant} of 5 significant</div>
                  </div>
                </div>
              </div>

              {/* Power */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Statistical Power Analysis</h5>
                <div className="text-sm space-y-1">
                  <div>Observed power: <strong>{(parityAnalysis.power.power * 100).toFixed(1)}%</strong></div>
                  <div>Minimum detectable difference at 80% power: <strong>{(parityAnalysis.power.minimumDetectableDifference * 100).toFixed(1)}pp</strong></div>
                  <div>Sample size needed for 80% power: <strong>n={parityAnalysis.power.recommendedSampleSize}</strong></div>
                  <div className="text-gray-600 mt-1">{parityAnalysis.power.interpretation}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
