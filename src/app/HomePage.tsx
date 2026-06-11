"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AcquirerPredictionDashboard,
  BayesianCausalAnalysis,
  BusinessModelClassifier,
  CausalDAG,
  CausalInferenceEngine,
  ClinicalTrialTracker,
  ClusteringAnalysis,
  CompanySimilarity,
  CompetitiveAnalysisDashboard,
  DealFlowChart,
  DomesticStudyCatalog,
  EvidenceMaturityDashboard,
  ExitPredictor,
  ForceNetwork,
  HealthEquityDashboard,
  ImpactOpportunityCard,
  NetworkAnalysisHonest,
  QuantValuationPanel,
  ReimbursementIntelligenceDashboard,
  SensitivityAnalysis,
  TemporalValidation,
  ValidationTracker,
  ValuationMatrix,
  VariantCallsetBrowser,
  WhiteSpaceAnalysis,
} from "@/app/lazyDashboard";
import DataCoverageCard from "@/components/DataCoverageCard";
import DataProvenanceBanner from "@/components/DataProvenanceBanner";
import SiteSectionNav from "@/components/SiteSectionNav";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { getValuationDisparity } from "@/lib/fairness/headlineStat";

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

  const valuationDisparity = useMemo(
    () => getValuationDisparity(verifiedCompanies),
    [verifiedCompanies],
  );

  const stats = [
    {
      label: "Companies in our network",
      value: verifiedCompanies.length.toString(),
    },
    { label: "Verified deals", value: verifiedAcquisitions.length.toString() },
    {
      label: "In disclosed value",
      value: `$${(totalDealValue / 1000).toFixed(1)}B`,
    },
    {
      label: "Public sources cited",
      value: dataProvenance.sources.length.toString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-lacuna-pink/15 via-background to-lacuna-lavender/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-lacuna-lavender/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <a href="#top" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 lacuna-gradient rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-lacuna-plum">Lacuna</h1>
              <p className="text-xs text-lacuna-blue">
                Women&apos;s Health M&amp;A · Diligence Stack
              </p>
            </div>
          </a>
          <SiteSectionNav />
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="max-w-3xl">
            <CuratedDatasetBanner className="mb-4" />
            <h2 className="text-4xl md:text-5xl font-bold text-lacuna-plum mb-4 leading-tight">
              <span className="block">Women&apos;s Health M&amp;A</span>
              <span className="block lacuna-gradient-text">
                Diligence Stack
              </span>
            </h2>
            <p className="text-lg text-lacuna-blue leading-relaxed">
              Prototype investment-research environment — verified deal
              provenance, clinical trial search, genomics governance, and cited
              analytics from public sources.
            </p>
            <p className="text-sm text-lacuna-blue/70 mt-3 leading-relaxed">
              n={verifiedAcquisitions.length}{" "}
              verified deals · SEC EDGAR ingest · HIPAA/GDPR genomics layer ·
              descriptive analytics only. Not PitchBook, not live market feeds,
              and not investment advice.
            </p>
          </div>
        </motion.section>

        {/* Data provenance & compliance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-10"
        >
          <DataProvenanceBanner />
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
              <p className="text-3xl font-bold text-lacuna-plum">
                {stat.value}
              </p>
              <p className="text-sm text-lacuna-blue mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.section>

        {/* Fairness Audit Headline Banner */}
        {valuationDisparity !== null && (
          <div className="mb-8 p-4 bg-lacuna-lavender/20 border border-lacuna-lavender/40 rounded-xl flex items-start gap-3">
            <span className="text-lacuna-plum text-sm font-medium shrink-0">⚡ Insight</span>
            <span className="text-lacuna-blue text-sm">
              Among disclosed valuations, {valuationDisparity.highSector} averages {valuationDisparity.percentDiff.toFixed(0)}% above {valuationDisparity.lowSector} — the widest sector gap in the dataset (n={valuationDisparity.highN} vs n={valuationDisparity.lowN} disclosed).
            </span>
          </div>
        )}

        {/* Data Coverage */}
        <motion.section
          id="data-coverage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16 scroll-mt-20"
        >
          <DataCoverageCard />
        </motion.section>

        {/* Force-Directed Network */}
        <motion.section
          id="network"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Who&apos;s Connected to Whom
            </h3>
            <p className="text-lacuna-blue">
              Explore the relationships between acquirers and the women&apos;s
              health companies they&apos;ve welcomed into their portfolios
            </p>
          </div>
          <ForceNetwork
            nodes={networkNodes}
            links={networkLinks}
            highlightForeground={true}
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
          />
          <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-6">
            <CuratedDatasetBanner className="mb-4" />
            <h3 className="text-lg font-semibold text-lacuna-plum mb-2">
              What&apos;s Happening Now
            </h3>
            <p className="text-sm text-lacuna-blue mb-6">
              The latest deals shaping the women&apos;s health landscape
            </p>
            <div className="space-y-4">
              {verifiedAcquisitions.slice(0, 5).map(
                (deal: typeof verifiedAcquisitions[0]) => {
                  const target = verifiedCompanies.find((
                    c: typeof verifiedCompanies[0],
                  ) => c.id === deal.targetId);
                  const acquirer = networkNodes.find((
                    n: typeof networkNodes[0],
                  ) => n.id === deal.acquirerId);
                  return (
                    <div
                      key={deal.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 p-3 bg-lacuna-pink/10 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-lacuna-plum truncate">
                          {target?.name}
                        </p>
                        <p className="text-xs text-lacuna-blue truncate">
                          {deal.dealType} by{" "}
                          {acquirer?.name || deal.acquirerName}
                        </p>
                      </div>
                      <div className="sm:text-right shrink-0">
                        {deal.dealValue
                          ? (
                            <p className="font-semibold text-lacuna-plum">
                              ${deal.dealValue}M
                            </p>
                          )
                          : (
                            <p className="text-xs text-lacuna-blue/70">
                              Terms not disclosed
                            </p>
                          )}
                        <p className="text-xs text-lacuna-blue/70">
                          {deal.announcedDate}
                        </p>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </motion.section>

        {/* Valuation Matrix */}
        <motion.section
          id="matrix"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16 scroll-mt-20"
        >
          <ValuationMatrix />
        </motion.section>

        {/* Quant valuation & exit-likelihood (heuristic) */}
        <motion.section
          id="quant"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Putting a Number on It (Carefully)
            </h3>
            <p className="text-lacuna-blue">
              A heuristic valuation and exit-likelihood pass over verified
              companies — grounded in disclosed funding, honest about the
              clinical and market inputs the dataset doesn&apos;t have.
            </p>
          </div>
          <QuantValuationPanel />
        </motion.section>

        {/* Clinical Trial Tracker */}
        <motion.section
          id="clinical-trials"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Clinical Trials Worth Watching
            </h3>
            <p className="text-lacuna-blue">
              Live oncology, pelvic health, fibroids, fertility, contraception,
              maternal health, and sickle cell searches plus a cited domestic sample-size catalog
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <ClinicalTrialTracker />
            <DomesticStudyCatalog />
          </div>
          <p
            className="mt-3 text-xs text-lacuna-blue/70 text-center"
            role="note"
          >
            Trial search is live; cohort sample sizes are static citations.
          </p>
        </motion.section>

        {/* Evidence maturity (descriptive) */}
        <motion.section
          id="evidence-maturity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.47 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Evidence maturity (descriptive)
            </h3>
            <p className="text-lacuna-blue">
              Trial phase, FDA status, and publication flags scored from public
              metadata on verified companies — not a validated evidence
              benchmark.
            </p>
          </div>
          <EvidenceMaturityDashboard />
        </motion.section>

        {/* Variant call-set browser (ClickHouse + object storage) */}
        <motion.section
          id="variant-callsets"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48 }}
          className="mb-16 scroll-mt-20"
        >
          <VariantCallsetBrowser />
        </motion.section>

        {/* Health Equity Section */}
        <motion.section
          id="health-equity"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Genetic Markers &amp; Health Equity
            </h3>
            <p className="text-lacuna-blue">
              PCOS, hereditary breast cancer, sickle cell, lupus, and Lynch
              syndrome markers — with disparities that disproportionately affect
              Black women in the verified portfolio
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
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Measuring What Matters
            </h3>
            <p className="text-lacuna-blue">
              How much real-world health impact could these acquisitions have?
              We score each honestly — and tell you what we can&apos;t measure,
              too
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Did the Deal Deliver?
            </h3>
            <p className="text-lacuna-blue">
              Checking in on what happened after the acquisition — did the
              outcomes match the promise?
            </p>
          </div>
          <ValidationTracker />
        </motion.section>

        {/* Network Analysis - Honest Small-N */}
        <motion.section
          id="network-analysis"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.578 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              A Closer Look at the Network
            </h3>
            <p className="text-lacuna-blue">
              How concentrated is the acquirer landscape? We explore market
              structure with honest statistical measures and transparent
              confidence intervals
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Getting to Know the Acquirers
            </h3>
            <p className="text-lacuna-blue">
              Who&apos;s been most active, what are they building, and how do
              their strategies compare?
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Understanding Cause &amp; Effect
            </h3>
            <p className="text-lacuna-blue">
              Our approach to teasing apart what actually drives acquisition
              outcomes — with full transparency about what we can and can&apos;t
              claim
            </p>
          </div>
          <CausalDAG />
        </motion.section>

        {/* Causal Inference Engine - Main Effects */}
        <motion.section
          id="causal-engine"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.59 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              What the Data Actually Says
            </h3>
            <p className="text-lacuna-blue">
              Sector-level patterns drawn directly from verified deals — no
              simulations, just what the numbers tell us
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              The Story Over Time
            </h3>
            <p className="text-lacuna-blue">
              When are deals happening, and how has the pace of women&apos;s
              health M&amp;A evolved?
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              How Robust Are Our Findings?
            </h3>
            <p className="text-lacuna-blue">
              We stress-test our models so you know how much to trust them —
              because honest research means showing the seams
            </p>
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
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Small Dataset, Big Questions
            </h3>
            <p className="text-lacuna-blue">
              With {verifiedAcquisitions.length}{" "}
              verified deals, we use Bayesian methods designed for small samples
              — because every data point matters
            </p>
          </div>
          <BayesianCausalAnalysis />
        </motion.section>

        {/* Descriptive Scoring & Similarity */}
        <motion.section
          id="descriptive-scoring"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Finding Companies Like Each Other
            </h3>
            <p className="text-lacuna-blue">
              Which women&apos;s health companies share similar profiles?
              Explore natural groupings and see how they compare
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <ExitPredictor />
            <CompanySimilarity />
          </div>
          <ClusteringAnalysis />
        </motion.section>

        <motion.section
          id="white-space-analysis"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.605 }}
          className="mb-16 scroll-mt-20"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              White Space Analysis
            </h3>
            <p className="text-lacuna-blue">
              Sectors with high company density but low M&amp;A activity — where the next wave may form.
            </p>
          </div>
          <WhiteSpaceAnalysis />
        </motion.section>

        {/* Reimbursement Intelligence */}
        <motion.section
          id="reimbursement-intelligence"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.63 }}
          className="mb-16 scroll-mt-24"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Reimbursement context (descriptive)
            </h3>
            <p className="text-lacuna-blue">
              Illustrative CMS code mapping and business-model labels on
              verified companies — exploratory framing, not reimbursement advice
              or live claims data.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReimbursementIntelligenceDashboard />
            </div>
            <div>
              <BusinessModelClassifier />
            </div>
          </div>
        </motion.section>

        {/* Strategic acquirer fit (descriptive) */}
        <motion.section
          id="acquirer-prediction"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mb-16 scroll-mt-24"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-lacuna-plum">
              Strategic acquirer fit (descriptive)
            </h3>
            <p className="text-lacuna-blue">
              Rule-based match scores from verified deal history and stated
              acquirer profiles — not a trained prediction model. Optional LLM
              blurbs are exploratory copy, not validated research.
            </p>
          </div>

          <AcquirerPredictionDashboard />
        </motion.section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-lacuna-lavender/40">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 lacuna-gradient rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">L</span>
                </div>
                <span className="text-sm font-medium text-lacuna-plum">
                  Lacuna
                </span>
              </div>
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
                  href="https://github.com/maekass/Lacuna/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lacuna-plum transition-colors"
                >
                  License (BUSL 1.1)
                </a>
                <a
                  href="https://github.com/maekass/Lacuna/tree/main/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-lacuna-plum transition-colors"
                >
                  Methodology
                </a>
              </div>
            </div>

            <div className="text-[11px] text-lacuna-blue/50 text-center leading-relaxed max-w-3xl mx-auto">
              <p>
                © 2026 Lacuna · Made with care for women&apos;s health research
                · BUSL 1.1 · Open source
              </p>
              <p className="mt-1">
                Verified data from SEC EDGAR, company disclosures, and
                ClinicalTrials.gov. An open investment-research prototype for
                women&apos;s health M&amp;A — not investment advice and not a
                substitute for paid deal-intelligence products.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
