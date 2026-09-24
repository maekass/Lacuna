"use client";

/**
 * Acquirer Fit & Precedent Map — deterministic context engine.
 * Rule-based matches from verified deals and acquirer profiles. Not a trained model.
 */

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  analyzeCompetitiveDynamics,
  type ComparableDeal,
} from "@/data/acquirer-prediction-engine";
import { DETERMINISTIC_COMPARISON_BOUNDARY } from "@/lib/research/evidenceBoundaries";
import ResearchIntegrityNote from "@/components/research/ResearchIntegrityNote";
import { buildAcquirerProfilesFromVerified } from "@/lib/data/buildAcquirerProfilesFromVerified";
import {
  filterActiveVerifiedCompanies,
  mapVerifiedCompanyToProfile,
  mapVerifiedSectorToEngineSector,
} from "@/lib/data/companyProfileMapper";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { deriveEmpiricalPriors } from "@/lib/quant/empiricalPriors";

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
      .filter((a): a is typeof a & { dealValue: number } =>
        typeof a.dealValue === "number" && a.dealValue > 0
      )
      .map((a) => ({
        targetName: a.targetName,
        acquirerName: a.acquirerName,
        dealValue: a.dealValue,
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

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-lacuna-text-muted">
          Historical profile overlap only. {empiricalPriors.derivationNote}{" "}
          Acquirer profiles built from {verifiedAcquirers.length}{" "}
          verified acquirers and {verifiedAcquisitions.length} deals.
        </p>
      </div>
      <ResearchIntegrityNote />
      <p
        role="note"
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
      >
        {DETERMINISTIC_COMPARISON_BOUNDARY}
      </p>

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
                  Historical acquisition-pattern similarity
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-lacuna-text-muted">
              Profiles below are historical overlap context. They are not ranked
              by an acquisition likelihood, and a missing disclosed value is
              left blank.
            </p>
          </div>

          {/* Acquirer Rankings */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-lacuna-border-subtle">
              <h4 className="font-semibold text-lacuna-plum">
                Historical acquirer profiles
              </h4>
            </div>
            <div className="divide-y divide-lacuna-border-subtle">
              {selectedAnalysis.topMatches.map((match) => (
                <div
                  key={match.acquirer.id}
                  className="px-6 py-4 hover:bg-lacuna-surface-muted"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
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
                    {match.estimatedValue && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-lacuna-plum">
                          {formatCurrency(match.estimatedValue.median)}
                        </div>
                        <div className="text-xs text-lacuna-text-muted">
                          Disclosed median
                        </div>
                      </div>
                    )}
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
              Exit timing
            </h4>
            <p className="text-sm text-lacuna-blue">
              Lacuna does not estimate months to exit from historical deals or
              from stage. A missing timing record is omitted.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold text-lacuna-plum mb-3">
              Same-sector verified deals
            </h4>
            <p className="mb-3 text-xs text-lacuna-blue/80">
              Historical deals in the same sector. They are not an acquisition
              prediction and not a valuation of the company above.
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
            Companies with historical profile overlap
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
                    Profile overlap
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">
                    Disclosed median
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
                    <td className="px-4 py-3 text-center text-sm text-lacuna-blue">
                      {analysis.topMatches[0]?.acquirer.name ??
                        "No profile overlap recorded"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {analysis.topMatches[0]?.estimatedValue
                        ? formatCurrency(
                          analysis.topMatches[0].estimatedValue.median,
                        )
                        : "Not disclosed"}
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
