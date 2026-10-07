"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import DealTargetLastKnownValuation from "@/components/DealTargetLastKnownValuation";
import Metric from "@/components/Metric";
import { INVESTOR_PORTFOLIOS, type PortfolioKey } from "@/lib/data/portfolios";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import { sourcedLastKnownValuationForCompany } from "@/lib/deals/sourcedLastKnownValuation";
import {
  buildObservedFeatures,
  observedCentroid,
  type ObservedFeature,
  pairwiseCosine,
  sharedObservedFactors,
} from "@/lib/similarity/observedFeatureSimilarity";

type MatchMode = "single" | PortfolioKey;

const NOT_A_VALUATION_PEER_SET = "not a valuation peer set";

interface SimilarityResult {
  readonly company: VerifiedCompanyView;
  readonly similarity: number | null;
  readonly sharedFactors: string[];
  readonly dataCompleteness: number;
}

interface CompanyVector {
  readonly company: VerifiedCompanyView;
  readonly features: readonly ObservedFeature[];
  readonly hasValuation: boolean;
  readonly hasFunding: boolean;
}

function featureDimensionLabels(sectors: string[]): string[] {
  return [
    ...sectors.map((sector) => `Sector overlap (${sector})`),
    "Valuation profile",
    "Funding profile",
    "Company age",
    "Late-stage profile",
    "Public-market profile",
    "Acquisition profile",
  ];
}

function compareSimilarity(a: SimilarityResult, b: SimilarityResult): number {
  if (a.similarity === null && b.similarity === null) {
    return a.company.name.localeCompare(b.company.name);
  }
  if (a.similarity === null) return 1;
  if (b.similarity === null) return -1;
  if (b.similarity !== a.similarity) return b.similarity - a.similarity;
  return a.company.name.localeCompare(b.company.name);
}

function sameCalendarYear(
  left: VerifiedCompanyView,
  right: VerifiedCompanyView,
): boolean {
  return left.foundedPrecision === "year" &&
    right.foundedPrecision === "year" &&
    left.founded !== undefined &&
    right.founded !== undefined &&
    Math.abs(left.founded - right.founded) <= 2;
}

