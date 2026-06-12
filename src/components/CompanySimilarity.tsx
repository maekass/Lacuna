"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import {
  INVESTOR_PORTFOLIOS,
  type PortfolioKey,
} from "@/lib/data/portfolios";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";

const CURRENT_YEAR = 2026;
type MatchMode = "single" | PortfolioKey;

interface FeatureVector {
  readonly values: readonly number[];
  readonly hasValuation: boolean;
  readonly hasFunding: boolean;
}

interface SimilarityResult {
  readonly company: VerifiedCompanyView;
  readonly similarity: number;
  readonly sharedFactors: string[];
  readonly dataCompleteness: number;
}

function buildFeatureVector(
  company: VerifiedCompanyView,
  sectors: string[],
): FeatureVector {
  const sectorOneHot = sectors.map((s) => (company.sector === s ? 1 : 0));
  const hasValuation = typeof company.lastKnownValuation === "number";
  const hasFunding = typeof company.totalFunding === "number";

  const logVal = hasValuation
    ? Math.log10((company.lastKnownValuation as number) + 1) / 4
    : 0;
  const logFund = hasFunding
    ? Math.log10((company.totalFunding as number) + 1) / 3
    : 0;
  const ageNorm = Math.min(1, (CURRENT_YEAR - company.founded) / 15);
  const isLateStage =
    /Series C|Series D|Series E|Series F|Late Stage|Pre-IPO/i.test(
        company.stage,
      )
      ? 1
      : 0;
  const isPublic = /Public/i.test(company.stage) ? 1 : 0;
  const isAcquired = /Acquired/i.test(company.stage) ? 1 : 0;

  return {
    values: [
      ...sectorOneHot,
      logVal,
      logFund,
      ageNorm,
      isLateStage,
      isPublic,
      isAcquired,
    ],
    hasValuation,
    hasFunding,
  };
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  const denom = magA * magB;
  return denom === 0 ? 0 : dot / denom;
}

function featureDimensionLabels(sectors: string[]): string[] {
  return [
    ...sectors.map((sector) => `Sector affinity (${sector})`),
    "Valuation profile",
    "Funding profile",
    "Company age",
    "Late-stage profile",
    "Public-market profile",
    "Acquisition profile",
  ];
}

function sharedFactorsAgainstCentroid(
  values: readonly number[],
  centroid: readonly number[],
  sectors: string[],
): string[] {
  const labels = featureDimensionLabels(sectors);
  return labels.filter((_, index) => {
    const centroidValue = centroid[index] ?? 0;
    if (centroidValue <= 0) return false;
    return Math.abs((values[index] ?? 0) - centroidValue) <=
      centroidValue * 0.2;
  });
}

export default function CompanySimilarity() {
  const { verifiedCompanies } = useVerifiedDataset();
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
  const companyVectors = useMemo(
    () =>
      verifiedCompanies.map((company) => ({
        company,
        vector: buildFeatureVector(company, sectors),
      })),
    [verifiedCompanies, sectors],
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
      .map(({ company, vector }) => {
        const similarity = cosineSimilarity(
          targetEntry.vector.values,
          vector.values,
        );

        const shared: string[] = [];
        if (company.sector === targetEntry.company.sector) {
          shared.push(`Same sector (${company.sector})`);
        }
        if (company.stage === targetEntry.company.stage) {
          shared.push(`Same stage`);
        }
        if (targetEntry.vector.hasValuation && vector.hasValuation) {
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
        if (Math.abs(company.founded - targetEntry.company.founded) <= 2) {
          shared.push("Founded within 2 yrs");
        }

        return {
          company,
          similarity: isNaN(similarity) ? 0 : similarity,
          sharedFactors: shared,
          dataCompleteness: (vector.hasValuation ? 1 : 0) +
            (vector.hasFunding ? 1 : 0),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
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

    const centroid = portfolioEntries[0].vector.values.map((_, index) =>
      portfolioEntries.reduce(
        (sum, entry) => sum + entry.vector.values[index],
        0,
      ) / portfolioEntries.length
    );

    const matches = companyVectors
      .filter(({ company }) => !portfolioNameSet.has(company.name))
      .map(({ company, vector }) => {
        const similarity = cosineSimilarity(vector.values, centroid);
        return {
          company,
          similarity: isNaN(similarity) ? 0 : similarity,
          sharedFactors: sharedFactorsAgainstCentroid(
            vector.values,
            centroid,
            sectors,
          ),
          dataCompleteness: (vector.hasValuation ? 1 : 0) +
            (vector.hasFunding ? 1 : 0),
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    return {
      portfolioCount: portfolioEntries.length,
      matches,
    };
  }, [companyVectors, portfolioNameSet, sectors]);

  const selected = companyVectorMap.get(selectedCompany)?.company;
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
            Cosine similarity over verified features (sector, valuation,
            funding, age, stage)
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
          <span className="text-xs font-medium text-blue-700">
            n={verifiedCompanies.length}
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
          <p className="font-medium text-lacuna-text-primary">{selected.name}</p>
          <p className="text-sm text-lacuna-text-muted">
            {selected.sector} · {selected.stage}
            {selected.lastKnownValuation &&
              ` · $${selected.lastKnownValuation}M valuation`}
            {selected.totalFunding && ` · $${selected.totalFunding}M raised`}
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
              <div className="text-lg font-bold text-pink-600">
                {(result.similarity * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-lacuna-text-muted">similarity</div>
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
          Feature vector: {sectors.length}{" "}
          sector one-hot dims + log(valuation) + log(funding) + normalized age +
          stage flags. Cosine similarity. Companies with undisclosed financials
          default to 0 on those dims (penalizes match) — flagged as
          &quot;partial data&quot;.
        </p>
      </div>
    </motion.div>
  );
}
