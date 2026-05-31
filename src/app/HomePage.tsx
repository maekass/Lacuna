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
import SensitivityAnalysis from '@/components/SensitivityAnalysis';
import BayesianCausalAnalysis from '@/components/BayesianCausalAnalysis';
import CausalDAG from '@/components/CausalDAG';
import ImpactOpportunityCard from '@/components/ImpactOpportunityCard';
import ValidationTracker from '@/components/ValidationTracker';
import FairnessAuditV2 from '@/components/FairnessAuditV2';
import NetworkAnalysisHonest from '@/components/NetworkAnalysisHonest';
import CompetitiveAnalysisDashboard from '@/components/CompetitiveAnalysisDashboard';
import TemporalValidation from '@/components/TemporalValidation';
import CausalInferenceEngine from '@/components/CausalInferenceEngine';
import DataCoverageCard from '@/components/DataCoverageCard';
import SiteSectionNav from '@/components/SiteSectionNav';
import { useVerifiedDataset } from '@/lib/data/VerifiedDatasetContext';

export default function HomePage() {
  const {
    verifiedCompanies,
    verifiedAcquisitions,
    dataProvenance,
    getVerifiedNetworkNodes,
    getVerifiedNetworkLinks,
    getVerifiedDealsByYear,
    getVerifiedTotalDealValue,
  } = useVerifiedDataset();

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
    <div className="min-h-screen bg-gradient-to-br from-lacuna-pink/15 via-background to-lacuna-lavender/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-lacuna-lavender/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <a href="#top" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 lacuna-gradient rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-lacuna-plum">Lacuna</h1>
              <p className="text-xs text-lacuna-blue">M&amp;A Intelligence · Women&apos;s Health</p>
            </div>
          </a>
          <SiteSectionNav />
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-lacuna-lavender/25 rounded-full text-xs font-medium text-lacuna-plum">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Verified dataset · {verifiedCompanies.length} companies · {verifiedAcquisitions.length} acquisitions
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-lacuna-plum mb-4">
              The Exit Map for
              <span className="lacuna-gradient-text"> Women&apos;s Health</span>
            </h2>
            <p className="text-lg text-lacuna-blue leading-relaxed">
              An academically-honest M&amp;A intelligence platform for FemTech and
              women&apos;s health. Every metric on this page is sourced from public
              filings, every model discloses its assumptions, and small-sample
              limitations are surfaced rather than hidden.
            </p>
          </div>
        </motion.section>

        {/* Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-3xl font-bold text-lacuna-plum">{stat.value}</p>
              <p className="text-sm text-lacuna-blue mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.section>

        {/* Data Coverage */}
        <motion.section
          id="data-coverage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16"
        >
          <DataCoverageCard />
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Acquisition Network</h3>
            <p className="text-lacuna-blue">Interactive force-directed graph of targets and acquirers. Drag to explore, scroll to zoom.</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6">
            <h3 className="text-lg font-semibold text-lacuna-plum mb-2">Recent Activity</h3>
            <p className="text-sm text-lacuna-blue mb-6">Latest acquisitions and strategic investments</p>
            <div className="space-y-4">
              {verifiedAcquisitions.slice(0, 5).map((deal: typeof verifiedAcquisitions[0]) => {
                const target = verifiedCompanies.find((c: typeof verifiedCompanies[0]) => c.id === deal.targetId);
                const acquirer = networkNodes.find((n: typeof networkNodes[0]) => n.id === deal.acquirerId);
                return (
                  <div key={deal.id} className="flex items-center justify-between p-3 bg-lacuna-pink/10 rounded-lg">
                    <div>
                      <p className="font-medium text-lacuna-plum">{target?.name}</p>
                      <p className="text-xs text-lacuna-blue">{deal.dealType} by {acquirer?.name || deal.acquirerName}</p>
                    </div>
                    <div className="text-right">
                      {deal.dealValue ? (
                        <p className="font-semibold text-lacuna-plum">${deal.dealValue}M</p>
                      ) : (
                        <p className="text-xs text-lacuna-blue/70">Terms not disclosed</p>
                      )}
                      <p className="text-xs text-lacuna-blue/70">{deal.announcedDate}</p>
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

        {/* Wearables Ecosystem Section */}
        <motion.section
          id="wearables"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <WearablesTracker />
        </motion.section>

        {/* Health Equity Section */}
        <motion.section
          id="health-equity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16 scroll-mt-24"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">Health equity context</h3>
            <p className="text-lacuna-blue">
              Cited epidemiology mapped to verified portfolio companies — filter, expand records, or export overlap.
            </p>
          </div>
          <HealthEquityDashboard />
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Health Impact Assessment</h3>
            <p className="text-lacuna-blue">Opportunity-Adjusted Impact Score (OAIS) - Transparent about what we CAN vs CANNOT measure</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Post-Acquisition Validation</h3>
            <p className="text-lacuna-blue">Pre-acquisition predictions vs post-acquisition reality | Model calibration</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Fairness Audit</h3>
            <p className="text-lacuna-blue">Modular framework: Wilson CIs, Fisher&apos;s exact, Bonferroni correction, power analysis</p>
          </div>
          <FairnessAuditV2 />
        </motion.section>

        {/* Network Analysis - Honest Small-N */}
        <motion.section
          id="network-analysis"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.578 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">Network Analysis</h3>
            <p className="text-lacuna-blue">Honest small-N analysis: Bootstrap CIs, Gini/HHI concentration, null model comparison</p>
          </div>
          <NetworkAnalysisHonest />
        </motion.section>

        {/* Competitive Analysis - Descriptive */}
        <motion.section
          id="competitive-analysis"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.579 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">Competitive Analysis</h3>
            <p className="text-lacuna-blue">Descriptive acquirer behavior: portfolio, velocity, market structure, type comparison</p>
          </div>
          <CompetitiveAnalysisDashboard />
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Causal Identification Strategy</h3>
            <p className="text-lacuna-blue">Pearl backdoor criterion with measured and unmeasured confounders</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Causal Inference Engine</h3>
            <p className="text-lacuna-blue">Sector-level acquisition counts from verified deals (no simulated regressions)</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Temporal Validation</h3>
            <p className="text-lacuna-blue">Observed announcement timing from verified transactions</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Sensitivity Analysis</h3>
            <p className="text-lacuna-blue">Rotnitzky bounds and Oster&apos;s δ for unobserved confounding</p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">Bayesian Small Sample Analysis</h3>
            <p className="text-lacuna-blue">Pre-registered hypotheses with main effects only (n=22)</p>
          </div>
          <BayesianCausalAnalysis />
        </motion.section>

        {/* Descriptive Scoring & Similarity */}
        <motion.section
          id="ai-ml"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">Descriptive Scoring &amp; Similarity</h3>
            <p className="text-lacuna-blue">Deterministic factor scoring, cosine similarity, and capital-profile clustering — no fitted predictive models</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <ExitPredictor />
            <CompanySimilarity />
          </div>
          <ClusteringAnalysis />
        </motion.section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 lacuna-gradient rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">L</span>
              </div>
              <span className="text-sm font-medium text-lacuna-plum">Lacuna</span>
            </div>
            <p className="text-sm text-lacuna-blue text-center">
              Licensed under Business Source License 1.1 · © 2026 · Educational project — not investment advice
            </p>
            <div className="flex items-center gap-4 text-sm text-lacuna-blue">
              <a
                href="https://github.com/maekass/Lacuna"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-lacuna-plum transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/maekass/Lacuna/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-lacuna-plum transition-colors"
              >
                Methodology docs
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
