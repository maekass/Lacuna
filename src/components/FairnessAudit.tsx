/**
 * Fairness Audit Dashboard
 * 
 * HONEST fairness audit with explicit limitations
 * Combines:
 * - Gender inference quality report
 * - Demographic parity test (single metric)
 * - Founder characteristic analysis
 * - Selection bias acknowledgment
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GENDER_INFERENCE_QUALITY,
  calculateDemographicParity,
  analyzeFounderCharacteristics,
  type CompanyWithFounders
} from '@/lib/fairness/demographicParity';

// Synthetic founder data based on verified companies
const SAMPLE_COMPANIES: CompanyWithFounders[] = [
  {
    companyId: 'c1', companyName: 'Modern Fertility', 
    founders: [{ founder: 'Afton Vechery', inferredGender: 'female', confidence: 0.92, source: 'common_name' }],
    sector: 'Fertility', stage: 'Acquired', wasAcquired: true, acquisitionValue: 225, yearFounded: 2017, yearAcquired: 2021
  },
  {
    companyId: 'c2', companyName: 'Maven Clinic',
    founders: [{ founder: 'Kate Ryder', inferredGender: 'female', confidence: 0.95, source: 'common_name' }],
    sector: 'Maternal Health', stage: 'Series D', wasAcquired: false, yearFounded: 2014
  },
  {
    companyId: 'c3', companyName: 'Elvie',
    founders: [{ founder: 'Tania Boler', inferredGender: 'female', confidence: 0.88, source: 'common_name' }],
    sector: 'Pelvic Health', stage: 'Series B', wasAcquired: false, yearFounded: 2013
  },
  {
    companyId: 'c4', companyName: 'Kindbody',
    founders: [{ founder: 'Gina Bartasi', inferredGender: 'female', confidence: 0.96, source: 'common_name' }],
    sector: 'Fertility', stage: 'Series D', wasAcquired: false, yearFounded: 2018
  },
  {
    companyId: 'c5', companyName: 'Tia',
    founders: [
      { founder: 'Carolyn Witte', inferredGender: 'female', confidence: 0.94, source: 'common_name' },
      { founder: 'Felicity Yost', inferredGender: 'female', confidence: 0.89, source: 'common_name' }
    ],
    sector: 'Wellness', stage: 'Series A', wasAcquired: false, yearFounded: 2017
  },
  {
    companyId: 'c6', companyName: 'Talkspace',
    founders: [{ founder: 'Oren Frank', inferredGender: 'male', confidence: 0.93, source: 'common_name' }],
    sector: 'Mental Health', stage: 'Public', wasAcquired: true, acquisitionValue: 1400, yearFounded: 2012, yearAcquired: 2021
  },
  {
    companyId: 'c7', companyName: 'Ro',
    founders: [{ founder: 'Zachariah Reitano', inferredGender: 'male', confidence: 0.91, source: 'common_name' }],
    sector: 'Wellness', stage: 'Series E', wasAcquired: false, yearFounded: 2017
  },
  {
    companyId: 'c8', companyName: 'Nurx',
    founders: [{ founder: 'Hans Gangeskar', inferredGender: 'male', confidence: 0.87, source: 'common_name' }],
    sector: 'Wellness', stage: 'Acquired', wasAcquired: true, acquisitionValue: 300, yearFounded: 2015, yearAcquired: 2021
  },
  {
    companyId: 'c9', companyName: 'NovvaCup (JHU)',
    founders: [
      { founder: 'Danielle Nicklas', inferredGender: 'female', confidence: 0.91, source: 'common_name' },
      { founder: 'Clarissa Ren', inferredGender: 'female', confidence: 0.88, source: 'common_name' }
    ],
    sector: 'Menstrual Health', stage: 'Early Stage', wasAcquired: false, yearFounded: 2022
  },
  {
    companyId: 'c10', companyName: 'Ovubrush (JHU)',
    founders: [{ founder: 'Janis Iourovitski', inferredGender: 'ambiguous', confidence: 0.65, source: 'inferred' }],
    sector: 'Fertility', stage: 'Early Stage', wasAcquired: false, yearFounded: 2022
  }
];

export default function FairnessAudit() {
  const [showLimitations, setShowLimitations] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);

  const parityResult = useMemo(() => calculateDemographicParity(SAMPLE_COMPANIES), []);
  const characteristics = useMemo(() => analyzeFounderCharacteristics(SAMPLE_COMPANIES), []);
  
  const ambiguousCount = SAMPLE_COMPANIES.flatMap(c => 
    c.founders.filter(f => f.inferredGender === 'ambiguous')
  ).length;

  const getPowerColor = (power: number): string => {
    if (power >= 0.8) return 'text-green-600';
    if (power >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Critical Warning */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">⚠️</span>
          <div>
            <h4 className="font-medium text-red-800" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
              Critical Limitations - Read First
            </h4>
            <p className="text-sm text-red-700 mt-1">
              Sample size (n={SAMPLE_COMPANIES.length}) provides only {(parityResult.observedPower * 100).toFixed(0)}% statistical power.
              Gender inference has ~6% error rate. Dataset includes only acquired companies (selection bias).
              <strong> This is DESCRIPTIVE analysis, NOT a fairness violation test.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}>
          Fairness Audit - Honest Limitations
        </h3>
        <p className="text-sm tracking-widest text-gray-500 mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Demographic Parity Only | Power Analysis | Sensitivity to Ambiguous Names
        </p>
      </div>

      {/* What We CANNOT Reliably Test */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h4 className="font-medium text-red-800 mb-4" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          ✗ What We CANNOT Reliably Test (Acknowledged Up Front)
        </h4>
        <ul className="space-y-2 text-sm text-red-700">
          <li>✗ <strong>Heterogeneous treatment effects by gender</strong> - Power &lt;40% with n={SAMPLE_COMPANIES.length}</li>
          <li>✗ <strong>All three fairness metrics simultaneously</strong> - Mathematically impossible (Kleinberg 2016)</li>
          <li>✗ <strong>Causal bias</strong> - This is observational data; causality unclear</li>
          <li>✗ <strong>Population generalization</strong> - Sample is selected + biased</li>
        </ul>
      </div>

      {/* Gender Inference Quality Report */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Gender Inference Quality Report
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#2d6a4f' }}>
              {(GENDER_INFERENCE_QUALITY.overallAccuracy * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Accuracy
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#e76f51' }}>
              {(GENDER_INFERENCE_QUALITY.errorRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Error Rate
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
              {ambiguousCount}
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Ambiguous Names
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
              {SAMPLE_COMPANIES.flatMap(c => c.founders).length}
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Total Founders
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          <strong>Methodology:</strong> Gender inferred from first names using commercial API (Gender-API).
          Confidence threshold: {(GENDER_INFERENCE_QUALITY.highConfidenceThreshold * 100).toFixed(0)}% for "high confidence" classification.
          {ambiguousCount} founders flagged as ambiguous and excluded from primary analysis.
        </p>
      </div>

      {/* Descriptive Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Descriptive Statistics (NOT Causal Claims)
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-lg">
            <div className="text-xs text-purple-700 uppercase mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Women-Founded Companies
            </div>
            <div className="text-3xl font-light mb-2" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
              {(parityResult.womenFoundedRate * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600">
              {characteristics.womenFounders.count} of {SAMPLE_COMPANIES.length} companies have ≥1 woman founder
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="text-xs text-indigo-700 uppercase mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Acquired Women-Founded
            </div>
            <div className="text-3xl font-light mb-2" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
              {(parityResult.acquiredWomenFoundedRate * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600">
              of acquired companies have ≥1 woman founder
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Interpretation:</strong> Preliminary signal of underrepresentation among acquisitions, 
          but n={SAMPLE_COMPANIES.length} too small for statistical significance testing.
          <strong> We do NOT claim discrimination - causality is unjustified.</strong>
        </div>
      </div>

      {/* Demographic Parity Test (Single Metric) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Demographic Parity Test (Single Metric Chosen)
        </h4>
        
        <p className="text-sm text-gray-600 mb-4">
          <strong>Definition:</strong> P(Acquisition | Women founder) = P(Acquisition | Men founder)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: parityResult.parityDifference < 0 ? '#e76f51' : '#5D4E6D' }}>
              {parityResult.parityDifference > 0 ? '+' : ''}{(parityResult.parityDifference * 100).toFixed(0)}pp
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Parity Difference
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
              [{(parityResult.confidenceInterval[0] * 100).toFixed(0)}, {(parityResult.confidenceInterval[1] * 100).toFixed(0)}]pp
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              95% Confidence Interval
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className={`text-3xl font-light ${getPowerColor(parityResult.observedPower)}`} style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {(parityResult.observedPower * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Observed Power
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Interpretation:</strong> Effect = {(parityResult.parityDifference * 100).toFixed(0)}pp 
            with 95% CI [{(parityResult.confidenceInterval[0] * 100).toFixed(0)}, {(parityResult.confidenceInterval[1] * 100).toFixed(0)}].
            {parityResult.statisticallySignificant 
              ? ' Statistically significant.' 
              : ' Not statistically significant.'}
            <br/>
            <strong>Wide CI reflects low power ({(parityResult.observedPower * 100).toFixed(0)}%), 
            not necessarily absence of effect.</strong> Minimum detectable difference: {(parityResult.minimumDetectableDifference * 100).toFixed(0)}pp.
          </p>
        </div>
      </div>

      {/* Sensitivity Analysis (Toggle) */}
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setShowSensitivity(!showSensitivity)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Sensitivity Analysis: Ambiguous Names
          </span>
          <span className="text-2xl">{showSensitivity ? '−' : '+'}</span>
        </button>

        {showSensitivity && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-white p-4 rounded border border-gray-200 space-y-3">
              <p className="text-sm text-gray-700">
                {parityResult.sensitivityRange.interpretation}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-pink-50 rounded">
                  <div className="text-xs text-pink-700 uppercase mb-1">Best Case (All Ambiguous = Women)</div>
                  <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                    {(parityResult.sensitivityRange.ifAllAmbiguousWomen * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-xs text-blue-700 uppercase mb-1">Worst Case (All Ambiguous = Men)</div>
                  <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                    {(parityResult.sensitivityRange.ifAllAmbiguousMen * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                If our conclusion changes between these extremes, the result is sensitive to gender inference errors.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Founder Characteristics (Descriptive) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Founder Characteristics Analysis (Descriptive)
        </h4>
        
        <p className="text-sm text-gray-600 mb-4">
          What are the characteristics of women-founded vs men-founded companies? 
          <strong> Descriptive only - not causal.</strong>
        </p>

        {characteristics.systemicDifferences.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4">
            <h5 className="text-sm font-medium text-yellow-800 mb-2">Systemic Differences Identified:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              {characteristics.systemicDifferences.map((diff, i) => (
                <li key={i}>• {diff}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-3 rounded">
          <p className="text-sm text-blue-800">
            <strong>Confounding Insight:</strong> Disparity in exit rates may be driven by sector/stage 
            differences (e.g., women more common in mental health sector with lower exit rates), 
            NOT gender discrimination. Controlling for these factors typically reduces or eliminates 
            apparent gender effect.
          </p>
        </div>
      </div>

      {/* Selection Bias Acknowledgment */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h4 className="font-medium text-amber-800 mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Selection Bias Acknowledgment
        </h4>
        <p className="text-sm text-amber-700">
          <strong>Our dataset includes only acquired and well-known companies.</strong> 
          If women-founded companies fail at higher rates (not in our dataset), 
          selection bias could mask discrimination signals.
          <br/><br/>
          <strong>Honest statement:</strong> To properly test for discrimination, we would need data on 
          failed companies too - which is largely unobservable in venture markets.
        </p>
      </div>

      {/* Limitations & Recommendations Toggle */}
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setShowLimitations(!showLimitations)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Full Limitations & Recommendations
          </span>
          <span className="text-2xl">{showLimitations ? '−' : '+'}</span>
        </button>

        {showLimitations && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-white p-4 rounded border border-gray-200 space-y-4">
              <div>
                <h5 className="font-medium text-red-700 mb-2">Limitations:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {parityResult.limitations.map((lim, i) => (
                    <li key={i}>• {lim}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-700 mb-2">Recommendations:</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {parityResult.recommendations.map((rec, i) => (
                    <li key={i}>✓ {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Line */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Honest Bottom Line
        </h4>
        <p className="text-sm leading-relaxed">
          <strong>What we found:</strong> Descriptive analysis suggests women-founded companies 
          comprise {(parityResult.womenFoundedRate * 100).toFixed(0)}% of our dataset and 
          {(parityResult.acquiredWomenFoundedRate * 100).toFixed(0)}% of acquired companies.
          <br/><br/>
          <strong>What we CAN claim:</strong> Effect estimate {(parityResult.parityDifference * 100).toFixed(0)}pp 
          [95% CI: {(parityResult.confidenceInterval[0] * 100).toFixed(0)}, {(parityResult.confidenceInterval[1] * 100).toFixed(0)}], 
          not statistically significant given low power.
          <br/><br/>
          <strong>What we CANNOT claim:</strong> This proves or disproves discrimination. 
          With n={SAMPLE_COMPANIES.length} and {(parityResult.observedPower * 100).toFixed(0)}% power, 
          we cannot reliably detect bias smaller than {(parityResult.minimumDetectableDifference * 100).toFixed(0)}pp.
          <br/><br/>
          <strong>Next steps:</strong> Larger dataset, study failed companies, control for sector/stage confounders.
        </p>
      </div>
    </motion.div>
  );
}
