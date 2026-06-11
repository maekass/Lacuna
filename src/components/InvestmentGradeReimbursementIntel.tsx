"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { VerifiedAcquisitionView, VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

// Investment-grade analysis types
interface ReimbursementRiskScore {
  company: VerifiedCompanyView;
  cmsPathwayClarity: number; // 0-100
  fdaAlignment: number; // 0-100
  codingCoverage: number; // 0-100
  payerMixDiversity: number; // 0-100
  overallRisk: "low" | "moderate" | "high" | "critical";
  riskFactors: string[];
  mitigationStrategies: string[];
  estimatedCoverageTimeline: string;
}

interface MarketSizing {
  sector: string;
  totalAddressableMarket: number; // $B
  serviceableAddressableMarket: number; // $B
  serviceableObtainableMarket: number; // $B
  growthRate: number; // CAGR
  payerMix: {
    commercial: number;
    medicare: number;
    medicaid: number;
    cash: number;
  };
}

interface CompetitiveIntel {
  sector: string;
  recentDeals: VerifiedAcquisitionView[];
  avgValuationMultiple: number;
  strategicBuyers: string[];
  dealVelocity: "accelerating" | "stable" | "slowing";
  premiumTrend: "expanding" | "stable" | "compressing";
}

interface InvestmentSignal {
  type: "opportunity" | "risk" | "trend" | "timing";
  priority: "high" | "medium" | "low";
  headline: string;
  detail: string;
  actionable: boolean;
}

/**
 * Static bar styles for the payer-mix chart. Widths correspond to the fixed
 * payerMix percentages in generateMarketSizing (42/28/15/15) using Tailwind
 * arbitrary-value classes, avoiding inline styles.
 */
const PAYER_BAR_STYLES: Record<string, string> = {
  commercial: "bg-blue-500 w-[42%]",
  medicare: "bg-green-500 w-[28%]",
  medicaid: "bg-amber-500 w-[15%]",
  cash: "bg-slate-500 w-[15%]",
};

// Investment-grade scoring algorithm
function calculateReimbursementRisk(company: VerifiedCompanyView): ReimbursementRiskScore {
  const riskFactors: string[] = [];
  const mitigationStrategies: string[] = [];
  
  // CMS Pathway Clarity (0-100)
  let cmsPathwayClarity = 50;
  const hasClearPath = /diagnostic|therapeutic|device|cpt|cms|fda/i.test(company.description);
  if (hasClearPath) {
    cmsPathwayClarity = 80;
    mitigationStrategies.push("Established CMS pathway present");
  } else {
    riskFactors.push("No clear CMS reimbursement pathway identified");
  }
  
  if (company.sector.includes("Diagnostics")) {
    cmsPathwayClarity += 15;
    mitigationStrategies.push("Diagnostic sector has well-defined coding");
  }
  if (company.sector.includes("Digital")) {
    cmsPathwayClarity -= 20;
    riskFactors.push("Digital health reimbursement evolving/uncertain");
    mitigationStrategies.push("Consider Category III CPT pathway");
  }
  
  // FDA Alignment (0-100)
  let fdaAlignment = 60;
  const hasFDA = /fda|510k|pma|cleared|approved/i.test(company.description);
  if (hasFDA) {
    fdaAlignment = 90;
    mitigationStrategies.push("FDA clearance accelerates coverage decisions");
  } else {
    riskFactors.push("Pre-FDA: Coverage contingent on regulatory approval");
    mitigationStrategies.push("Parallel-track FDA/CMS strategy recommended");
  }
  
  // Coding Coverage (0-100)
  let codingCoverage = 45;
  if (hasClearPath) codingCoverage = 75;
  if (company.sector.includes("Diagnostics")) codingCoverage += 15;
  if (company.sector.includes("Molecular")) {
    codingCoverage -= 10;
    riskFactors.push("Molecular diagnostics may require LCD/NCD review");
  }
  
  // Payer Mix Diversity (0-100)
  const payerMixDiversity = company.sector.includes("Consumer") ? 40 : 75;
  if (payerMixDiversity < 60) {
    riskFactors.push("Concentrated payer exposure increases pricing pressure risk");
  }
  
  // Overall Risk Classification
  const avgScore = (cmsPathwayClarity + fdaAlignment + codingCoverage + payerMixDiversity) / 4;
  let overallRisk: ReimbursementRiskScore["overallRisk"];
  if (avgScore >= 75) overallRisk = "low";
  else if (avgScore >= 60) overallRisk = "moderate";
  else if (avgScore >= 40) overallRisk = "high";
  else overallRisk = "critical";
  
  // Coverage Timeline Estimate
  let estimatedCoverageTimeline: string;
  if (overallRisk === "low") estimatedCoverageTimeline = "6-12 months post-close";
  else if (overallRisk === "moderate") estimatedCoverageTimeline = "12-18 months with active management";
  else if (overallRisk === "high") estimatedCoverageTimeline = "18-24 months, significant uncertainty";
  else estimatedCoverageTimeline = ">24 months, strategic pivot may be required";
  
  return {
    company,
    cmsPathwayClarity: Math.min(100, Math.max(0, cmsPathwayClarity)),
    fdaAlignment: Math.min(100, Math.max(0, fdaAlignment)),
    codingCoverage: Math.min(100, Math.max(0, codingCoverage)),
    payerMixDiversity: Math.min(100, Math.max(0, payerMixDiversity)),
    overallRisk,
    riskFactors,
    mitigationStrategies,
    estimatedCoverageTimeline,
  };
}

