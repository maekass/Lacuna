/**
 * Impact Opportunity Research Card
 *
 * MeshIC policy: the legacy OAIS 0–10 score is intentionally withheld from the
 * product surface until its proxy weights and thresholds are calibrated against
 * observed outcomes. We keep the underlying cited/proxy inputs visible so the
 * framework remains useful as a diligence worksheet without presenting an
 * unvalidated composite as decision-grade evidence.
 */

"use client";

import { useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import AnalysisPanelHeader from "@/components/ui/AnalysisPanelHeader";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  EPIDEMIOLOGY_DATABASE,
  MARKET_PENETRATION_DATA,
  UNMEASURABLE_FACTORS,
} from "@/lib/impact/oaisCalculator";
import {
  displayFont,
  labelFont,
  labelFontUppercase,
} from "@/lib/theme/typography";

interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  verifiedStage: string;
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
  return MARKET_PENETRATION_DATA.find((row) => row.category === category) ??
    null;
}

export default function ImpactOpportunityCard() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();

  const companies = useMemo<CompanyProfile[]>(
    () =>
      verifiedCompanies.map((company) => {
        const deal = verifiedAcquisitions.find((row) =>
          row.targetId === company.id
        );
        const competitors = verifiedCompanies.filter(
          (other) => other.sector === company.sector && other.id !== company.id,
        ).length;
        return {
          id: company.id,
          name: company.name,
          sector: company.sector,
          verifiedStage: company.stage,
          likelyAcquirer: deal?.acquirerName ?? null,
          competitors,
        };
      }),
    [verifiedCompanies, verifiedAcquisitions],
  );

  const [selectedCompany, setSelectedCompany] = useState(0);
  const company = companies[selectedCompany] ?? companies[0];

  if (!company) {
    return (
      <div className="space-y-4">
        <CuratedDatasetBanner />
        <AnalysisPanelHeader title="Opportunity Research" />
        <div className="bg-white border border-lacuna-border rounded-lg p-6 text-sm text-lacuna-text-secondary">
          No verified companies available.
        </div>
      </div>
    );
  }

  const epiData = mapSectorToEpidemiology(company.sector);
  const penetrationData = mapSectorToPenetration(company.sector);
  const estimatedPenetration = epiData && penetrationData
    ? Math.min(
      1,
      ((penetrationData.activeUserEstimate.low +
        penetrationData.activeUserEstimate.high) / 2) /
        epiData.addressablePopulation.pointEstimate,
    )
    : null;

  return (
    <div className="space-y-6">
      <CuratedDatasetBanner />
      <AnalysisPanelHeader
        title="Opportunity Research"
        subtitle="OAIS composite score withheld pending outcome calibration"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
        <strong>Research-only framework.</strong>{" "}
        Lacuna previously combined epidemiology, penetration, stage, founder and
        scaling proxies into a 0–10 OAIS score. That composite is intentionally
        not displayed because its weights and thresholds have not been validated
        against observed investment or health outcomes. Inputs remain visible
        below for diligence; they should not be collapsed into a decision score.
      </div>

      <div className="flex flex-wrap gap-2">
        {companies.map((row, index) => (
          <button
            key={row.id}
            onClick={() => setSelectedCompany(index)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCompany === index
                ? "bg-[#5D4E6D] text-white"
                : "bg-lacuna-surface-subtle text-lacuna-text-primary hover:bg-lacuna-surface-muted"
            }`}
            style={labelFont}
          >
            {row.name}
          </button>
        ))}
      </div>

      <div className="bg-white border border-lacuna-border rounded-lg p-6 space-y-5">
        <div>
          <h4 className="font-medium text-lg" style={displayFont}>
            {company.name}
          </h4>
          <p className="text-sm text-lacuna-text-muted">
            {company.sector} · {company.verifiedStage}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-lacuna-surface-muted p-4 rounded-lg">
            <div
              className="text-xs text-lacuna-text-muted uppercase"
              style={labelFont}
            >
              Addressable population
            </div>
            {epiData
              ? (
                <>
                  <div className="text-xl font-light mt-1" style={displayFont}>
                    {epiData.addressablePopulation.pointEstimate}M
                  </div>
                  <p className="text-xs text-lacuna-text-secondary mt-2">
                    Range: {epiData.addressablePopulation.lowerBound}–{epiData
                      .addressablePopulation.upperBound}M
                  </p>
                  <p className="text-xs text-lacuna-text-muted mt-2">
                    Source: {epiData.source}
                  </p>
                </>
              )
              : (
                <p className="text-sm text-lacuna-text-secondary mt-2">
                  No mapped cited epidemiology input.
                </p>
              )}
          </div>

          <div className="bg-lacuna-surface-muted p-4 rounded-lg">
            <div
              className="text-xs text-lacuna-text-muted uppercase"
              style={labelFont}
            >
              Penetration proxy
            </div>
            {penetrationData && estimatedPenetration !== null
              ? (
                <>
                  <div className="text-xl font-light mt-1" style={displayFont}>
                    ~{(estimatedPenetration * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Proxy, not direct market penetration.{" "}
                    {penetrationData.transparencyNote}
                  </p>
                  <p className="text-xs text-lacuna-text-muted mt-2">
                    Source: {penetrationData.dataSource}
                  </p>
                </>
              )
              : (
                <p className="text-sm text-lacuna-text-secondary mt-2">
                  No mapped penetration proxy.
                </p>
              )}
          </div>

          <div className="bg-lacuna-surface-muted p-4 rounded-lg">
            <div
              className="text-xs text-lacuna-text-muted uppercase"
              style={labelFont}
            >
              Verified market context
            </div>
            <div className="text-xl font-light mt-1" style={displayFont}>
              {company.competitors}
            </div>
            <p className="text-xs text-lacuna-text-secondary mt-2">
              Other verified Lacuna companies in the same sector. This is
              dataset coverage, not total market competitor count.
            </p>
          </div>

          <div className="bg-lacuna-surface-muted p-4 rounded-lg">
            <div
              className="text-xs text-lacuna-text-muted uppercase"
              style={labelFont}
            >
              Acquisition context
            </div>
            <div className="text-lg font-light mt-1" style={displayFont}>
              {company.likelyAcquirer ?? "No verified acquirer"}
            </div>
            <p className="text-xs text-lacuna-text-secondary mt-2">
              Historical verified relationship only; not a prediction of future
              acquisition.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4
          className="font-medium text-yellow-900 mb-3"
          style={labelFontUppercase}
        >
          Unmeasured / proxy-dependent factors
        </h4>
        <ul className="space-y-2 text-sm text-yellow-950">
          {UNMEASURABLE_FACTORS.map((factor) => (
            <li key={factor.factor}>
              <strong>{factor.factor}:</strong> {factor.why} Proxy limitation:
              {" "}
              {factor.proxyLimitation}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-lacuna-surface-muted border border-lacuna-border rounded-lg p-4 text-sm text-lacuna-text-secondary">
        <strong>Promotion gate:</strong>{" "}
        a composite opportunity score should return only after its component
        definitions are source-resolved, confidence is computed from actual
        evidence classes, and thresholds are calibrated on held-out or observed
        outcomes. Until then, disagreement and missingness remain visible.
      </div>
    </div>
  );
}
