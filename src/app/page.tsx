'use client';

import { motion } from 'framer-motion';
import ForceNetwork from '@/components/ForceNetwork';
import DealFlowChart from '@/components/DealFlowChart';
import ValuationMatrix from '@/components/ValuationMatrix';
import ExitPredictor from '@/components/ExitPredictor';
import CompanySimilarity from '@/components/CompanySimilarity';
import ClusteringAnalysis from '@/components/ClusteringAnalysis';
import WearablesTracker from '@/components/WearablesTracker';
import HealthEquityDashboard from '@/components/HealthEquityDashboard';
import { HealthEquityRoadmap } from '@/components/HealthEquityDashboard';
import SensitivityAnalysis from '@/components/SensitivityAnalysis';
import BayesianCausalAnalysis from '@/components/BayesianCausalAnalysis';
import CausalDAG from '@/components/CausalDAG';
import ImpactOpportunityCard from '@/components/ImpactOpportunityCard';
import ValidationTracker from '@/components/ValidationTracker';
import FairnessAuditV2 from '@/components/FairnessAuditV2';
import TemporalValidation from '@/components/TemporalValidation';
import CausalInferenceEngine from '@/components/CausalInferenceEngine';
import { 
  verifiedCompanies, 
  verifiedAcquisitions, 
  getVerifiedNetworkNodes, 
  getVerifiedNetworkLinks, 
  getVerifiedDealsByYear, 
  getVerifiedTotalDealValue,
  dataProvenance 
} from '@/data/verifiedData';