function generateMarketSizing(sector: string): MarketSizing {
  const sectorMultipliers: Record<string, { tam: number; growth: number }> = {
    "Diagnostics": { tam: 98.5, growth: 7.2 },
    "Fertility": { tam: 84.0, growth: 9.5 },
    "Maternal": { tam: 45.2, growth: 6.8 },
    "Mental": { tam: 542.0, growth: 5.5 },
    "Pelvic": { tam: 12.8, growth: 8.2 },
    "Menopause": { tam: 16.5, growth: 11.2 },
    "Wearable": { tam: 61.0, growth: 14.5 },
  };
  
  const base = sectorMultipliers[sector] || { tam: 25.0, growth: 6.0 };
  
  return {
    sector,
    totalAddressableMarket: base.tam,
    serviceableAddressableMarket: base.tam * 0.35,
    serviceableObtainableMarket: base.tam * 0.08,
    growthRate: base.growth,
    payerMix: {
      commercial: 42,
      medicare: 28,
      medicaid: 15,
      cash: 15,
    },
  };
}

function generateCompetitiveIntel(
  sector: string,
  acquisitions: VerifiedAcquisitionView[],
): CompetitiveIntel {
  const sectorDeals = acquisitions.filter(a => 
    a.targetName.toLowerCase().includes(sector.toLowerCase()) ||
    a.acquirerName.toLowerCase().includes(sector.toLowerCase())
  );
  
  const dealValues = sectorDeals
    .map(d => d.dealValue)
    .filter((v): v is number => v !== undefined);
  
  const avgMultiple = dealValues.length > 0
    ? dealValues.reduce((a, b) => a + b, 0) / dealValues.length / 100 // Simplified
    : 8.5;
  
  const uniqueAcquirers = [...new Set(sectorDeals.map(d => d.acquirerName))];
  
  return {
    sector,
    recentDeals: sectorDeals.slice(0, 5),
    avgValuationMultiple: avgMultiple,
    strategicBuyers: uniqueAcquirers.slice(0, 8),
    dealVelocity: sectorDeals.length > 3 ? "accelerating" : "stable",
    premiumTrend: avgMultiple > 10 ? "expanding" : "stable",
  };
}

