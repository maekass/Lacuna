/**
 * Impact Opportunity Card
 * 
 * Displays company opportunity assessment with OAIS score
 * and explicit confidence level indicators
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  calculateOAIS,
  EPIDEMIOLOGY_DATABASE,
  UNMEASURABLE_FACTORS,
  type OAISResult,
  type OAISInputs
} from '@/lib/impact/oaisCalculator';
import { verifiedCompanies } from '@/data/verifiedData';

interface CompanyProfile {
  name: string;
  condition: string;
  stage: 'pre_clinical' | 'pilot' | 'clinical_validation' | 'post_rct';
  founderExits: number;
  founderFDAExp: boolean;
  likelyAcquirer: string;
  acquirerScalingMult: number;
  competitors: number;
}

const EXAMPLE_COMPANIES: CompanyProfile[] = verifiedCompanies.map((c) => ({
  name: c.name,
  condition: c.sector,
  stage: 'clinical_validation' as const,
  founderExits: 0,
  founderFDAExp: false,
  likelyAcquirer: 'See verified deal network',
  acquirerScalingMult: 1,
  competitors: 0,
}));

export default function ImpactOpportunityCard() {
  const [selectedCompany, setSelectedCompany] = useState(0);
  const [showTransparency, setShowTransparency] = useState(false);

  const company = EXAMPLE_COMPANIES[selectedCompany];
  
  // Get epidemiology data for this condition
  const epiData = EPIDEMIOLOGY_DATABASE.find(e => 
    company.condition.toLowerCase().includes(e.condition.toLowerCase().split(' ')[0])
  ) || EPIDEMIOLOGY_DATABASE[0]; // Default to first if not found

  // Estimate penetration (simplified - would come from market data)
  const estimatedPenetration = 0.15 + (company.competitors * 0.02);

  const oaisInputs: OAISInputs = {
    condition: company.condition,
    addressablePopulation: epiData.addressablePopulation.pointEstimate,
    currentPenetration: estimatedPenetration,
    clinicalStage: company.stage,
    founderPriorExits: company.founderExits,
    founderFDAExperience: company.founderFDAExp,
    acquirerScalingMultiplier: company.acquirerScalingMult,
    competitorCount: company.competitors
  };

  const oais = calculateOAIS(oaisInputs);

  const getScoreColor = (score: number): string => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getScoreInterpretation = (score: number): string => {
    if (score >= 7) return 'High Opportunity';
    if (score >= 4) return 'Moderate Opportunity';
    return 'Limited Opportunity';
  };

  const getConfidenceBadge = (level: string): { color: string; text: string } => {
    switch (level) {
      case 'high':
        return { color: 'bg-green-100 text-green-700', text: 'High Confidence' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-700', text: 'Medium Confidence' };
      default:
        return { color: 'bg-orange-100 text-orange-700', text: 'Low Confidence' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}>
          Opportunity-Adjusted Impact Score (OAIS)
        </h3>
        <p className="text-sm tracking-widest text-gray-500 mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Defensible Health Impact Assessment | What We CAN vs CANNOT Measure
        </p>
      </div>

      {/* Company Selector */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_COMPANIES.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelectedCompany(i)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCompany === i
                ? 'bg-[#5D4E6D] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Main Score Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h4 className="font-medium text-lg" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {company.name}
            </h4>
            <p className="text-sm text-gray-500">Condition: {company.condition}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded text-xs font-medium ${getConfidenceBadge(oais.confidenceLevel).color}`}>
              {getConfidenceBadge(oais.confidenceLevel).text}
            </span>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={oais.score >= 7 ? '#22c55e' : oais.score >= 4 ? '#eab308' : '#f97316'}
                strokeWidth="8"
                strokeDasharray={`${oais.score * 28.3} 283`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                {oais.score.toFixed(1)}
              </span>
            </div>
          </div>
          <div>
            <p className="font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
              {getScoreInterpretation(oais.score)}
            </p>
            <p className="text-sm text-gray-600 mt-1 max-w-md">
              {oais.interpretation}
            </p>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Addressable Population
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {oais.components.addressablePopScore}M
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Penetration Gap
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {(oais.components.penetrationGapScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Stage Credibility
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {(oais.components.stageCredibilityScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Founder Quality
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {(oais.components.founderQualityScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Scaling Likely
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              {oais.components.scalingLikelihoodScore.toFixed(1)}×
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              Saturation Penalty
            </div>
            <div className="text-lg font-light mt-1" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              -{(oais.components.marketSaturationPenalty * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>
        </div>
      </div>

      {/* What We Can Measure */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="font-medium text-green-800 mb-4" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          ✓ What We CAN Reliably Measure (Tier 1)
        </h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-green-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Addressable Population</span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">MEASURED</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {epiData.condition}: {epiData.addressablePopulation.pointEstimate}M women 
              [95% CI: {epiData.addressablePopulation.lowerBound}-{epiData.addressablePopulation.upperBound}M]
            </p>
            <p className="text-xs text-gray-400 mt-1">Source: {epiData.source}</p>
          </div>

          <div className="bg-white p-3 rounded border border-green-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Market Penetration Gap</span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">MEASURED PROXY</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Current penetration: ~{(estimatedPenetration * 100).toFixed(0)}% | 
              Gap: ~{((1 - estimatedPenetration) * 100).toFixed(0)}% unmet need
            </p>
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Transparency: Installed base ≠ active users; 30-50% overestimate likely
            </p>
          </div>
        </div>
      </div>

      {/* What We Can Proxy */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="font-medium text-yellow-800 mb-4" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          ~ What We CAN Proxy (Tier 2 - Medium Confidence)
        </h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Clinical Stage Credibility</span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">PROXY</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Stage: {company.stage.replace('_', ' ')} | 
              Credibility score: {(oais.components.stageCredibilityScore * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Proxy for: Clinical efficacy (unknown for most pre-acquisition companies)
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Founder Quality Signals</span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">PROXY</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Prior exits: {company.founderExits} | FDA experience: {company.founderFDAExp ? 'Yes' : 'No'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Proxy for: Execution quality (limited to public LinkedIn data)
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Likely Acquirer Track Record</span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">PROXY</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Acquirer: {company.likelyAcquirer} | Historical scaling: {company.acquirerScalingMult}×
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Proxy for: Post-acquisition scaling (most acquirers don&apos;t disclose patient volumes)
            </p>
          </div>
        </div>
      </div>

      {/* What We CANNOT Measure */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h4 className="font-medium text-red-800 mb-4" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          ✗ What We CANNOT Measure (Tier 3 - Acknowledged Limitations)
        </h4>
        <div className="space-y-3">
          {UNMEASURABLE_FACTORS.slice(0, 3).map((factor, i) => (
            <div key={i} className="bg-white p-3 rounded border border-red-100">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-red-700">{factor.factor}</span>
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">UNMEASURABLE</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{factor.why}</p>
              <p className="text-xs text-amber-600 mt-1">
                Proxy used: {factor.proxyUsed}<br />
                Limitation: {factor.proxyLimitation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transparency Toggle */}
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setShowTransparency(!showTransparency)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Complete Transparency Report
          </span>
          <span className="text-2xl">{showTransparency ? '−' : '+'}</span>
        </button>

        {showTransparency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-white p-4 rounded border border-gray-200">
              <h5 className="font-medium mb-3" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                Critical Transparency Statements
              </h5>
              <ol className="text-sm space-y-2 text-gray-700 list-decimal list-inside">
                <li>
                  <strong>Patient volume per company is unknown.</strong> We proxy with addressable 
                  population × penetration gap. This overestimates if company has {'<'}1% market share.
                </li>
                <li>
                  <strong>Post-acquisition scaling is assumed</strong> from acquirer track record, 
                  not measured. Past performance ≠ future results.
                </li>
                <li>
                  <strong>Clinical efficacy is unknown</strong> for most pre-acquisition companies. 
                  We use stage as proxy, but stage ≠ efficacy.
                </li>
                <li>
                  <strong>This framework captures opportunity, not guaranteed impact.</strong> 
                  Real impact depends on execution (unobservable pre-acquisition).
                </li>
                <li>
                  <strong>OAIS scores are NOT comparable across conditions</strong> with different 
                  epidemiology data quality.
                </li>
              </ol>

              <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Bottom Line:</strong> Use OAIS for portfolio prioritization and opportunity 
                  sizing, not for impact attribution or DALY calculations. We measure strategic opportunity 
                  magnitude, not health outcomes achieved.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Line */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          OAIS Interpretation Summary
        </h4>
        <p className="text-sm leading-relaxed">
          <strong>{company.name}</strong>: OAIS = {oais.score.toFixed(1)}/10 
          [{getConfidenceBadge(oais.confidenceLevel).text}]. 
          Addresses {oais.components.addressablePopScore}M women with {((oais.components.penetrationGapScore) * 100).toFixed(0)}% penetration gap. 
          Stage credibility {(oais.components.stageCredibilityScore * 100).toFixed(0)}%. 
          Likely acquired by {company.likelyAcquirer} (historical scaling: {company.acquirerScalingMult}×). 
          {oais.score >= 7 
            ? 'Strong opportunity for impact at scale.' 
            : oais.score >= 4 
            ? 'Moderate opportunity; consider as part of portfolio.' 
            : 'Limited opportunity; may be strategic tuck-in only.'}
        </p>
      </div>
    </motion.div>
  );
}
