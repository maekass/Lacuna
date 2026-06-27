"use client";

/**
 * Strategic acquirer fit (descriptive) — rule-based matches from verified deals and
 * static acquirer profiles. Not a trained model; see CuratedDatasetBanner and MODEL_CARD.md.
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  type AcquirerMatch,
  analyzeCompetitiveDynamics,
  type CompanyProfile,
  type ComparableDeal,
  type CompetitiveAnalysis,
  STRATEGIC_ACQUIRERS,
} from "@/data/acquirer-prediction-engine";
import AIInsightsPanel from "./AIInsightsPanel";

// Generate company profiles from verified dataset
type VerifiedCompanyLike = {
  id?: string;
  name: string;
  sector?: string;
  industry?: string;
  stage?: string;
  fundingStage?: string;
  description?: string;
  business?: string;
  fundingTotal?: number;
  foundedDate?: string;
};

function generateCompanyProfiles(
  verifiedCompanies: VerifiedCompanyLike[],
): CompanyProfile[] {
  return verifiedCompanies.slice(0, 8).map((company, idx) => ({
    id: company.id ?? `comp-${idx}`,
    name: company.name,
    sector: mapToSector(company.sector ?? company.industry ?? "digital_health"),
    stage: mapToStage(company.stage ?? company.fundingStage ?? "series_a"),
    capabilities: extractCapabilities(
      company.description ?? company.business ?? "",
    ),
    technology: extractTechnologies(company.description ?? ""),
    fundingTotal: company.fundingTotal ?? 0,
    foundingDate: company.foundedDate ?? "2018-01-01",
    // FDA status not in the verified dataset — omit rather than fabricate
  }));
}

function mapToSector(sector: string): string {
  const map: Record<string, string> = {
    "fertility": "fertility",
    "maternal": "maternal_health",
    "mental": "mental_health",
    "gynecology": "womens_health",
    "telehealth": "telehealth",
    "digital": "digital_therapeutics",
    "app": "digital_health",
    "wearable": "diagnostics",
  };

  const normalized = sector.toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value;
  }
  return "digital_health";
}

function mapToStage(stage: string): CompanyProfile["stage"] {
  const normalized = stage.toLowerCase();
  if (normalized.includes("seed")) return "seed";
  if (normalized.includes("a")) return "series_a";
  if (normalized.includes("b")) return "series_b";
  if (normalized.includes("c") || normalized.includes("d")) return "growth";
  return "series_a";
}

function extractCapabilities(description: string): string[] {
  const caps: string[] = [];
  if (description.includes("AI") || description.includes("machine learning")) {
    caps.push("Software & analytics");
  }
  if (description.includes("telehealth") || description.includes("virtual")) {
    caps.push("telehealth");
  }
  if (description.includes("diagnostic")) caps.push("diagnostics");
  if (description.includes("fertility")) caps.push("fertility services");
  if (description.includes("mental") || description.includes("therapy")) {
    caps.push("mental health");
  }
  if (description.includes("coaching") || description.includes("care")) {
    caps.push("care coordination");
  }
  return caps.length > 0 ? caps : ["digital health platform"];
}

function extractTechnologies(description: string): string[] {
  const techs: string[] = [];
  if (description.includes("app")) techs.push("mobile app");
  if (description.includes("platform")) techs.push("platform technology");
  if (description.includes("data")) techs.push("data analytics");
  if (description.includes("AI")) techs.push("artificial intelligence");
  return techs.length > 0 ? techs : ["healthcare technology"];
}

export default function AcquirerPredictionDashboard() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const companyProfiles = useMemo(
    () => generateCompanyProfiles(verifiedCompanies),
    [verifiedCompanies],
  );

  // Build ComparableDeal[] from the verified dataset — no fabricated deals.
  // Only include acquisitions with a disclosed deal value.
  const verifiedComparables = useMemo((): ComparableDeal[] => {
    const sectorById = new Map(
      verifiedCompanies.map((c) => [c.id, c.sector ?? ""]),
    );
    return verifiedAcquisitions
      .filter((a) => (a.dealValue ?? 0) > 0)
      .map((a) => ({
        targetName: a.targetName,
        acquirerName: a.acquirerName,
        dealValue: a.dealValue ?? 0,
        dealDate: a.announcedDate.slice(0, 7),
        sector: mapToSector(sectorById.get(a.targetId) ?? ""),
        stage: "acquired" as const,
        // revenueMultiple omitted — not in verified dataset
      }));
  }, [verifiedAcquisitions, verifiedCompanies]);

  const analyses = useMemo(() => {
    return companyProfiles.map((profile) => ({
      profile,
      analysis: analyzeCompetitiveDynamics(
        profile,
        undefined,
        verifiedComparables,
      ),
    }));
  }, [companyProfiles, verifiedComparables]);

  const selectedAnalysis = selectedCompany
    ? analyses.find((a) => a.profile.id === selectedCompany)?.analysis
    : null;

  const formatCurrency = (value: number): string => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value}M`;
  };

  const getLikelihoodColor = (likelihood: string): string => {
    switch (likelihood) {
      case "high":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-lacuna-surface-subtle text-lacuna-text-primary border-lacuna-border-strong";
      default:
        return "bg-lacuna-surface-subtle text-lacuna-text-primary";
    }
  };

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />
      {/* Company Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-sm font-semibold text-lacuna-plum mb-3">
          Select Company to Analyze
        </h4>
        <div className="flex flex-wrap gap-2">
          {companyProfiles.map((company) => (
            <button
              key={company.id}
              onClick={() =>
                setSelectedCompany(
                  company.id === selectedCompany ? null : company.id,
                )}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCompany === company.id
                  ? "bg-lacuna-plum text-white shadow-md"
                  : "bg-lacuna-lavender/25 text-lacuna-plum hover:bg-lacuna-lavender/40"
              }`}
            >
              {company.name}
              <span className="ml-2 text-xs opacity-75">
                ({company.sector})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Company Analysis */}
      {selectedAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-lacuna-plum">
                  {selectedAnalysis.company.name}
                </h3>
                <p className="text-sm text-lacuna-blue">
                  {selectedAnalysis.company.sector.replace(/_/g, " ")} •{" "}
                  {selectedAnalysis.company.stage.replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-lacuna-plum">
                  {Math.round(selectedAnalysis.winProbability * 100)}%
                </div>
                <div className="text-xs text-lacuna-blue">Win Probability</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-lacuna-border-subtle">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {selectedAnalysis.topMatches.filter((m) =>
                    m.likelihood === "high"
                  ).length}
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  High Interest Acquirers
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-lacuna-plum">
                  {formatCurrency(selectedAnalysis.fairValueEstimate.median)}
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  Estimated Fair Value
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {selectedAnalysis.estimatedBiddingWarPremium > 0
                    ? `+${selectedAnalysis.estimatedBiddingWarPremium}%`
                    : "None"}
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  Potential Premium
                </div>
              </div>
            </div>

            {selectedAnalysis.predictedWinner && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800">
                  Most Likely Acquirer: {selectedAnalysis.predictedWinner.name}
                </div>
                <div className="text-xs text-green-600">
                  Match Score:{" "}
                  {selectedAnalysis.topMatches[0].matchScore}/100 • Estimated
                  Value: {formatCurrency(
                    selectedAnalysis.topMatches[0].estimatedValue.median,
                  )}
                </div>
              </div>
            )}

            {/* AI-Generated Insights */}
            <div className="mt-6 pt-6 border-t border-lacuna-border-subtle">
              <AIInsightsPanel
                companyName={selectedAnalysis.company.name}
                sector={selectedAnalysis.company.sector}
                analysis={{
                  topAcquirer: selectedAnalysis.topMatches[0]?.acquirer.name ||
                    "N/A",
                  matchScore: selectedAnalysis.topMatches[0]?.matchScore || 0,
                  estimatedValue: selectedAnalysis.fairValueEstimate.median,
                  competitiveThreat: selectedAnalysis.competitiveThreatLevel,
                }}
              />
            </div>
          </div>

          {/* Acquirer Rankings */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-lacuna-border-subtle">
              <h4 className="font-semibold text-lacuna-plum">
                Acquirer Rankings
              </h4>
            </div>
            <div className="divide-y divide-lacuna-border-subtle">
              {selectedAnalysis.topMatches.map((match, idx) => (
                <div
                  key={match.acquirer.id}
                  className="px-6 py-4 hover:bg-lacuna-surface-muted"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-lacuna-text-muted/80 w-8">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-lacuna-plum">
                          {match.acquirer.name}
                        </div>
                        <div className="text-xs text-lacuna-blue">
                          {match.acquirer.type.replace(/_/g, " ")} • Deal size:
                          {" "}
                          {formatCurrency(
                            match.acquirer.typicalDealSize.min,
                          )}-{formatCurrency(
                            match.acquirer.typicalDealSize.max,
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-lacuna-plum">
                          {match.matchScore}
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          Match Score
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          getLikelihoodColor(match.likelihood)
                        }`}
                      >
                        {match.likelihood.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="mt-3 grid grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-lacuna-surface-muted rounded">
                      <div className="text-sm font-semibold text-lacuna-plum">
                        {match.strategicFit}
                      </div>
                      <div className="text-xs text-lacuna-text-muted">
                        Strategic Fit
                      </div>
                    </div>
                    <div className="p-2 bg-lacuna-surface-muted rounded">
                      <div className="text-sm font-semibold text-lacuna-plum">
                        {match.marketFit}
                      </div>
                      <div className="text-xs text-lacuna-text-muted">
                        Market Fit
                      </div>
                    </div>
                    <div className="p-2 bg-lacuna-surface-muted rounded">
                      <div className="text-sm font-semibold text-lacuna-plum">
                        {match.financialFit}
                      </div>
                      <div className="text-xs text-lacuna-text-muted">
                        Financial Fit
                      </div>
                    </div>
                    <div className="p-2 bg-lacuna-surface-muted rounded">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(match.estimatedValue.median)}
                      </div>
                      <div className="text-xs text-lacuna-text-muted">
                        Estimated Value
                      </div>
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.keyRationale.map((reason, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline & Triggers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-lacuna-plum mb-3">
              Exit Timeline Estimate
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-lacuna-plum">
                {selectedAnalysis.timelineEstimate.months}
              </div>
              <div className="text-sm text-lacuna-blue">
                months estimated to exit
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium text-lacuna-text-primary mb-2">
                Events that could accelerate:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAnalysis.timelineEstimate.triggers.map((
                  trigger,
                  i,
                ) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200"
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sector Comparables */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-lacuna-plum mb-3">
              Recent Sector Comparables
            </h4>
            <div className="space-y-2">
              {selectedAnalysis.sectorComparables.slice(0, 3).map((deal, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-lacuna-surface-muted rounded"
                >
                  <div>
                    <span className="font-medium text-sm">
                      {deal.targetName}
                    </span>
                    <span className="text-lacuna-text-muted text-xs ml-2">
                      → {deal.acquirerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(deal.dealValue)}
                    </div>
                    {deal.revenueMultiple && (
                      <div className="text-xs text-lacuna-text-muted">
                        {deal.revenueMultiple}x revenue
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* All Companies Overview */}
      {!selectedCompany && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="font-semibold text-lacuna-plum mb-4">
            All Companies - Acquirer Interest Overview
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-lacuna-lavender/10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Company
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">
                    Sector
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">
                    Top Acquirer
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">
                    Match
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">
                    Est. Value
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">
                    Interest Level
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lacuna-border-subtle">
                {analyses.map(({ profile, analysis }) => (
                  <tr
                    key={profile.id}
                    className="hover:bg-lacuna-surface-muted cursor-pointer"
                    onClick={() => setSelectedCompany(profile.id)}
                  >
                    <td className="px-4 py-3 font-medium text-lacuna-plum">
                      {profile.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-lacuna-blue">
                      {profile.sector.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {analysis.topMatches[0]?.acquirer.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {analysis.topMatches[0]?.matchScore || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(analysis.fairValueEstimate.median)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          getLikelihoodColor(
                            analysis.topMatches[0]?.likelihood || "low",
                          )
                        }`}
                      >
                        {analysis.topMatches[0]?.likelihood?.toUpperCase() ||
                          "LOW"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
