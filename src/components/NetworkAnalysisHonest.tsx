/**
 * Honest Network Analysis Component
 * 
 * Network analysis for small samples (n=15-20) that is transparent about
 * what we can and cannot reveal.
 * 
 * Features:
 * - Tier 1: What we CANNOT claim (power laws, preferential attachment)
 * - Tier 2: Descriptive metrics with bootstrap CIs
 * - Buyer concentration (Gini, HHI) instead of power law fitting
 * - Null model comparison
 * - Exploratory visualization with caveats
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  degreeDistribution,
  networkDensity,
  clusteringCoefficient,
  averageShortestPath,
  giniCoefficient,
  herfindahlIndex,
  nullModelComparison,
  temporalAnalysis,
  communityDetection,
  strategicPositioning,
  networkStabilityAnalysis,
  POWER_LAW_LIMITATIONS,
  type NetworkNode,
  type NetworkEdge
} from '@/lib/network/networkStatistics';
import StrategicPositioningMap from './StrategicPositioningMap';
import { getVerifiedNetworkGraph } from '@/lib/data/verifiedDatasetAdapters';

const { nodes: SAMPLE_NODES, edges: SAMPLE_EDGES } = getVerifiedNetworkGraph();

export default function NetworkAnalysisHonest() {
  const [activeTab, setActiveTab] = useState<'descriptive' | 'concentration' | 'temporal' | 'communities' | 'positioning' | 'stability' | 'null_model' | 'limitations'>('descriptive');

  // Calculate all network statistics
  const stats = useMemo(() => {
    const degree = degreeDistribution(SAMPLE_NODES, SAMPLE_EDGES);
    const density = networkDensity(SAMPLE_NODES.length, SAMPLE_EDGES.length);
    const clustering = clusteringCoefficient(SAMPLE_NODES, SAMPLE_EDGES);
    const paths = averageShortestPath(SAMPLE_NODES, SAMPLE_EDGES);
    
    // Acquirer concentration analysis
    const acquirers = SAMPLE_NODES.filter(n => n.type === 'acquirer');
    const acquirerDeals = acquirers.map(a => {
      return SAMPLE_EDGES.filter(e => e.source === a.id && e.type === 'acquisition').length;
    });
    
    const gini = giniCoefficient(acquirerDeals);
    const hhi = herfindahlIndex(acquirerDeals);
    const nullModel = nullModelComparison(acquirerDeals);
    const temporal = temporalAnalysis(SAMPLE_EDGES);
    const communities = communityDetection(SAMPLE_NODES, SAMPLE_EDGES);
    const positioning = strategicPositioning(SAMPLE_NODES, SAMPLE_EDGES);
    const stability = networkStabilityAnalysis(SAMPLE_NODES, SAMPLE_EDGES);
    
    return { degree, density, clustering, paths, gini, hhi, nullModel, temporal, communities, positioning, stability, acquirers, acquirerDeals };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Critical Warning Header */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-2xl">⚠️</span>
          <div>
            <h2 className="font-medium text-red-900 text-lg" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Small-N Network Analysis
            </h2>
            <p className="text-sm text-red-700 mt-1">
              Network has only {SAMPLE_NODES.length} nodes and {SAMPLE_EDGES.length} edges. 
              <strong> Standard network metrics (power laws, centrality) are unreliable at this scale.</strong> 
              Use descriptive concentration metrics instead.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}>
          Honest Network Analysis
        </h3>
        <p className="text-sm tracking-widest text-gray-500 mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Bootstrap CIs | Gini/HHI Concentration | Null Model Comparison
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'descriptive', label: 'Descriptives + CIs' },
            { id: 'concentration', label: 'Buyer Concentration' },
            { id: 'temporal', label: 'Temporal Analysis' },
            { id: 'communities', label: 'Community Detection' },
            { id: 'positioning', label: 'Strategic Positioning' },
            { id: 'stability', label: 'Stability Analysis' },
            { id: 'null_model', label: 'Null Model Comparison' },
            { id: 'limitations', label: 'What We Cannot Claim' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {/* Descriptives Tab */}
      {activeTab === 'descriptive' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Network Size
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                {SAMPLE_NODES.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">nodes, {SAMPLE_EDGES.length} edges</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Density
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                {(stats.density.density * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">{stats.density.interpretation}</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Components
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#E8B4B8' }}>
                {stats.paths.componentSizes.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {stats.paths.isConnected ? 'fully connected' : 'fragmented'}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="text-xs text-gray-500 uppercase mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Diameter
              </div>
              <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#B8A9C9' }}>
                {stats.paths.diameter}
              </div>
              <div className="text-xs text-gray-600 mt-1">longest path</div>
            </div>
          </div>

          {/* Degree Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Degree Distribution (Robust Statistics)
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Reporting <strong>median + IQR</strong> instead of mean ± SD (more robust for small n)
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  {stats.degree.median}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Median Degree
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  [{stats.degree.iqr[0]}, {stats.degree.iqr[1]}]
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  IQR
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  {stats.degree.min}-{stats.degree.max}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Range
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  {stats.degree.mean.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Mean (less robust)
                </div>
              </div>
            </div>

            {/* Distribution histogram */}
            <div className="mt-4">
              <div className="text-xs text-gray-500 uppercase mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Distribution
              </div>
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const counts = new Map<number, number>();
                  stats.degree.distribution.forEach(d => {
                    counts.set(d, (counts.get(d) || 0) + 1);
                  });
                  const maxCount = Math.max(...Array.from(counts.values()), 1);
                  const sortedDegrees = Array.from(counts.keys()).sort((a, b) => a - b);
                  
                  return sortedDegrees.map(degree => {
                    const count = counts.get(degree) || 0;
                    const height = (count / maxCount) * 100;
                    return (
                      <div key={degree} className="flex-1 flex flex-col items-center group">
                        <div 
                          className="w-full bg-[#5D4E6D] rounded-t hover:bg-[#7D6E8D] transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${count} nodes with degree ${degree}`}
                        />
                        <div className="text-xs text-gray-500 mt-1">{degree}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Clustering with Bootstrap CI */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Clustering Coefficient (with Bootstrap CI)
            </h4>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                  {stats.clustering.average.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Average
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                  [{stats.clustering.bootstrap.lower.toFixed(3)}, {stats.clustering.bootstrap.upper.toFixed(3)}]
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  95% Bootstrap CI
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#B8A9C9' }}>
                  {stats.clustering.bootstrap.numSamples}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Bootstrap Samples
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Interpretation:</strong> Average clustering of {stats.clustering.average.toFixed(3)} 
              with wide 95% CI of [{stats.clustering.bootstrap.lower.toFixed(3)}, {stats.clustering.bootstrap.upper.toFixed(3)}] 
              reflects substantial uncertainty due to small n. 
              {stats.clustering.average < 0.1 ? 'Low clustering suggests minimal triadic closure (few acquirer cliques).' : 
               stats.clustering.average < 0.3 ? 'Moderate clustering suggests some acquirer overlap.' :
               'High clustering suggests strong acquirer community structure.'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Concentration Tab */}
      {activeTab === 'concentration' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Buyer Concentration Analysis
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Why these metrics instead of power law?</strong> Gini and HHI are 
              defensible for small n; power law fitting requires n&gt;100 (Clauset et al., 2009).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Gini Coefficient */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h5 className="text-sm uppercase tracking-wider text-purple-700 mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Gini Coefficient
                </h5>
                <div className="text-4xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                  {stats.gini.gini.toFixed(3)}
                </div>
                <div className="text-xs text-gray-600 mt-2">{stats.gini.interpretation}</div>
                <div className="text-xs text-gray-500 mt-1">
                  0 = perfect equality, 1 = max inequality
                </div>
              </div>

              {/* HHI */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                <h5 className="text-sm uppercase tracking-wider text-blue-700 mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Herfindahl-Hirschman Index
                </h5>
                <div className="text-4xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                  {stats.hhi.hhi.toFixed(0)}
                </div>
                <div className="text-xs text-gray-600 mt-2">{stats.hhi.interpretation}</div>
                <div className="text-xs text-gray-500 mt-1">
                  DOJ: &lt;1500 unconcentrated, 1500-2500 moderate, &gt;2500 highly concentrated
                </div>
              </div>
            </div>

            {/* Top-K Concentration */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Top-K Concentration of Acquisitions
              </h5>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                    {(stats.gini.topConcentration.top1 * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase">Top 1 Acquirer</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                    {(stats.gini.topConcentration.top3 * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase">Top 3 Acquirers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                    {(stats.gini.topConcentration.top5 * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase">Top 5 Acquirers</div>
                </div>
              </div>
            </div>

            {/* Acquirer Deal Counts */}
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Deals per Acquirer
              </h5>
              <div className="space-y-2">
                {stats.acquirers.map((a, i) => {
                  const deals = stats.acquirerDeals[i];
                  const maxDeals = Math.max(...stats.acquirerDeals, 1);
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium">{a.label}</div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#5D4E6D] flex items-center justify-end pr-2 text-xs text-white"
                          style={{ width: `${(deals / maxDeals) * 100}%`, minWidth: deals > 0 ? '30px' : '0' }}
                        >
                          {deals}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Temporal Analysis Tab */}
      {activeTab === 'temporal' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Acquisition Velocity Over Time
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                  {stats.temporal.totalAcquisitions}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Total Events
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                  {stats.temporal.yearRange[1] - stats.temporal.yearRange[0] + 1}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Year Span
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#E8B4B8' }}>
                  {stats.temporal.median}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Median/Year
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#B8A9C9' }}>
                  [{stats.temporal.iqr[0]}, {stats.temporal.iqr[1]}]
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  IQR
                </div>
              </div>
            </div>

            {/* Yearly Bar Chart */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Deals per Year
              </div>
              <div className="flex items-end gap-2 h-32">
                {(() => {
                  const maxCount = Math.max(...stats.temporal.yearlyData.map(d => d.count), 1);
                  return stats.temporal.yearlyData.map(d => (
                    <div key={d.year} className="flex-1 flex flex-col items-center group">
                      <div className="text-xs text-gray-600 mb-1">{d.count}</div>
                      <div 
                        className="w-full bg-gradient-to-t from-[#5D4E6D] to-[#B8A9C9] rounded-t hover:opacity-80 transition-opacity"
                        style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                        title={`${d.year}: ${d.count} deals`}
                      />
                      <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {d.year}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Trend Assessment */}
            <div className="mt-8 bg-gray-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Trend Assessment (with caveats)
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Direction</div>
                  <div className="font-medium capitalize">{stats.temporal.trend.interpretation.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Slope</div>
                  <div className="font-medium">{stats.temporal.trend.slope.toFixed(2)}/year</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">R²</div>
                  <div className="font-medium">{stats.temporal.trend.rSquared.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Confidence</div>
                  <div className={`font-medium capitalize ${
                    stats.temporal.trend.confidence === 'high' ? 'text-green-600' :
                    stats.temporal.trend.confidence === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {stats.temporal.trend.confidence.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Caveats */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              <strong className="block mb-1">Caveats:</strong>
              <ul className="space-y-0.5">
                {stats.temporal.caveats.map((caveat, i) => (
                  <li key={i}>• {caveat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Honest Interpretation */}
          <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Temporal Interpretation
            </h4>
            <p className="text-sm leading-relaxed">
              With {stats.temporal.totalAcquisitions} events over {stats.temporal.yearRange[1] - stats.temporal.yearRange[0] + 1} years, 
              year-to-year variation is high. Trend shows {stats.temporal.trend.interpretation.replace('_', ' ')} pattern 
              with R² = {stats.temporal.trend.rSquared.toFixed(2)} ({stats.temporal.trend.confidence.replace('_', ' ')} confidence). 
              <strong> Do not extrapolate this trend forward</strong> - too noisy for forecasting.
            </p>
          </div>
        </motion.div>
      )}

      {/* Community Detection Tab */}
      {activeTab === 'communities' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Community Detection (Simplified Louvain)
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Identifies clusters via greedy modularity optimization. <strong>Treat as exploratory only.</strong>
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                  {stats.communities.numCommunities}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Communities Found
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                  {stats.communities.modularity.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Modularity (Q)
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className={`text-2xl font-light ${stats.communities.stability.score > 0.85 ? 'text-green-600' : stats.communities.stability.score > 0.7 ? 'text-yellow-600' : 'text-red-600'}`} style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  {(stats.communities.stability.score * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Stability
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: stats.communities.stability.isReliable ? '#22c55e' : '#e76f51' }}>
                  {stats.communities.stability.isReliable ? 'Reliable' : 'Unreliable'}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Assessment
                </div>
              </div>
            </div>

            {/* Community Sizes */}
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Community Size Distribution
              </h5>
              <div className="space-y-2">
                {stats.communities.communitySizes.map((size, i) => {
                  const maxSize = Math.max(...stats.communities.communitySizes, 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-24 text-sm">Community {i + 1}</div>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#5D4E6D] flex items-center justify-end pr-2 text-xs text-white"
                          style={{ width: `${(size / maxSize) * 100}%`, minWidth: '30px' }}
                        >
                          {size}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Qualitative Descriptions */}
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Qualitative Descriptions
              </h5>
              <ul className="space-y-2 text-sm text-gray-700">
                {stats.communities.qualitativeDescription.map((desc, i) => (
                  <li key={i} className="border-l-2 border-[#5D4E6D] pl-3">{desc}</li>
                ))}
              </ul>
            </div>

            {/* Stability Assessment */}
            <div className={`mt-4 p-3 rounded border ${
              stats.communities.stability.isReliable 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            } text-sm`}>
              <strong>Stability Assessment:</strong> {stats.communities.stability.interpretation}. 
              Score of {stats.communities.stability.score.toFixed(2)} measured via 10 random subset perturbations.
            </div>

            {/* Caveats */}
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              <strong className="block mb-1">Critical Caveats:</strong>
              <ul className="space-y-0.5">
                {stats.communities.caveats.map((caveat, i) => (
                  <li key={i}>• {caveat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Honest Interpretation */}
          <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Community Interpretation
            </h4>
            <p className="text-sm leading-relaxed">
              Greedy modularity optimization identified {stats.communities.numCommunities} clusters with 
              modularity Q = {stats.communities.modularity.toFixed(3)}. Stability assessment gives 
              {(stats.communities.stability.score * 100).toFixed(0)}% consistency under perturbation, 
              indicating <strong>{stats.communities.stability.isReliable ? 'meaningful structure' : 'likely small-n artifact'}</strong>. 
              {stats.communities.qualitativeDescription.length > 0 
                ? ' Qualitative description: communities tend to cluster by sector and acquirer relationships.' 
                : ''}
              <strong> Adding 5 more nodes would likely change community structure significantly.</strong>
            </p>
          </div>
        </motion.div>
      )}

      {/* Strategic Positioning Tab */}
      {activeTab === 'positioning' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <StrategicPositioningMap result={stats.positioning} />
        </motion.div>
      )}

      {/* Stability Analysis Tab */}
      {activeTab === 'stability' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Network Stability Analysis
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              How robust are findings to adding more data? Lower coefficient of variation (CV) = more stable.
            </p>

            {/* Stability Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#5D4E6D' }}>
                  {stats.stability.recommendedSampleSize}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Target Sample Size
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#4A5D8A' }}>
                  {stats.stability.findingReliability.filter(f => f.reliability === 'high').length}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  High Reliability Findings
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Bodoni MT', Didot, serif", color: '#e76f51' }}>
                  {stats.stability.findingReliability.filter(f => f.reliability === 'low').length}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  Low Reliability Findings
                </div>
              </div>
            </div>

            {/* Metric Stability Table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-200" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  <th className="text-left py-2">Metric</th>
                  <th className="text-right py-2">Mean</th>
                  <th className="text-right py-2">SD</th>
                  <th className="text-right py-2">CV</th>
                  <th className="text-center py-2">Stable?</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.stability.metricStability).map(([metric, s]) => (
                  <tr key={metric} className="border-b border-gray-100">
                    <td className="py-2 font-medium capitalize">{metric.replace(/_/g, ' ')}</td>
                    <td className="py-2 text-right">{s.mean.toFixed(3)}</td>
                    <td className="py-2 text-right text-gray-500">{s.sd.toFixed(3)}</td>
                    <td className={`py-2 text-right ${s.cv < 0.15 ? 'text-green-600' : s.cv < 0.30 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {(s.cv * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-center">
                      {s.isStable ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Finding Reliability Rankings */}
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Findings Ranked by Reliability (most → least stable)
              </h5>
              <div className="space-y-2">
                {stats.stability.findingReliability.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{f.finding}</div>
                      <div className="text-xs text-gray-500">CV = {(f.cv * 100).toFixed(1)}%</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded uppercase ${
                      f.reliability === 'high' ? 'bg-green-100 text-green-700' :
                      f.reliability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {f.reliability}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Strategy */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <h5 className="font-medium text-blue-800 mb-2 text-sm" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                Validation Strategy
              </h5>
              <ul className="space-y-1 text-sm text-blue-700">
                {stats.stability.validationStrategy.map((step, i) => (
                  <li key={i}>{i + 1}. {step}</li>
                ))}
              </ul>
            </div>

            {/* Caveats */}
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <h5 className="font-medium text-amber-800 mb-1 text-sm">Caveats</h5>
              <ul className="space-y-0.5 text-sm text-amber-700">
                {stats.stability.caveats.map((caveat, i) => (
                  <li key={i}>• {caveat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Honest Interpretation */}
          <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Stability Summary
            </h4>
            <p className="text-sm leading-relaxed">
              Of 5 network metrics tested, {Object.values(stats.stability.metricStability).filter(m => m.isStable).length} are stable (CV &lt; 15%). 
              Recommend collecting data to n={stats.stability.recommendedSampleSize} for reliable findings. 
              <strong> Treat low-reliability findings as exploratory only.</strong> When sample reaches 25 acquisitions, 
              refit all models and compare - substantial changes (&gt;20%) indicate original findings were unstable.
            </p>
          </div>
        </motion.div>
      )}

      {/* Null Model Tab */}
      {activeTab === 'null_model' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Null Model Comparison
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              What concentration would we expect if acquisitions were distributed <strong>randomly</strong>? 
              Comparison against this null model tells us whether observed concentration is meaningful.
            </p>

            <div className="space-y-4">
              {/* Gini Comparison */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-baseline mb-2">
                  <h5 className="font-medium">Gini Coefficient</h5>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    Math.abs(stats.nullModel.zScore.gini) > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    z = {stats.nullModel.zScore.gini.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Observed:</div>
                    <div className="font-medium">{stats.nullModel.observed.gini.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Random baseline:</div>
                    <div className="font-medium">
                      {stats.nullModel.randomBaseline.gini.mean.toFixed(3)} 
                      <span className="text-gray-500 ml-1">
                        [{stats.nullModel.randomBaseline.gini.ci[0].toFixed(3)}, {stats.nullModel.randomBaseline.gini.ci[1].toFixed(3)}]
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HHI Comparison */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-baseline mb-2">
                  <h5 className="font-medium">Herfindahl Index</h5>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    Math.abs(stats.nullModel.zScore.hhi) > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    z = {stats.nullModel.zScore.hhi.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Observed:</div>
                    <div className="font-medium">{stats.nullModel.observed.hhi.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Random baseline:</div>
                    <div className="font-medium">
                      {stats.nullModel.randomBaseline.hhi.mean.toFixed(0)}
                      <span className="text-gray-500 ml-1">
                        [{stats.nullModel.randomBaseline.hhi.ci[0].toFixed(0)}, {stats.nullModel.randomBaseline.hhi.ci[1].toFixed(0)}]
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 3 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-baseline mb-2">
                  <h5 className="font-medium">Top-3 Concentration</h5>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    Math.abs(stats.nullModel.zScore.top3) > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    z = {stats.nullModel.zScore.top3.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Observed:</div>
                    <div className="font-medium">{(stats.nullModel.observed.top3 * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Random baseline:</div>
                    <div className="font-medium">
                      {(stats.nullModel.randomBaseline.top3.mean * 100).toFixed(0)}%
                      <span className="text-gray-500 ml-1">
                        [{(stats.nullModel.randomBaseline.top3.ci[0] * 100).toFixed(0)}%, {(stats.nullModel.randomBaseline.top3.ci[1] * 100).toFixed(0)}%]
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Interpretation:</strong> {stats.nullModel.interpretation}.
              {Math.abs(stats.nullModel.zScore.gini) > 2 
                ? ' Top acquirers are concentrating deals beyond what random allocation would produce, suggesting strategic targeting.'
                : ' Observed concentration is within range of random allocation; not strong evidence of strategic targeting.'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Limitations Tab */}
      {activeTab === 'limitations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h4 className="font-medium text-red-800 mb-4" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
              ✗ What We CANNOT Reliably Claim
            </h4>
            <ul className="space-y-3 text-sm text-red-700">
              <li>
                <strong>✗ Power-law distribution</strong>
                <div className="text-xs mt-1 ml-4">
                  Power law fitting to n={SAMPLE_NODES.length} is unreliable. Requires n&gt;{POWER_LAW_LIMITATIONS.minimumSampleSize} 
                  (Clauset et al., 2009).
                </div>
              </li>
              <li>
                <strong>✗ Preferential attachment mechanism</strong>
                <div className="text-xs mt-1 ml-4">
                  Requires temporal data showing growth dynamics + n&gt;100. We have a snapshot.
                </div>
              </li>
              <li>
                <strong>✗ Network topology generalizes</strong>
                <div className="text-xs mt-1 ml-4">
                  This is one snapshot of FemTech acquisitions, not a representative population sample.
                </div>
              </li>
              <li>
                <strong>✗ Specific centrality rankings</strong>
                <div className="text-xs mt-1 ml-4">
                  Betweenness/eigenvector centrality has high variance with n=15. Adding one acquisition 
                  could reshuffle rankings.
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
              Why We Don't Fit Power Laws (Detailed)
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {POWER_LAW_LIMITATIONS.whyNotFit.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <h5 className="font-medium text-green-800 mb-2 text-sm">What We Do Instead</h5>
              <ul className="space-y-1 text-sm text-green-700">
                {POWER_LAW_LIMITATIONS.whatToDoInstead.map((solution, i) => (
                  <li key={i}>✓ {solution}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 text-xs text-gray-500 italic">
              Reference: {POWER_LAW_LIMITATIONS.reference}
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
            <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Honest Network Analysis Summary
            </h4>
            <p className="text-sm leading-relaxed">
              With {SAMPLE_NODES.length} nodes and {SAMPLE_EDGES.length} edges, we focus on what's defensible: 
              bootstrap confidence intervals, robust concentration metrics (Gini, HHI), and null model comparison. 
              We <strong>do not</strong> fit power laws, claim preferential attachment, or rank specific 
              centralities. The acquisition network shows {stats.gini.interpretation.toLowerCase()} with top-3 
              acquirers controlling {(stats.gini.topConcentration.top3 * 100).toFixed(0)}% of deals - 
              {Math.abs(stats.nullModel.zScore.gini) > 2 
                ? ' more concentrated than random allocation, suggesting strategic targeting.' 
                : ' within range of random allocation.'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
