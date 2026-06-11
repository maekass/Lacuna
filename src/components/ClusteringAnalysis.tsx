"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { computeCapitalClusters } from "@/lib/data/capitalClustering";

const K = 3;

export default function ClusteringAnalysis() {
  const { verifiedCompanies } = useVerifiedDataset();
  const { clusters, unclusteredCount } = useMemo(
    () => computeCapitalClusters(verifiedCompanies),
    [verifiedCompanies],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-lacuna-border p-6"
    >
      <CuratedDatasetBanner className="mb-4" />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-text-primary">
            Capital Profile Clustering
          </h3>
          <p className="text-sm text-lacuna-text-muted">
            K-means (k={K}) on log(valuation) × log(funding), verified data only
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
          <span className="text-xs font-medium text-green-700">
            simple-statistics
          </span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Small-sample caveat:</strong>{" "}
          Cluster boundaries with n &lt; 25 companies are sensitive to
          individual data points. Use these groupings descriptively, not as
          definitive market segments. Initial centroids are fixed for
          reproducibility.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`p-4 rounded-lg border ${cluster.color}`}
          >
            <h4 className="font-semibold text-lacuna-text-primary mb-2">
              {cluster.name}
            </h4>
            <p className="text-2xl font-bold text-lacuna-text-primary mb-1">
              {cluster.companies.length}
            </p>
            <p className="text-xs text-lacuna-text-muted mb-3">companies</p>

            <div className="space-y-1 mb-4">
              {cluster.characteristics.map((char, i) => (
                <p key={i} className="text-xs text-lacuna-text-secondary">• {char}</p>
              ))}
            </div>

            <div className="space-y-1">
              {cluster.companies.slice(0, 4).map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-lacuna-text-primary">{company.name}</span>
                  <span
                    className="text-lacuna-text-muted truncate ml-2 max-w-[80px]"
                    title={company.stage}
                  >
                    {company.stage}
                  </span>
                </div>
              ))}
              {cluster.companies.length > 4 && (
                <p className="text-xs text-lacuna-text-muted">
                  +{cluster.companies.length - 4} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {unclusteredCount > 0 && (
        <p className="mt-4 text-xs text-lacuna-text-muted italic">
          {unclusteredCount} company{unclusteredCount === 1 ? "" : "ies"}{" "}
          excluded from clustering (missing publicly disclosed valuation or
          funding total).
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-lacuna-border-subtle">
        <div className="flex items-center justify-between text-xs text-lacuna-text-muted">
          <span>Algorithm: Lloyd&apos;s k-means</span>
          <span>Metric: Euclidean (log scale)</span>
          <span>Iterations: 20</span>
        </div>
      </div>
    </motion.div>
  );
}
