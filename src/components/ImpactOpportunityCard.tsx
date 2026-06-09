/**
 * Impact Opportunity Card
 *
 * Displays company opportunity assessment with OAIS score
 * and explicit confidence level indicators
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  calculateOAIS,
  type ClinicalStageProxy,
  EPIDEMIOLOGY_DATABASE,
  MARKET_PENETRATION_DATA,
  type OAISInputs,
  UNMEASURABLE_FACTORS,
} from "@/lib/impact/oaisCalculator";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

interface CompanyProfile {
  name: string;
  sector: string;
  verifiedStage: string;
  clinicalStage: ClinicalStageProxy["stage"];
  likelyAcquirer: string | null;
  competitors: number;
}

function mapSectorToEpidemiology(sector: string) {
  if (
    sector === "Fertility" || sector === "Reproductive Health" ||
    sector === "Contraception"
  ) {
    return EPIDEMIOLOGY_DATABASE.find((e) =>
      e.condition.includes("Fertility")
    ) ?? null;
  }
  if (sector === "Mental Health") {
    return EPIDEMIOLOGY_DATABASE.find((e) =>
      e.condition.includes("Postpartum")
    ) ?? null;
  }
  if (sector === "Pelvic Health" || sector === "Gynecological Surgery") {
    return EPIDEMIOLOGY_DATABASE.find((e) =>
      e.condition.includes("Fibroids")
    ) ?? null;
  }
  if (sector === "Breast Health" || sector === "Precision Medicine") {
    return EPIDEMIOLOGY_DATABASE.find((e) => e.condition.includes("Breast")) ??
      null;
  }
  if (sector === "Maternal Health") {
    return EPIDEMIOLOGY_DATABASE.find((e) =>
      e.condition.includes("Maternal")
    ) ?? null;
  }
  return null;
}

function mapSectorToPenetration(sector: string) {
  const categoryBySector: Record<string, string> = {
    Fertility: "Fertility Apps",
    "Mental Health": "Mental Health Apps (Women's Focus)",
    "Pelvic Health": "Pelvic Health / Kegel Apps",
  };
  const category = categoryBySector[sector];
  if (!category) return null;
  return MARKET_PENETRATION_DATA.find((m) => m.category === category) ?? null;
}

function mapVerifiedStage(stage: string): ClinicalStageProxy["stage"] {
  const s = stage.toLowerCase();
  if (s.includes("acquired") || s.includes("public")) return "post_rct";
  if (s.includes("seed")) return "pilot";
  if (s.includes("series")) return "clinical_validation";
  return "clinical_validation";
}

export default function ImpactOpportunityCard() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const exampleCompanies = useMemo<CompanyProfile[]>(
    () =>
      verifiedCompanies.map((c) => {
        const deal = verifiedAcquisitions.find((d) => d.targetId === c.id);
        const competitors = verifiedCompanies.filter(
          (other) => other.sector === c.sector && other.id !== c.id,
        ).length;
        return {
          name: c.name,
          sector: c.sector,
          verifiedStage: c.stage,
          clinicalStage: mapVerifiedStage(c.stage),
          likelyAcquirer: deal?.acquirerName ?? null,
          competitors,
        };
      }),
    [verifiedCompanies, verifiedAcquisitions],
  );

  const [selectedCompany, setSelectedCompany] = useState(0);
  const [showTransparency, setShowTransparency] = useState(false);

  const company = exampleCompanies[selectedCompany] ?? exampleCompanies[0];

  const epiData = company ? mapSectorToEpidemiology(company.sector) : null;
  const penetrationData = company
    ? mapSectorToPenetration(company.sector)
    : null;

  const estimatedPenetration = epiData && penetrationData
    ? Math.min(
      1,
      (penetrationData.activeUserEstimate.low +
        penetrationData.activeUserEstimate.high) /
        2 /
        epiData.addressablePopulation.pointEstimate,
    )
    : null;

  const oais = company && epiData && estimatedPenetration != null
    ? calculateOAIS(
      {
        condition: company.sector,
        addressablePopulation: epiData.addressablePopulation.pointEstimate,
        currentPenetration: estimatedPenetration,
        clinicalStage: company.clinicalStage,
        founderPriorExits: 0,
        founderFDAExperience: false,
        acquirerScalingMultiplier: 1,
        competitorCount: company.competitors,
      } satisfies OAISInputs,
    )
    : null;

  if (exampleCompanies.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
        <CuratedDatasetBanner className="mb-4" />
        No verified companies available for OAIS illustration.
      </div>
    );
  }

  if (
    !company || !oais || !epiData || estimatedPenetration == null ||
    !penetrationData
  ) {
    return (
      <div className="space-y-4">
        <CuratedDatasetBanner />
        <div className="border-b border-gray-200 pb-4">
          <h3
            className="text-2xl font-light tracking-tight"
            style={{
              fontFamily: "'Bodoni MT', Didot, serif",
              textTransform: "uppercase",
            }}
          >
            Opportunity-Adjusted Impact Score (OAIS)
          </h3>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          OAIS requires cited epidemiology and market penetration data for the
          company&apos;s sector.
          <strong>{company?.name ?? "This company"}</strong>{" "}
          ({company?.sector ?? "unknown sector"}) does not have a mapped Tier-1
          panel — no score is computed rather than using invented inputs.
        </div>
      </div>
    );
  }

  const getScoreInterpretation = (score: number): string => {
    if (score >= 7) return "High Opportunity";
    if (score >= 4) return "Moderate Opportunity";
    return "Limited Opportunity";
  };

  const getConfidenceBadge = (
    level: string,
  ): { color: string; text: string } => {
    switch (level) {
      case "high":
        return {
          color: "bg-green-100 text-green-700",
          text: "High Confidence",
        };
      case "medium":
        return {
          color: "bg-yellow-100 text-yellow-700",
          text: "Medium Confidence",
        };
      default:
        return {
          color: "bg-orange-100 text-orange-700",
          text: "Low Confidence",
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CuratedDatasetBanner />
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3
          className="text-2xl font-light tracking-tight"
          style={{
            fontFamily: "'Bodoni MT', Didot, serif",
            textTransform: "uppercase",
          }}
        >
          Opportunity-Adjusted Impact Score (OAIS)
        </h3>
        <p
          className="text-sm tracking-widest text-gray-500 mt-1"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          Defensible Health Impact Assessment | Honest About What We Can Measure
        </p>
      </div>

      {/* Company Selector */}
      <div className="flex flex-wrap gap-2">
        {exampleCompanies.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelectedCompany(i)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCompany === i
                ? "bg-[#5D4E6D] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Main Score Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h4
              className="font-medium text-lg"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {company.name}
            </h4>
            <p className="text-sm text-gray-500">Sector: {company.sector}</p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 rounded text-xs font-medium ${
                getConfidenceBadge(oais.confidenceLevel).color
              }`}
            >
              {getConfidenceBadge(oais.confidenceLevel).text}
            </span>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative w-32 h-32">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full transform -rotate-90"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={oais.score >= 7
                  ? "#22c55e"
                  : oais.score >= 4
                  ? "#eab308"
                  : "#f97316"}
                strokeWidth="8"
                strokeDasharray={`${oais.score * 28.3} 283`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-3xl font-light"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                {oais.score.toFixed(1)}
              </span>
            </div>
          </div>
          <div>
            <p
              className="font-medium"
              style={{
                fontFamily: "'Arial Narrow', sans-serif",
                textTransform: "uppercase",
              }}
            >
              {getScoreInterpretation(oais.score)}
            </p>
            <p className="text-sm text-gray-600 mt-1 max-w-md">
              {oais.interpretation}
            </p>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Addressable Population
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {oais.components.addressablePopScore}M
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Penetration Gap
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {(oais.components.penetrationGapScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Stage Credibility
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {(oais.components.stageCredibilityScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Founder Quality
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {(oais.components.founderQualityScore * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Scaling Likely
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              {oais.components.scalingLikelihoodScore.toFixed(1)}×
            </div>
            <span className="text-xs text-yellow-600">~ Proxy</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div
              className="text-xs text-gray-500 uppercase"
              style={{ fontFamily: "'Arial Narrow', sans-serif" }}
            >
              Saturation Penalty
            </div>
            <div
              className="text-lg font-light mt-1"
              style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
            >
              -{(oais.components.marketSaturationPenalty * 100).toFixed(0)}%
            </div>
            <span className="text-xs text-green-600">✓ Measured</span>
          </div>
        </div>
      </div>

      {/* What We Can Measure */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4
          className="font-medium text-green-800 mb-4"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          ✓ What We CAN Reliably Measure (Tier 1)
        </h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-green-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Addressable Population
              </span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                MEASURED
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {epiData.condition}:{" "}
              {epiData.addressablePopulation.pointEstimate}M women [95% CI:{" "}
              {epiData.addressablePopulation.lowerBound}-{epiData
                .addressablePopulation.upperBound}M]
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Source: {epiData.source}
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-green-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Market Penetration Gap
              </span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                MEASURED PROXY
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Current penetration: ~{(estimatedPenetration * 100).toFixed(0)}% |
              Gap: ~
              {((1 - estimatedPenetration) * 100).toFixed(0)}% unmet need
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Source: {penetrationData.dataSource}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {penetrationData.transparencyNote}
            </p>
          </div>
        </div>
      </div>

      {/* What We Can Proxy */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4
          className="font-medium text-yellow-800 mb-4"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
          }}
        >
          ~ What We CAN Proxy (Tier 2 - Medium Confidence)
        </h4>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Clinical Stage Credibility
              </span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                PROXY
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Verified stage: {company.verifiedStage} | Proxy stage:{" "}
              {company.clinicalStage.replace("_", " ")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Proxy for: Clinical efficacy (unknown for most pre-acquisition
              companies)
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Founder Quality Signals
              </span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                PROXY
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Not in verified dataset — founder exits and FDA experience are
              unmeasured; OAIS uses neutral defaults (0 exits, no FDA flag).
            </p>
          </div>

          <div className="bg-white p-3 rounded border border-yellow-100">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                Likely Acquirer Track Record
              </span>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                PROXY
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {company.likelyAcquirer
                ? `Verified acquirer: ${company.likelyAcquirer}`
                : "No verified acquirer on record — scaling multiplier held at neutral 1.0×"}
            </p>
          </div>
        </div>
      </div>

      {/* Transparency Toggle */}
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setShowTransparency(!showTransparency)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span
            className="font-medium"
            style={{
              fontFamily: "'Arial Narrow', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Complete Transparency Report
          </span>
          <span className="text-2xl">{showTransparency ? "−" : "+"}</span>
        </button>

        {showTransparency && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-white p-4 rounded border border-gray-200">
              <h5
                className="font-medium mb-3"
                style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
              >
                Critical Transparency Statements
              </h5>
              <ol className="text-sm space-y-2 text-gray-700 list-decimal list-inside">
                <li>
                  <strong>Patient volume per company is unknown.</strong>{" "}
                  We proxy with addressable population × penetration gap. This
                  overestimates if company has {"<"}1% market share.
                </li>
                <li>
                  <strong>Post-acquisition scaling is assumed</strong>{" "}
                  from acquirer track record, not measured. Past performance ≠
                  future results.
                </li>
                <li>
                  <strong>Clinical efficacy is unknown</strong>{" "}
                  for most pre-acquisition companies. We use stage as proxy, but
                  stage ≠ efficacy.
                </li>
                <li>
                  <strong>
                    This framework captures opportunity, not guaranteed impact.
                  </strong>
                  Real impact depends on execution (unobservable
                  pre-acquisition).
                </li>
                <li>
                  <strong>
                    OAIS scores are NOT comparable across conditions
                  </strong>{" "}
                  with different epidemiology data quality.
                </li>
              </ol>

              <h5
                className="font-medium mt-5 mb-2 text-sm text-gray-600"
                style={{
                  fontFamily: "'Arial Narrow', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                What we cannot measure directly
              </h5>
              <ul className="text-sm space-y-1.5 text-gray-600 list-disc list-inside">
                {UNMEASURABLE_FACTORS.slice(0, 3).map((factor, i) => (
                  <li key={i}>
                    <strong className="text-gray-700">{factor.factor}</strong> —
                    {" "}
                    {factor.why}.{" "}
                    <span className="text-gray-500 italic">
                      Proxy: {factor.proxyUsed}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Bottom Line:</strong>{" "}
                  Use OAIS for portfolio prioritization and opportunity sizing,
                  not for impact attribution or DALY calculations. We measure
                  strategic opportunity magnitude, not health outcomes achieved.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Line */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4
          className="font-medium mb-3"
          style={{
            fontFamily: "'Arial Narrow', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          OAIS Interpretation Summary
        </h4>
        <p className="text-sm leading-relaxed">
          <strong>{company.name}</strong>: OAIS ={" "}
          {oais.score.toFixed(1)}/10 [{getConfidenceBadge(oais.confidenceLevel)
            .text}]. Addresses {oais.components.addressablePopScore}M women with
          {" "}
          {((oais.components.penetrationGapScore) * 100).toFixed(0)}%
          penetration gap. Stage credibility{" "}
          {(oais.components.stageCredibilityScore * 100).toFixed(0)}%. Likely
          acquirer:{" "}
          {company.likelyAcquirer ?? "not in verified dataset"}. Competitors in
          sector (verified): {company.competitors}.
          {oais.score >= 7
            ? "Strong opportunity for impact at scale."
            : oais.score >= 4
            ? "Moderate opportunity; consider as part of portfolio."
            : "Limited opportunity; may be strategic tuck-in only."}
        </p>
      </div>
    </motion.div>
  );
}