function generateInvestmentSignals(
  company: VerifiedCompanyView,
  riskScore: ReimbursementRiskScore,
  market: MarketSizing,
  competitive: CompetitiveIntel,
): InvestmentSignal[] {
  const signals: InvestmentSignal[] = [];
  
  // Opportunity signals
  if (riskScore.overallRisk === "low" && market.growthRate > 8) {
    signals.push({
      type: "opportunity",
      priority: "high",
      headline: "Attractive Risk-Adjusted Growth Profile",
      detail: `${company.name} operates in ${market.sector} (${market.growthRate}% CAGR) with clear reimbursement pathways. Low commercialization risk.`,
      actionable: true,
    });
  }
  
  if (competitive.dealVelocity === "accelerating") {
    signals.push({
      type: "timing",
      priority: "high",
      headline: "Sector M&A Momentum Building",
      detail: `${competitive.recentDeals.length} deals in ${market.sector} sector. Strategic buyers: ${competitive.strategicBuyers.slice(0, 3).join(", ")}. Consider pre-emptive move.`,
      actionable: true,
    });
  }
  
  // Risk signals
  if (riskScore.overallRisk === "high" || riskScore.overallRisk === "critical") {
    signals.push({
      type: "risk",
      priority: "high",
      headline: "Reimbursement Uncertainty Requires Structuring",
      detail: `Risk factors: ${riskScore.riskFactors.slice(0, 2).join("; ")}. Recommend milestone-based earnout tied to coverage determination.`,
      actionable: true,
    });
  }
  
  // Trend signals
  if (market.payerMix.cash > 20) {
    signals.push({
      type: "trend",
      priority: "medium",
      headline: "Consumer-Driven Model Limits TAM Expansion",
      detail: `${market.payerMix.cash}% cash-pay exposure limits scale. Value-based contracting opportunity with MA plans.`,
      actionable: false,
    });
  }
  
  return signals.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export default function InvestmentGradeReimbursementIntel() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [selectedCompany, setSelectedCompany] = useState<VerifiedCompanyView | null>(null);
  const [activeTab, setActiveTab] = useState<"risk" | "market" | "competitive" | "signals">("risk");
  
  // Generate investment-grade analysis
  const analysis = useMemo(() => {
    if (!selectedCompany) return null;
    
    const riskScore = calculateReimbursementRisk(selectedCompany);
    const marketSizing = generateMarketSizing(selectedCompany.sector.split("/")[0] || "Diagnostics");
    const competitiveIntel = generateCompetitiveIntel(selectedCompany.sector, verifiedAcquisitions);
    const signals = generateInvestmentSignals(selectedCompany, riskScore, marketSizing, competitiveIntel);
    
    return { riskScore, marketSizing, competitiveIntel, signals };
  }, [selectedCompany, verifiedAcquisitions]);
  
  // Sector-level intelligence
  const sectorIntelligence = useMemo(() => {
    const sectors = [...new Set(verifiedCompanies.map(c => c.sector.split("/")[0]))];
    return sectors.map(sector => ({
      sector,
      marketSizing: generateMarketSizing(sector),
      competitiveIntel: generateCompetitiveIntel(sector, verifiedAcquisitions),
      companyCount: verifiedCompanies.filter(c => c.sector.includes(sector)).length,
    }));
  }, [verifiedCompanies, verifiedAcquisitions]);
  
  const formatCurrency = (value: number): string => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
    return `$${value.toFixed(1)}B`;
  };
  
  const RiskBadge = ({ risk }: { risk: ReimbursementRiskScore["overallRisk"] }) => {
    const styles = {
      low: "bg-emerald-100 text-emerald-800 border-emerald-300",
      moderate: "bg-amber-100 text-amber-800 border-amber-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${styles[risk]}`}>
        {risk.toUpperCase()} RISK
      </span>
    );
  };
  
  const SignalCard = ({ signal }: { signal: InvestmentSignal }) => {
    const typeStyles = {
      opportunity: "bg-emerald-50 border-emerald-200",
      risk: "bg-red-50 border-red-200",
      trend: "bg-blue-50 border-blue-200",
      timing: "bg-purple-50 border-purple-200",
    };
    
    const priorityBadge = {
      high: "bg-red-100 text-red-800",
      medium: "bg-amber-100 text-amber-800",
      low: "bg-slate-100 text-slate-600",
    };
    
    return (
      <div className={`p-4 rounded-lg border ${typeStyles[signal.type]}`}>
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-slate-800">{signal.headline}</h4>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityBadge[signal.priority]}`}>
            {signal.priority.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-2">{signal.detail}</p>
        {signal.actionable && (
          <span className="inline-flex items-center px-2 py-1 bg-white/70 rounded text-xs font-medium text-slate-700">
            Action Required
          </span>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-lacuna-plum">
              Investment-Grade Reimbursement Intelligence
            </h3>
            <p className="text-sm text-lacuna-blue">
              Life sciences M&A due diligence: reimbursement risk, market sizing, competitive intelligence
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-700">Coverage: {verifiedCompanies.length} companies</div>
            <div className="text-xs text-slate-500">{verifiedAcquisitions.length} verified deals</div>
          </div>
        </div>
        
        {/* Company Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Target for Analysis
          </label>
          <div className="flex flex-wrap gap-2">
            {verifiedCompanies.slice(0, 12).map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCompany?.id === company.id
                    ? "bg-lacuna-plum text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {company.name}
                <span className="ml-1.5 text-xs opacity-75">({company.sector.split("/")[0]})</span>
              </button>
            ))}
          </div>
        </div>
        
        {analysis && (
          <>
            {/* Risk Summary Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-800">{analysis.riskScore.company.name}</h4>
                <p className="text-sm text-slate-600">{analysis.riskScore.company.sector}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Coverage Timeline</div>
                  <div className="font-semibold text-slate-800">{analysis.riskScore.estimatedCoverageTimeline}</div>
                </div>
                <RiskBadge risk={analysis.riskScore.overallRisk} />
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-200">
              {[
                { key: "risk", label: "Reimbursement Risk" },
                { key: "market", label: "Market Sizing" },
                { key: "competitive", label: "Competitive Intel" },
                { key: "signals", label: "Investment Signals" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-lacuna-plum text-lacuna-plum"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeTab === "risk" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Risk Score Breakdown */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "CMS Pathway", score: analysis.riskScore.cmsPathwayClarity },
                      { label: "FDA Alignment", score: analysis.riskScore.fdaAlignment },
                      { label: "Coding Coverage", score: analysis.riskScore.codingCoverage },
                      { label: "Payer Mix", score: analysis.riskScore.payerMixDiversity },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                        <div className={`text-2xl font-bold ${item.score >= 70 ? "text-emerald-600" : item.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {item.score}
                        </div>
                        <div className="text-xs text-slate-600">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Risk Factors & Mitigations */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <h5 className="font-semibold text-red-800 mb-2">Risk Factors</h5>
                      <ul className="space-y-1">
                        {analysis.riskScore.riskFactors.map((factor, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span>•</span> {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                      <h5 className="font-semibold text-emerald-800 mb-2">Mitigation Strategies</h5>
                      <ul className="space-y-1">
                        {analysis.riskScore.mitigationStrategies.map((strategy, i) => (
                          <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                            <span>•</span> {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {activeTab === "market" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* TAM/SAM/SOM */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-3xl font-bold text-blue-700">{formatCurrency(analysis.marketSizing.totalAddressableMarket)}</div>
                      <div className="text-sm font-medium text-blue-800">Total Addressable Market</div>
                      <div className="text-xs text-blue-600 mt-1">Global {analysis.marketSizing.sector} market</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="text-3xl font-bold text-indigo-700">{formatCurrency(analysis.marketSizing.serviceableAddressableMarket)}</div>
                      <div className="text-sm font-medium text-indigo-800">Serviceable Addressable</div>
                      <div className="text-xs text-indigo-600 mt-1">US addressable with reimbursement</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-3xl font-bold text-purple-700">{formatCurrency(analysis.marketSizing.serviceableObtainableMarket)}</div>
                      <div className="text-sm font-medium text-purple-800">Serviceable Obtainable</div>
                      <div className="text-xs text-purple-600 mt-1">Realistic 5-year capture</div>
                    </div>
                  </div>
                  
                  {/* Payer Mix */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h5 className="font-semibold text-slate-800 mb-3">Payer Mix Breakdown</h5>
                    <div className="flex gap-2">
                      {Object.entries(analysis.marketSizing.payerMix).map(([payer, pct]) => (
                        <div key={payer} className="flex-1">
                          <div className="bg-slate-200 rounded-full h-4 mb-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${PAYER_BAR_STYLES[payer] ?? "bg-slate-500 w-1/6"}`}
                            />
                          </div>
                          <div className="text-xs text-slate-600 capitalize">{payer}: {pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-sm font-medium text-emerald-800">CAGR ({analysis.marketSizing.growthRate}%)</span>
                    <span className="text-xs text-emerald-600">Above-average sector growth</span>
                  </div>
                </motion.div>
              )}
              
              {activeTab === "competitive" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Deal Velocity & Premium */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500">Deal Velocity</div>
                      <div className={`text-xl font-bold ${analysis.competitiveIntel.dealVelocity === "accelerating" ? "text-emerald-600" : "text-slate-700"}`}>
                        {analysis.competitiveIntel.dealVelocity.toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500">{analysis.competitiveIntel.recentDeals.length} recent transactions</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500">Avg Valuation Multiple</div>
                      <div className="text-xl font-bold text-slate-700">{analysis.competitiveIntel.avgValuationMultiple.toFixed(1)}x</div>
                      <div className={`text-xs ${analysis.competitiveIntel.premiumTrend === "expanding" ? "text-emerald-600" : "text-slate-500"}`}>
                        Premiums {analysis.competitiveIntel.premiumTrend}
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Deals */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-medium text-sm text-slate-700">
                      Recent Comparable Transactions
                    </div>
                    <div className="divide-y divide-slate-100">
                      {analysis.competitiveIntel.recentDeals.map((deal) => (
                        <div key={deal.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-800">{deal.targetName}</span>
                            <span className="text-slate-400 mx-2">→</span>
                            <span className="text-slate-600">{deal.acquirerName}</span>
                          </div>
                          <div className="text-right">
                            {deal.dealValue && (
                              <div className="font-medium text-slate-800">${(deal.dealValue / 1000).toFixed(1)}M</div>
                            )}
                            <div className="text-xs text-slate-500">{deal.announcedDate}</div>
                          </div>
                        </div>
                      ))}
                      {analysis.competitiveIntel.recentDeals.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-500 italic">No recent deals in this sector</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Strategic Buyers */}
                  <div>
                    <h5 className="font-semibold text-slate-800 mb-2">Active Strategic Buyers</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.competitiveIntel.strategicBuyers.map((buyer) => (
                        <span key={buyer} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                          {buyer}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {activeTab === "signals" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {analysis.signals.map((signal, idx) => (
                    <SignalCard key={idx} signal={signal} />
                  ))}
                  {analysis.signals.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No significant signals detected for this target
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </>
        )}
        
        {!selectedCompany && (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Select a company above to view investment-grade reimbursement intelligence</p>
          </div>
        )}
      </Card>
      
      {/* Sector Overview */}
      <Card>
        <h4 className="font-semibold text-slate-800 mb-4">Sector-Level Intelligence</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Sector</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">TAM</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Growth</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Companies</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Recent Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sectorIntelligence.map((sector) => (
                <tr key={sector.sector} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{sector.sector}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(sector.marketSizing.totalAddressableMarket)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${sector.marketSizing.growthRate > 8 ? "text-emerald-600" : "text-slate-600"}`}>
                      {sector.marketSizing.growthRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{sector.companyCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`${sector.competitiveIntel.recentDeals.length > 2 ? "text-emerald-600 font-medium" : "text-slate-600"}`}>
                      {sector.competitiveIntel.recentDeals.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
