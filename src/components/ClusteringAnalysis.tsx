'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { verifiedCompanies } from '@/data/verifiedData';
import * as ss from 'simple-statistics';

export default function ClusteringAnalysis() {
  const clusters = useMemo(() => {
    const withMetrics = verifiedCompanies.filter(
      (c) => c.lastKnownValuation != null && c.totalFunding != null
    );
    if (withMetrics.length < 3) return [];

    // K-means (k=3) on disclosed valuation vs total funding (no fabricated headcount)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const K = 3;
    const data = withMetrics.map((c) => ({
      x: c.lastKnownValuation!,
      y: c.totalFunding!,
      company: c,
    }));

    // Initialize centroids
    let centroids = [
      { x: 100, y: 50 },
      { x: 500, y: 200 },
      { x: 2000, y: 500 }
    ];

    let assignments: number[] = [];
    
    // Run 10 iterations of k-means
    for (let iter = 0; iter < 10; iter++) {
      // Assign to nearest centroid
      assignments = data.map(point => {
        const distances = centroids.map(c => 
          Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2))
        );
        return distances.indexOf(Math.min(...distances));
      });

      // Update centroids
      centroids = centroids.map((_, i) => {
        const clusterPoints = data.filter((_, j) => assignments[j] === i);
        if (clusterPoints.length === 0) return centroids[i];
        return {
          x: ss.mean(clusterPoints.map(p => p.x)),
          y: ss.mean(clusterPoints.map(p => p.y))
        };
      });
    }

    // Build cluster objects
    const clusterNames = ['Emerging Startups', 'Growth Stage', 'Late Stage Scale&#45;ups'];
    const clusterColors = [
      'bg-lacuna-pink/15 border-lacuna-pink/40',
      'bg-lacuna-lavender/20 border-lacuna-lavender/50',
      'bg-lacuna-blue/10 border-lacuna-blue/30',
    ];

    return centroids.map((centroid, i) => {
      const clusterCompanies = data
        .filter((_, j) => assignments[j] === i)
        .map(d => d.company);
      
      const avgValuation = ss.mean(
        clusterCompanies.map((c) => c.lastKnownValuation || 0)
      );
      const avgFunding = ss.mean(clusterCompanies.map((c) => c.totalFunding || 0));
      const sectors = [...new Set(clusterCompanies.map((c) => c.sector))];

      return {
        id: i,
        name: clusterNames[i],
        companies: clusterCompanies,
        centroid: { valuation: centroid.x, employees: centroid.y },
        color: clusterColors[i],
        characteristics: [
          `Avg valuation: $${Math.round(avgValuation)}M`,
          `Avg disclosed funding: $${Math.round(avgFunding)}M`,
          `Sectors: ${sectors.slice(0, 3).join(', ')}${sectors.length > 3 ? '...' : ''}`,
        ],
      };
    });
  }, []);

  if (clusters.length === 0) {
    return (
      <div className="rounded-xl border border-lacuna-lavender/40 bg-white p-8 text-center">
        <p className="text-lacuna-plum font-medium">Not enough disclosed metrics to cluster</p>
        <p className="text-sm text-lacuna-blue mt-2">
          K-means needs valuation and total funding for at least three companies. Many verified
          records omit headcount and valuation by design.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">K-Means Clustering</h3>
          <p className="text-sm text-slate-500">Unsupervised ML: valuation × employees (k=3)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
          <span className="text-xs font-medium text-green-700">simple-statistics</span>
        </div>
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
                  <span className="text-slate-400">{company.stage}</span>
                </div>
              ))}
              {cluster.companies.length > 4 && (
                <p className="text-xs text-slate-400">+{cluster.companies.length - 4} more</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Algorithm: Lloyd&apos;s k-means clustering</span>
          <span>Distance metric: Euclidean</span>
          <span>Iterations: 10</span>
        </div>
      </div>
    </motion.div>
  );
}