export default function Home() {
  const networkNodes = getVerifiedNetworkNodes();
  const networkLinks = getVerifiedNetworkLinks();
  const dealsByYear = getVerifiedDealsByYear();
  const totalDealValue = getVerifiedTotalDealValue();

  const stats = [
    { label: 'Companies Tracked', value: verifiedCompanies.length.toString() },
    { label: 'Verified Acquisitions', value: verifiedAcquisitions.length.toString() },
    { label: 'Disclosed Deal Value', value: `$${(totalDealValue / 1000).toFixed(1)}B` },
    { label: 'Data Sources', value: dataProvenance.sources.length.toString() },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Lacuna</h1>
              <p className="text-xs text-slate-500">M&amp;A Intelligence · Women&apos;s Health</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#network" className="hover:text-pink-600 transition-colors">Network</a>
            <a href="#analytics" className="hover:text-pink-600 transition-colors">Analytics</a>
            <a href="#matrix" className="hover:text-pink-600 transition-colors">Matrix</a>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium">v1.0.0</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
              The Exit Map for
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent"> Women&apos;s Health</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Sophisticated network intelligence platform tracking M&amp;A trends, 
              strategic acquirers, and exit opportunities across FemTech, digital 
              health, and women&apos;s wellness sectors.
            </p>
          </div>
        </motion.section>

        {/* Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.section>

        {/* Force-Directed Network */}
        <motion.section
          id="network"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Acquisition Network</h3>
            <p className="text-slate-600">Interactive force-directed graph of targets and acquirers. Drag to explore, scroll to zoom.</p>
          </div>
          <ForceNetwork
            nodes={networkNodes}
            links={networkLinks}
            width={1200}
            height={700}
          />
        </motion.section>

        {/* Analytics Row */}
        <motion.section
          id="analytics"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-8 mb-16"
        >
          <DealFlowChart
            data={dealsByYear}
            width={550}
            height={300}
          />
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Recent Activity</h3>
            <p className="text-sm text-slate-500 mb-6">Latest acquisitions and strategic investments</p>
            <div className="space-y-4">
              {verifiedAcquisitions.slice(0, 5).map((deal: typeof verifiedAcquisitions[0]) => {
                const target = verifiedCompanies.find((c: typeof verifiedCompanies[0]) => c.id === deal.targetId);
                const acquirer = networkNodes.find((n: typeof networkNodes[0]) => n.id === deal.acquirerId);
                return (
                  <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{target?.name}</p>
                      <p className="text-xs text-slate-500">{deal.dealType} by {acquirer?.name || deal.acquirerName}</p>
                    </div>
                    <div className="text-right">
                      {deal.dealValue ? (
                        <p className="font-semibold text-pink-600">${deal.dealValue}M</p>
                      ) : (
                        <p className="text-xs text-slate-400">Terms not disclosed</p>
                      )}
                      <p className="text-xs text-slate-400">{deal.announcedDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Valuation Matrix */}
        <motion.section
          id="matrix"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <ValuationMatrix />
        </motion.section>

        {/* Wearables Ecosystem Section - Featured for Pitch */}
        <motion.section
          id="wearables"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <WearablesTracker />
        </motion.section>

        {/* Health Equity Section - Ported from windsurf-project */}
        <motion.section
          id="health-equity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16"
        >
          <HealthEquityDashboard />
          <div className="mt-8">
            <HealthEquityRoadmap />
          </div>
        </motion.section>

        {/* Health Impact Assessment - OAIS Framework */}
        <motion.section
          id="impact-assessment"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.56 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Health Impact Assessment</h3>
            <p className="text-slate-600">Opportunity-Adjusted Impact Score (OAIS) - Transparent about what we CAN vs CANNOT measure</p>
          </div>
          <ImpactOpportunityCard />
        </motion.section>

        {/* Post-Acquisition Validation Tracker */}
        <motion.section
          id="validation-tracker"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.57 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Post-Acquisition Validation</h3>
            <p className="text-slate-600">Pre-acquisition predictions vs post-acquisition reality | Model calibration</p>
          </div>
          <ValidationTracker />
        </motion.section>

        {/* Fairness Audit V2 - Modular Architecture */}
        <motion.section
          id="fairness-audit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.575 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Fairness Audit</h3>
            <p className="text-slate-600">Modular framework: Wilson CIs, Fisher&apos;s exact, Bonferroni correction, power analysis</p>
          </div>
          <FairnessAuditV2 />
        </motion.section>

        {/* Causal DAG & Identification Strategy */}
        <motion.section
          id="causal-dag"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.58 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Causal Identification Strategy</h3>
            <p className="text-slate-600">Pearl backdoor criterion with measured and unmeasured confounders</p>
          </div>
          <CausalDAG />
        </motion.section>

        {/* Causal Inference Engine - Main Effects */}
        <motion.section
          id="causal-engine"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.59 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Causal Inference Engine</h3>
            <p className="text-slate-600">Main effects with 95% CIs, specification robustness, Oster&apos;s δ</p>
          </div>
          <CausalInferenceEngine />
        </motion.section>

        {/* Temporal Validation - Event Study */}
        <motion.section
          id="temporal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.60 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Temporal Validation</h3>
            <p className="text-slate-600">Event study methodology with parallel trends testing</p>
          </div>
          <TemporalValidation />
        </motion.section>

        {/* Sensitivity Analysis */}
        <motion.section
          id="sensitivity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.61 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Sensitivity Analysis</h3>
            <p className="text-slate-600">Rotnitzky bounds and Oster&apos;s δ for unobserved confounding</p>
          </div>
          <SensitivityAnalysis />
        </motion.section>

        {/* Bayesian Small Sample Analysis */}
        <motion.section
          id="bayesian-causal"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.62 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">Bayesian Small Sample Analysis</h3>
            <p className="text-slate-600">Pre-registered hypotheses with main effects only (n=22)</p>
          </div>
          <BayesianCausalAnalysis />
        </motion.section>

        {/* AI/ML Intelligence Section */}
        <motion.section
          id="ai-ml"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800">AI/ML Intelligence</h3>
            <p className="text-slate-600">Machine learning models for exit prediction, similarity analysis, and market clustering</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <ExitPredictor />
            <CompanySimilarity />
          </div>
          <ClusteringAnalysis />
        </motion.section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">L</span>
              </div>
              <span className="text-sm font-medium text-slate-700">Lacuna</span>
            </div>
            <p className="text-sm text-slate-500">
              Licensed under Business Source License 1.1 · © 2026 · Educational Project
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a href="https://github.com" className="hover:text-slate-700 transition-colors">GitHub</a>
              <a href="#" className="hover:text-slate-700 transition-colors">Documentation</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
