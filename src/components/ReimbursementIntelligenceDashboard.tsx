"use client";

/**
 * Reimbursement Intelligence Dashboard
 *
 * Integrated dashboard that connects the BusinessModelClassifier
 * with Lacuna's actual company dataset for real-time analysis.
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  ReimbursementAnalysisResult,
  reimbursementIntelligence,
} from "@/data/reimbursement-intelligence-integration";
import { BusinessModel } from "@/data/cms-reimbursement-connector";

// Sector color mapping
const SECTOR_COLORS: Record<string, string> = {
  fertility: "bg-pink-100 text-pink-800 border-pink-300",
  maternal_health: "bg-blue-100 text-blue-800 border-blue-300",
  mental_health: "bg-purple-100 text-purple-800 border-purple-300",
  gynecology: "bg-green-100 text-green-800 border-green-300",
  pelvic_health: "bg-orange-100 text-orange-800 border-orange-300",
  menopause: "bg-yellow-100 text-yellow-800 border-yellow-300",
  contraception: "bg-indigo-100 text-indigo-800 border-indigo-300",
  breast_health: "bg-rose-100 text-rose-800 border-rose-300",
  wearable_monitoring: "bg-cyan-100 text-cyan-800 border-cyan-300",
  digital_therapeutics: "bg-teal-100 text-teal-800 border-teal-300",
};

const BUSINESS_MODEL_COLORS: Record<BusinessModel, string> = {
  "insurance-driven": "bg-green-100 text-green-800 border-green-300",
  "hybrid": "bg-blue-100 text-blue-800 border-blue-300",
  "b2c-consumer": "bg-orange-100 text-orange-800 border-orange-300",
  "unclear":
    "bg-lacuna-surface-subtle text-lacuna-text-primary border-lacuna-border-strong",
};

export default function ReimbursementIntelligenceDashboard() {
  const { verifiedCompanies } = useVerifiedDataset();
  const [analyses, setAnalyses] = useState<ReimbursementAnalysisResult[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and analyze companies
  useEffect(() => {
    const analyzeCompanies = async () => {
      await reimbursementIntelligence.initialize();

      // Map Lacuna companies to analysis format
      const companiesToAnalyze = verifiedCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        productDescription: company.description ?? "",
        sector: mapToStandardSector(company.sector),
      }));

      const results = reimbursementIntelligence.analyzeCompanies(
        companiesToAnalyze,
      );
      setAnalyses(results);
      setIsLoading(false);
    };

    analyzeCompanies();
  }, [verifiedCompanies]);

  // Filter by sector
  const filteredAnalyses = useMemo(() => {
    if (selectedSector === "all") return analyses;
    return analyses.filter((a) => a.company.sector === selectedSector);
  }, [analyses, selectedSector]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (analyses.length === 0) return null;
    return reimbursementIntelligence.getSummaryStatistics(analyses);
  }, [analyses]);

  // Get unique sectors
  const sectors = useMemo(() => {
    const sectorSet = new Set(analyses.map((a) => a.company.sector));
    return Array.from(sectorSet).sort();
  }, [analyses]);

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "Insufficient disclosed data";
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatMultiple = (value: number | null): string =>
    value === null ? "Insufficient disclosed data" : `${value.toFixed(1)}x`;

  const getBusinessModelLabel = (model: BusinessModel): string => {
    switch (model) {
      case "insurance-driven":
        return "Insurance-Driven";
      case "hybrid":
        return "Hybrid";
      case "b2c-consumer":
        return "Consumer-Only";
      default:
        return "Unclear";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lacuna-plum">
          </div>
          <span className="ml-3 text-lacuna-blue">
            Analyzing reimbursement data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />
      {/* Overview Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-lg p-4 shadow-sm border border-lacuna-lavender/20">
            <div className="text-2xl font-bold text-lacuna-plum">
              {stats.totalCompanies}
            </div>
            <div className="text-xs text-lacuna-blue">Companies Analyzed</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {stats.insuranceDriven}
            </div>
            <div className="text-xs text-green-700">Insurance-Driven</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {stats.hybrid}
            </div>
            <div className="text-xs text-blue-700">Hybrid Models</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 shadow-sm border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">
              {stats.consumerOnly}
            </div>
            <div className="text-xs text-orange-700">Consumer-Only</div>
          </div>
        </motion.div>
      )}

      {/* Average Multiple */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-purple-50 rounded-lg p-4 border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-purple-900">
                Average Valuation Multiple
              </div>
              <div className="text-3xl font-bold text-purple-700">
                {formatMultiple(stats.avgValuationMultiple)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-900">
                Reimbursement Premium Range
              </div>
              <div className="text-xl font-bold text-purple-700">
                {stats.reimbursementPremiumRange.min.toFixed(1)}x -{" "}
                {stats.reimbursementPremiumRange.max.toFixed(1)}x
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sector Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSector("all")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedSector === "all"
              ? "bg-lacuna-plum text-white"
              : "bg-lacuna-lavender/25 text-lacuna-plum hover:bg-lacuna-lavender/40"
          }`}
        >
          All Sectors
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => setSelectedSector(sector)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedSector === sector
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-lavender/25 text-lacuna-plum hover:bg-lacuna-lavender/40"
            }`}
          >
            {sector.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Company Analysis Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-lacuna-lavender/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Sector
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Business Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  CPT Codes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Est. Insurance Rev
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Valuation Multiple
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Implied Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lacuna-lavender/20">
              {filteredAnalyses.map((analysis, idx) => (
                <motion.tr
                  key={analysis.company.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-lacuna-lavender/5"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-lacuna-plum">
                      {analysis.company.name}
                    </div>
                    <div className="text-xs text-lacuna-blue truncate max-w-xs">
                      {analysis.profile.matchedCodes.slice(0, 2).map((c) =>
                        c.code
                      ).join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${
                        SECTOR_COLORS[analysis.company.sector] ||
                        "bg-lacuna-surface-subtle text-lacuna-text-primary"
                      }`}
                    >
                      {analysis.company.sector.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${
                        BUSINESS_MODEL_COLORS[
                          analysis.classification.businessModel
                        ]
                      }`}
                    >
                      {getBusinessModelLabel(
                        analysis.classification.businessModel,
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-lacuna-blue">
                    {analysis.classification.reimbursementStatus.codeCount ||
                      "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-lacuna-blue">
                    {analysis.classification.estimatedInsuranceRevenue > 0
                      ? `${
                        (analysis.classification.estimatedInsuranceRevenue /
                          (analysis.company.revenue || 1) * 100).toFixed(0)
                      }%`
                      : "0%"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        (analysis.valuation.adjustedMultiple ?? -Infinity) > 4
                          ? "text-green-600"
                          : (analysis.valuation.adjustedMultiple ?? -Infinity) >
                              2.5
                          ? "text-blue-600"
                          : "text-orange-600"
                      }`}
                    >
                      {formatMultiple(analysis.valuation.adjustedMultiple)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-lacuna-plum">
                    {formatCurrency(analysis.valuation.impliedValuation)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Summary */}
      {filteredAnalyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h4 className="font-semibold text-lacuna-plum mb-4">Key Insights</h4>
          <div className="space-y-3">
            {filteredAnalyses.slice(0, 3).map((analysis, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-lacuna-lavender/10 rounded-lg"
              >
                <span className="text-lacuna-plum font-medium">
                  {analysis.company.name}:
                </span>
                <span className="text-sm text-lacuna-blue">
                  {analysis.insights[0]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Helper to map Lacuna sector names to standard sectors
function mapToStandardSector(sector: string): string {
  const sectorMap: Record<string, string> = {
    "fertility": "fertility",
    "maternal": "maternal_health",
    "pregnancy": "maternal_health",
    "mental": "mental_health",
    "behavioral": "mental_health",
    "gynecology": "gynecology",
    "gyn": "gynecology",
    "pelvic": "pelvic_health",
    "menopause": "menopause",
    "contraception": "contraception",
    "birth control": "contraception",
    "breast": "breast_health",
    "mammography": "breast_health",
    "wearable": "wearable_monitoring",
    "device": "wearable_monitoring",
    "digital": "digital_therapeutics",
    "app": "digital_therapeutics",
    "telehealth": "digital_therapeutics",
  };

  const normalizedSector = sector.toLowerCase();

  for (const [key, value] of Object.entries(sectorMap)) {
    if (normalizedSector.includes(key)) return value;
  }

  return "digital_therapeutics";
}