export default function CompanySimilarity() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const sectors = useMemo(
    () => Array.from(new Set(verifiedCompanies.map((c) => c.sector))).sort(),
    [verifiedCompanies],
  );
  const [mode, setMode] = useState<MatchMode>("single");
  const [selectedCompany, setSelectedCompany] = useState<string>(
    verifiedCompanies[0]?.id || "",
  );
  const activePortfolio = mode === "single"
    ? null
    : INVESTOR_PORTFOLIOS.find((portfolio) => portfolio.key === mode) ?? null;
  const portfolioNameSet = useMemo(
    () => new Set<string>(activePortfolio?.companies ?? []),
    [activePortfolio],
  );
  const asOfYear = new Date().getUTCFullYear();
  const companyVectors = useMemo<CompanyVector[]>(
    () =>
      verifiedCompanies.map((company) => ({
        company,
        features: buildObservedFeatures(company, sectors, asOfYear),
        hasValuation: typeof company.lastKnownValuation === "number",
        hasFunding: typeof company.totalFunding === "number",
      })),
    [asOfYear, verifiedCompanies, sectors],
  );
  const companyVectorMap = useMemo(
    () => new Map(companyVectors.map((entry) => [entry.company.id, entry])),
    [companyVectors],
  );

  const similarities = useMemo<SimilarityResult[]>(() => {
    const targetEntry = companyVectorMap.get(selectedCompany);
    if (!targetEntry) return [];

    return companyVectors
      .filter(({ company }) => company.id !== selectedCompany)
      .map(({ company, features, hasValuation, hasFunding }) => {
        const similarity = pairwiseCosine(targetEntry.features, features);

        const shared: string[] = [];
        if (company.sector === targetEntry.company.sector) {
          shared.push(`Same sector (${company.sector})`);
        }
        if (company.stage === targetEntry.company.stage) {
          shared.push(`Same stage`);
        }
        if (
          targetEntry.hasValuation && hasValuation &&
          targetEntry.company.lastKnownValuation! > 0 &&
          company.lastKnownValuation! > 0
        ) {
          const ratio = Math.max(
            targetEntry.company.lastKnownValuation!,
            company.lastKnownValuation!,
          ) /
            Math.min(
              targetEntry.company.lastKnownValuation!,
              company.lastKnownValuation!,
            );
          if (ratio < 2) shared.push("Valuation within 2×");
        }
        if (sameCalendarYear(company, targetEntry.company)) {
          shared.push("Founded within 2 yrs (year precision)");
        }

        return {
          company,
          similarity,
          sharedFactors: shared,
          dataCompleteness: (hasValuation ? 1 : 0) + (hasFunding ? 1 : 0),
        };
      })
      .sort(compareSimilarity)
      .slice(0, 5);
  }, [selectedCompany, companyVectorMap, companyVectors]);

  const portfolioMatches = useMemo(() => {
    const portfolioEntries = companyVectors.filter(({ company }) =>
      portfolioNameSet.has(company.name)
    );

    if (portfolioEntries.length === 0) {
      return {
        portfolioCount: 0,
        matches: [] as SimilarityResult[],
      };
    }

    const centroid = observedCentroid(
      portfolioEntries.map((entry) => entry.features),
    );
    const labels = featureDimensionLabels(sectors);

    const matches = companyVectors
      .filter(({ company }) => !portfolioNameSet.has(company.name))
      .map(({ company, features, hasValuation, hasFunding }) => ({
        company,
        similarity: pairwiseCosine(features, centroid),
        sharedFactors: sharedObservedFactors(features, centroid, labels),
        dataCompleteness: (hasValuation ? 1 : 0) + (hasFunding ? 1 : 0),
      }))
      .sort(compareSimilarity)
      .slice(0, 10);

    return {
      portfolioCount: portfolioEntries.length,
      matches,
    };
  }, [companyVectors, portfolioNameSet, sectors]);

  const selected = companyVectorMap.get(selectedCompany)?.company;
  const selectedSourced = selected
    ? sourcedLastKnownValuationForCompany(selected, verifiedAcquisitions)
    : null;
  const activeResults = mode === "single"
    ? similarities
    : portfolioMatches.matches;

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
            Company Similarity Engine
          </h3>
          <p className="text-sm text-lacuna-text-muted">
            Descriptive similarity index over verified features (sector,
            valuation, funding, year-precision age, stage). This is{" "}
            {NOT_A_VALUATION_PEER_SET}, not a probability, not an investment
            recommendation, and not a dual-source badge.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
          <span className="text-xs font-medium text-blue-700">
            {verifiedCompanies.length} companies
          </span>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "single"
              ? "bg-lacuna-plum text-white"
              : "bg-lacuna-surface-subtle text-lacuna-text-secondary hover:bg-lacuna-surface-subtle"
          }`}
        >
          Single Company
        </button>
        {INVESTOR_PORTFOLIOS.map((portfolio) => (
          <button
            key={portfolio.key}
            type="button"
            onClick={() => setMode(portfolio.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === portfolio.key
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-surface-subtle text-lacuna-text-secondary hover:bg-lacuna-surface-subtle"
            }`}
          >
            {portfolio.shortName} Match
          </button>
        ))}
      </div>

      {mode === "single" && (
        <div className="mb-6">
          <label
            htmlFor="company-similarity-select"
            className="block text-sm font-medium text-lacuna-text-primary mb-2"
          >
            Select Company
          </label>
          <select
            id="company-similarity-select"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full p-2 border border-lacuna-border-strong rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            {verifiedCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.sector}</option>
            ))}
          </select>
        </div>
      )}

      {mode === "single" && selected && (
        <div className="mb-4 p-3 bg-lacuna-surface-muted rounded-lg">
          <p className="font-medium text-lacuna-text-primary">
            {selected.name}
          </p>
          <p className="text-sm text-lacuna-text-muted">
            {selected.sector} · {selected.stage}
            {selectedSourced
              ? (
                <>
                  {" · "}
                  <DealTargetLastKnownValuation
                    compact
                    valuation={selectedSourced}
                  />
                </>
              )
              : null}
            {selected.totalFunding != null && selected.sources[0]
              ? ` · ${selected.totalFunding}M raised (${selected.sources[0]})`
              : null}
          </p>
        </div>
      )}

      {activePortfolio && (
        <div className="mb-4 rounded-lg bg-lacuna-surface-muted p-3">
          <p className="font-medium text-lacuna-text-primary">
            Companies most similar to the {activePortfolio.investorName}{" "}
            portfolio
          </p>
          <p className="text-sm text-lacuna-text-muted">
            {portfolioMatches.portfolioCount}{" "}
            portfolio compan{portfolioMatches.portfolioCount === 1
              ? "y"
              : "ies"} used to compute the centroid
          </p>
        </div>
      )}

      {activePortfolio && portfolioMatches.portfolioCount < 3 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {portfolioMatches.portfolioCount === 0
            ? `No ${activePortfolio.shortName} portfolio companies were found in the verified dataset, so a portfolio centroid could not be computed.`
            : `Only ${portfolioMatches.portfolioCount} of ${activePortfolio.companies.length} ${activePortfolio.shortName} portfolio compan${
              portfolioMatches.portfolioCount === 1 ? "y is" : "ies are"
            } in the verified dataset — the "centroid" is effectively that compan${
              portfolioMatches.portfolioCount === 1
                ? "y's profile"
                : "ies' average"
            }, so treat these matches as directional, not representative of the full portfolio.`}
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-lacuna-text-primary uppercase tracking-wider">
          {activePortfolio
            ? `Companies most similar to the ${activePortfolio.investorName} portfolio`
            : "Most Similar Companies"}
        </h4>
        {activeResults.map((result, i) => (
          <motion.div
            key={result.company.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-3 border border-lacuna-border-subtle rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lacuna-text-primary">
                  {result.company.name}
                </span>
                <span className="text-xs px-2 py-0.5 bg-lacuna-surface-subtle text-lacuna-text-secondary rounded">
                  {result.company.sector}
                </span>
                {result.dataCompleteness < 2 && (
                  <span
                    className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded"
                    title="Some financial fields not publicly disclosed"
                  >
                    partial data
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {result.sharedFactors.length > 0
                  ? (
                    result.sharedFactors.map((factor, j) => (
                      <span key={j} className="text-xs text-lacuna-text-muted">
                        • {factor}
                      </span>
                    ))
                  )
                  : (
                    <span className="text-xs text-lacuna-text-muted">
                      No structural overlap
                    </span>
                  )}
              </div>
            </div>
            <div className="text-right">
              {result.similarity === null
                ? (
                  <>
                    <div className="text-sm font-semibold text-lacuna-text-muted">
                      —
                    </div>
                    <div className="text-xs text-lacuna-text-muted">
                      insufficient overlap
                    </div>
                  </>
                )
                : (
                  <>
                    <Metric
                      label="Descriptive similarity index"
                      className="text-lg font-bold text-pink-600"
                      formatValue={(value) => String(Math.round(value))}
                      provenance={{
                        kind: "assumption",
                        value: result.similarity * 100,
                        model: {
                          module:
                            "src/lib/similarity/observedFeatureSimilarity.ts",
                          exportName: "pairwiseCosine",
                          definition:
                            "Cosine similarity over features observed by both companies, scaled to a unitless 0–100 index.",
                        },
                        caveat:
                          "Shared observed features only; not a probability or valuation peer set.",
                      }}
                    />
                    <div className="text-xs text-lacuna-text-muted">
                      descriptive index
                    </div>
                  </>
                )}
            </div>
          </motion.div>
        ))}
        {activeResults.length === 0 && (
          <div className="rounded-lg border border-lacuna-border-subtle p-4 text-sm text-lacuna-text-muted">
            {activePortfolio
              ? `No ${activePortfolio.shortName} portfolio matches are available yet.`
              : "No similarity results available for the selected company."}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-lacuna-border-subtle">
        <p className="text-xs text-lacuna-text-muted leading-relaxed">
          Cosine similarity uses only features both companies observed.
          Undisclosed valuation, undisclosed funding, and founding years that
          are not year-precision are excluded — not filled with zero. Age is
          whole years in the current catalog view, not a known day and not age
          at exit. The 0–100 index is not a probability. Partial data means a
          financial field was left out of that comparison.
        </p>
      </div>
    </motion.div>
  );
}
