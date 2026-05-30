'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { verifiedCompanies } from '@/data/verifiedData';
import * as ss from 'simple-statistics';

const K = 3;

/**
 * Capital-profile clustering on verified financial data only.
 *
 * Inputs (per company): log10(lastKnownValuation), log10(totalFunding).
 * Companies missing either field are excluded from the cluster fit but
 * shown in the "unclustered" footnote so they aren't invisible.
 *
 * Honest caveat: with n<25 included companies, k-means cluster boundaries
 * are noisy. We use deterministic initial centroids on the log scale so
 * the result is reproducible across reloads.
 */
export default function ClusteringAnalysis() {
  const { clusters, unclusteredCount } = useMemo(() => {
    const clusterable = verifiedCompanies.filter(
      c => typeof c.lastKnownValuation === 'number' && typeof c.totalFunding === 'number'
    );

    const data = clusterable.map(c => ({
      x: Math.log10((c.lastKnownValuation as number) + 1),
      y: Math.log10((c.totalFunding as number) + 1),
      company: c,
    }));

    // Deterministic initial centroids spanning the log range
    let centroids = [
      { x: 1.5, y: 1.0 }, // smaller capital
      { x: 2.5, y: 2.0 }, // mid capital
      { x: 3.3, y: 2.5 }, // large capital
    ].slice(0, K);

    let assignments: number[] = [];
    for (let iter = 0; iter < 20; iter++) {
      assignments = data.map(point => {
        const distances = centroids.map(c =>
          Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2))
        );
        return distances.indexOf(Math.min(...distances));
      });

      centroids = centroids.map((prev, i) => {
        const pts = data.filter((_, j) => assignments[j] === i);
        if (pts.length === 0) return prev;
        return {
          x: ss.mean(pts.map(p => p.x)),
          y: ss.mean(pts.map(p => p.y)),
        };
      });
    }

    const clusterNames = ['Smaller Capital', 'Mid Capital', 'Large Capital'];
    const clusterColors = [
      'bg-blue-50 border-blue-200',
      'bg-purple-50 border-purple-200',
      'bg-pink-50 border-pink-200',
    ];

    const built = centroids.map((centroid, i) => {
      const members = data
        .filter((_, j) => assignments[j] === i)
        .map(d => d.company);

      const valuations = members.map(c => c.lastKnownValuation as number);
      const fundings = members.map(c => c.totalFunding as number);
      const sectors = Array.from(new Set(members.map(c => c.sector)));

      return {
        id: i,
        name: clusterNames[i],
        companies: members,
        centroid: { logVal: centroid.x, logFund: centroid.y },
        color: clusterColors[i],
        characteristics: [
          members.length > 0 && `Median valuation: $${Math.round(ss.median(valuations))}M`,
          members.length > 0 && `Median funding: $${Math.round(ss.median(fundings))}M`,
          `Sectors: ${sectors.slice(0, 3).join(', ')}${sectors.length > 3 ? '...' : ''}`,
        ].filter(Boolean) as string[],
      };
    });

    return {
      clusters: built,
      unclusteredCount: verifiedCompanies.length - clusterable.length,
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Capital Profile Clustering</h3>
          <p className="text-sm text-slate-500">K-means (k={K}) on log(valuation) × log(funding), verified data only</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
          <span className="text-xs font-medium text-green-700">simple-statistics</span>
        </div>
      </div>

      {/* Small-N caveat */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Small-sample caveat:</strong> Cluster boundaries with n &lt; 25 companies are sensitive
          to individual data points. Use these groupings descriptively, not as
          definitive market segments. Initial centroids are fixed for reproducibility.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {clusters.map((cluster) => (
          <div key={cluster.id} className={`p-4 rounded-lg border ${cluster.color}`}>
            <h4 className="font-semibold text-slate-800 mb-2">{cluster.name}</h4>
            <p className="text-2xl font-bold text-slate-900 mb-1">{cluster.companies.length}</p>
            <p className="text-xs text-slate-500 mb-3">companies</p>

            <div className="space-y-1 mb-4">
              {cluster.characteristics.map((char, i) => (
                <p key={i} className="text-xs text-slate-600">• {char}</p>
              ))}
            </div>

            <div className="space-y-1">
              {cluster.companies.slice(0, 4).map(company => (
                <div key={company.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{company.name}</span>
                  <span className="text-slate-400 truncate ml-2 max-w-[80px]" title={company.stage}>{company.stage}</span>
                </div>
              ))}
              {cluster.companies.length > 4 && (
                <p className="text-xs text-slate-400">+{cluster.companies.length - 4} more</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {unclusteredCount > 0 && (
        <p className="mt-4 text-xs text-slate-500 italic">
          {unclusteredCount} company{unclusteredCount === 1 ? '' : 'ies'} excluded from clustering
          (missing publicly disclosed valuation or funding total).
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Algorithm: Lloyd&apos;s k-means</span>
          <span>Metric: Euclidean (log scale)</span>
          <span>Iterations: 20</span>
        </div>
      </div>
    </motion.div>
  );
}
