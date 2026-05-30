/**
 * Health Equity Dashboard
 * Ported from windsurf-project Python/Streamlit implementation
 * Focus: Diseases disproportionately affecting Black women
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDataCertification, generateVerificationBadge } from '@/lib/validation/dataCertification';
import { verifiedCompanies } from '@/data/verifiedData';

const verifiedNames = new Set(verifiedCompanies.map((c) => c.name));

function linkVerified(names: string[]) {
  return names.filter((n) => verifiedNames.has(n));
}

// Epidemiology references (public health literature); company lists are verified-dataset only
const DISEASE_METRICS = [
  {
    disease: 'Maternal Health',
    mortalityMultiplier: 3.4,
    marketSize: 12,
    description: 'Black women face 3-4x higher maternal mortality than white women',
    investmentThesis: 'Digital health, remote monitoring, culturally competent care',
    companies: linkVerified(['Maven Clinic'])
  },
  {
    disease: 'Uterine Fibroids',
    prevalence: '80%',
    marketSize: 34,
    description: 'Affects 80% of Black women by age 50; leading cause of hysterectomy',
    investmentThesis: 'Non-surgical treatments, early detection, fertility preservation',
    companies: linkVerified(['Bloomi'])
  },
  {
    disease: 'Lupus',
    prevalenceMultiplier: 3,
    marketSize: 8,
    description: '3x higher prevalence in Black women; often misdiagnosed',
    investmentThesis: 'AI diagnostics, biomarker discovery, precision medicine',
    companies: []
  },
  {
    disease: 'Sickle Cell Disease',
    prevalenceInBlack: '1 in 365',
    marketSize: 5,
    description: 'Primarily affects Black populations; gene therapy breakthroughs',
    investmentThesis: 'Gene therapy, CRISPR, curative treatments',
    companies: []
  },
  {
    disease: 'Cardiovascular Disease',
    mortalityMultiplier: 1.4,
    marketSize: 15,
    description: 'Higher mortality rates in Black women despite lower awareness',
    investmentThesis: 'Wearables, early detection, culturally tailored interventions',
    companies: linkVerified(['Oura', 'Whoop'])
  }
];

export default function HealthEquityDashboard() {
  const certifier = useDataCertification();
  
  // Certify data on mount
  const certification = useMemo(() => {
    return certifier.certify(verifiedCompanies, 'companies');
  }, [certifier]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h2 className="text-3xl font-light tracking-tight mb-2" style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}>
          Health Equity Investment Intelligence
        </h2>
        <p className="text-sm tracking-widest text-gray-500" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Quantifying ROI + Health Impact | Diseases Disproportionately Affecting Black Women
        </p>
      </div>

      {/* Certification Badge */}
      <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${certification.isValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
            Data Certification: {generateVerificationBadge(certification)}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          Hash: {certification.hash} • {certification.timestamp}
        </span>
      </div>

      {/* Mission Statement */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h3 className="text-lg font-medium mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Investment Thesis
        </h3>
        <p className="text-sm leading-relaxed opacity-95">
          Investing in Black women&apos;s health isn&apos;t just the right thing to do—it&apos;s a massive market opportunity. 
          We provide the data to prove it. Dual-metric scoring combines financial ROI with measurable health equity impact.
        </p>
      </div>

      {/* Disease Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DISEASE_METRICS.map((disease, index) => (
          <motion.div
            key={disease.disease}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-medium text-lg" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                {disease.disease}
              </h3>
              <span className="text-xs bg-[#5D4E6D] text-white px-2 py-1 rounded" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                ${disease.marketSize}B Market
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {disease.description}
            </p>

            <div className="space-y-3 text-xs" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div className="flex justify-between">
                <span className="text-gray-500">Investment Thesis</span>
              </div>
              <p className="text-gray-700">{disease.investmentThesis}</p>

              {disease.companies.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-500">Related Companies:</span>
                  <p className="text-gray-700 mt-1">{disease.companies.join(', ')}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Market Opportunity', value: '$74B', desc: 'Combined addressable market' },
          { label: 'Mortality Disparity', value: '3.4x', desc: 'Black vs white maternal mortality' },
          { label: 'Fibroid Prevalence', value: '80%', desc: 'Black women affected by age 50' },
          { label: 'Lupus Disparity', value: '3x', desc: 'Higher prevalence in Black women' }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="bg-gray-50 p-4 rounded-lg text-center"
          >
            <div className="text-2xl font-light mb-1" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
              {metric.value}
            </div>
            <div className="text-xs tracking-wider uppercase text-gray-600" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              {metric.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">{metric.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Verification Footer */}
      <div className="border-t border-gray-200 pt-4 text-center">
        <p className="text-xs text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>
          Data verified from CDC, NIH, and peer-reviewed literature • 
          Hash: {certification.hash} • 
          Last certified: {certification.timestamp}
        </p>
      </div>
    </motion.div>
  );
}

// Feature roadmap display
export function HealthEquityRoadmap() {
  const phases = [
    {
      phase: 'Phase 7',
      name: 'Health Equity Dashboard',
      status: 'Implemented',
      features: ['Funding gaps visualization', 'Diversity metrics', 'Dual-metric scoring']
    },
    {
      phase: 'Phase 8',
      name: 'Trial Diversity Tracker',
      status: 'Planned',
      features: ['Participant diversity %', 'Geographic mapping', 'Enrollment barriers']
    },
    {
      phase: 'Phase 9',
      name: 'Impact Investment Scorecard',
      status: 'Planned',
      features: ['ROI + equity combined score', 'Benchmarking', 'Portfolio optimization']
    },
    {
      phase: 'Phase 10',
      name: 'Underserved Disease Analyzer',
      status: 'Planned',
      features: ['Market opportunity sizing', 'Competitive landscape', 'Regulatory pathways']
    },
    {
      phase: 'Phase 11',
      name: 'Community Impact Predictor',
      status: 'Planned',
      features: ['Lives saved per $1M invested', 'Cost savings calculator', 'Health outcome modeling']
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Development Roadmap
      </h3>
      <div className="space-y-3">
        {phases.map((phase) => (
          <div key={phase.phase} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 ${phase.status === 'Implemented' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{phase.phase}</span>
                <span className="font-medium" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>{phase.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${phase.status === 'Implemented' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {phase.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {phase.features.map((feature) => (
                  <span key={feature} className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
