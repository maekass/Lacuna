"use client";

/**
 * Strategic acquirer fit (descriptive) — rule-based matches from verified deals and
 * acquirer profiles derived from the verified dataset. Not a trained model.
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import HeuristicTierBadge from "@/components/research/HeuristicTierBadge";
import {
  analyzeCompetitiveDynamics,
  type ComparableDeal,
} from "@/data/acquirer-prediction-engine";
import { RESEARCH_HEURISTIC_DISCLAIMER } from "@/lib/research/heuristicProvenance";
import { buildAcquirerProfilesFromVerified } from "@/lib/data/buildAcquirerProfilesFromVerified";
import {
  filterActiveVerifiedCompanies,
  mapVerifiedCompanyToProfile,
  mapVerifiedSectorToEngineSector,
} from "@/lib/data/companyProfileMapper";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { deriveEmpiricalPriors } from "@/lib/quant/empiricalPriors";
import AIInsightsPanel from "./AIInsightsPanel";

export default function AcquirerPredictionDashboard() {
  const {
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
  } = useVerifiedDataset();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const empiricalPriors = useMemo(
    () => deriveEmpiricalPriors(verifiedCompanies, verifiedAcquisitions),
    [verifiedCompanies, verifiedAcquisitions],
  );

  const verifiedAcquirerProfiles = useMemo(
    () =>
      buildAcquirerProfilesFromVerified(
        verifiedAcquirers,
        verifiedAcquisitions,
        verifiedCompanies,
      ),
    [verifiedAcquirers, verifiedAcquisitions, verifiedCompanies],
  );

  const companyProfiles = useMemo(
    () =>
      filterActiveVerifiedCompanies(verifiedCompanies, verifiedAcquisitions)
        .map(mapVerifiedCompanyToProfile),
    [verifiedCompanies, verifiedAcquisitions],
  );

  const verifiedComparables = useMemo((): ComparableDeal[] => {
    const sectorById = new Map(
      verifiedCompanies.map((c) => [c.id, c.sector]),
    );
    return verifiedAcquisitions
      .filter((a) => (a.dealValue ?? 0) > 0)
      .map((a) => ({
        targetName: a.targetName,
        acquirerName: a.acquirerName,
        dealValue: a.dealValue ?? 0,
        dealDate: a.announcedDate.slice(0, 7),
        sector: mapVerifiedSectorToEngineSector(
          sectorById.get(a.targetId) ?? "",
        ),
        stage: "acquired" as const,
      }));
  }, [verifiedAcquisitions, verifiedCompanies]);

  const analyses = useMemo(() => {
    return companyProfiles.map((profile) => ({
      profile,
      analysis: analyzeCompetitiveDynamics(
        profile,
        verifiedAcquirerProfiles,
        verifiedComparables,
        empiricalPriors,
      ),
    }));
  }, [
    companyProfiles,
    verifiedAcquirerProfiles,
    verifiedComparables,
    empiricalPriors,
  ]);

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
      <div className="flex flex-wrap items-center gap-2">
        <HeuristicTierBadge tier="affinity" />
        <p className="text-xs text-lacuna-text-muted">
          {empiricalPriors.derivationNote} Acquirer profiles built from{" "}
          {verifiedAcquirers.length} verified acquirers and{" "}
          {verifiedAcquisitions.length} deals. {RESEARCH_HEURISTIC_DISCLAIMER}
        </p>
      </div>

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
                <div className="text-xs text-lacuna-blue">
                  Affinity win rate
                </div>
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
                  —
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  Deal dollars not modeled
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  —
                </div>
                <div className="text-xs text-lacuna-text-muted">
                  No invented premium
                </div>
              </div>
            </div>

            {selectedAnalysis.predictedWinner && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800">
                  Most Likely Acquirer: {selectedAnalysis.predictedWinner.name}
                </div>
                <div className="text-xs text-green-600">
                  Match Score: {selectedAnalysis.topMatches[0].matchScore}/100
                  {selectedAnalysis.topMatches[0].estimatedValue
                    ? ` • Dataset median: ${
                      formatCurrency(
                        selectedAnalysis.topMatches[0].estimatedValue.median,
                      )
                    }`
                    : " • Value: insufficient disclosed comparables"}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-lacuna-border-subtle">
              <AIInsightsPanel
                companyName={selectedAnalysis.company.name}
                sector={selectedAnalysis.company.sector}
                analysis={{
                  topAcquirer: selectedAnalysis.topMatches[0]?.acquirer.name ||
                    "N/A",
                  matchScore: selectedAnalysis.topMatches[0]?.matchScore || 0,
                  estimatedValue: selectedAnalysis.topMatches[0]
                    ?.estimatedValue?.median ?? 0,
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
                          Affinity score
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
                        {match.estimatedValue
                          ? formatCurrency(match.estimatedValue.median)
                          : "—"}
                      </div>
                      <div className="text-xs text-lacuna-text-muted">
                        Dataset median
                      </div>
                    </div>
                  </div>

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

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-lacuna-plum mb-3">
              Exit timeline (qualitative)
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-sm text-lacuna-blue">
                {selectedAnalysis.timelineEstimate.months != null
                  ? `${selectedAnalysis.timelineEstimate.months} months estimated to exit`
                  : "Insufficient disclosed data — stage-month priors are not used."}
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

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-lacuna-plum mb-3">
              Sector affinity (verified deals)
            </h4>
            <p className="mb-3 text-xs text-lacuna-blue/80">
              Same-sector verified deals for affinity context — not dossier
              valuation peers or dual-source evidence.
            </p>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {!selectedCompany && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h4 className="font-semibold text-lacuna-plum mb-4">
            Active Companies — Acquirer Interest Overview
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
                    Affinity
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">
                    Dataset median
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
                      {analysis.topMatches[0]?.estimatedValue
                        ? formatCurrency(
                          analysis.topMatches[0].estimatedValue.median,
                        )
                        : "—"}
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
