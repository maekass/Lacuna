"use client";

import { useMemo } from "react";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import { useWatchlist } from "@/lib/data/WatchlistContext";
import Card from "@/components/ui/Card";
import { Bookmark, BookmarkCheck, FileText } from "lucide-react";

interface ReadinessScore {
  company: VerifiedCompanyView;
  evidenceScore: number; // 0-100
  reimbursementScore: number; // 0-100
  acquirerFitScore: number; // 0-100
  overallScore: number; // weighted composite
  rationale: string[];
}

function calculateReadiness(
  company: VerifiedCompanyView,
  allCompanies: VerifiedCompanyView[],
): ReadinessScore {
  const rationale: string[] = [];

  // Evidence score: late stage + high valuation = more evidence
  let evidenceScore = 0;
  const isLateStage =
    /Series C|Series D|Series E|Series F|Late Stage|Pre-IPO|Public/i.test(
      company.stage,
    );
  if (isLateStage) {
    evidenceScore += 40;
    rationale.push("Late-stage funding indicates clinical validation");
  }
  const hasValuation = (company.lastKnownValuation ?? 0) > 100;
  if (hasValuation) {
    evidenceScore += 30;
    rationale.push("Valuation >$100M signals market traction");
  }
  if (company.totalFunding && company.totalFunding > 50) {
    evidenceScore += 30;
    rationale.push(">$50M raised suggests investor confidence");
  }
  evidenceScore = Math.min(100, evidenceScore);

  // Reimbursement score: diagnostics/therapeutics have clearer paths
  let reimbursementScore = 0;
  const reimbursableSectors = [
    "Diagnostics",
    "Reproductive Health",
    "Precision Medicine",
    "Maternal Care",
  ];
  if (reimbursableSectors.some((s) => company.sector.includes(s))) {
    reimbursementScore += 50;
    rationale.push("Sector has established reimbursement pathways");
  }
  if (company.description?.match(/FDA|CMS|insurance|reimbursed|covered/i)) {
    reimbursementScore += 50;
    rationale.push("Company mentions regulatory/reimbursement progress");
  }
  reimbursementScore = Math.min(100, reimbursementScore);

  // Acquirer fit score: sector has prior exits
  let acquirerFitScore = 0;
  const sectorExits = allCompanies.filter(
    (c) => c.sector === company.sector && c.stage.includes("Acquired"),
  ).length;
  if (sectorExits > 0) {
    acquirerFitScore += Math.min(60, sectorExits * 20);
    rationale.push(`${sectorExits} prior exits in ${company.sector} sector`);
  }
  const hasAcquirerMention = company.stage.includes("Acquired");
  if (hasAcquirerMention) {
    acquirerFitScore = 100; // Already acquired
    rationale.push("Already acquired — exit achieved");
  }
  acquirerFitScore = Math.min(100, acquirerFitScore);

  // Overall: weighted toward evidence and acquirer fit for researchers
  const overallScore = Math.round(
    evidenceScore * 0.4 + reimbursementScore * 0.3 + acquirerFitScore * 0.3,
  );

  return {
    company,
    evidenceScore,
    reimbursementScore,
    acquirerFitScore,
    overallScore,
    rationale,
  };
}

export default function CommercializationReadiness() {
  const { verifiedCompanies } = useVerifiedDataset();
  const { isInWatchlist, toggleWatchlist, items } = useWatchlist();

  const scores = useMemo(() => {
    return verifiedCompanies
      .map((c) => calculateReadiness(c, verifiedCompanies))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);
  }, [verifiedCompanies]);

  const maternalHealthCandidates = useMemo(() => {
    return scores.filter(
      (s) =>
        s.company.sector.includes("Maternal") ||
        s.company.description?.match(/maternal|pregnancy|postpartum/i),
    );
  }, [scores]);

  const getScoreColor = (score: number) => {
    if (score >= 70) {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 border-b border-lacuna-lavender/20">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4" />
            Commercialization Readiness (Researcher View)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Scored by evidence maturity, reimbursement pathway clarity, and
            acquirer sector activity — for researchers evaluating spin-out or
            venture opportunities. Not investment advice.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {maternalHealthCandidates.length > 0 && (
            <div className="mb-4 rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 p-3">
              <p className="text-sm font-medium text-lacuna-plum">
                Maternal Health Candidates
              </p>
              <p className="text-xs text-lacuna-blue">
                {maternalHealthCandidates.length}{" "}
                companies with maternal health exposure — add to watchlist for
                tracking
              </p>
            </div>
          )}

          <div className="space-y-3">
            {scores.map((score) => {
              const inWatchlist = isInWatchlist(score.company.id);
              const isMaternalHealth =
                score.company.sector.includes("Maternal") ||
                score.company.description?.match(
                  /maternal|pregnancy|postpartum/i,
                );

              return (
                <div
                  key={score.company.id}
                  className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-slate-800">
                        {score.company.name}
                      </h4>
                      {isMaternalHealth && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border border-lacuna-lavender text-lacuna-plum bg-lacuna-lavender/10">
                          Maternal Health
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          getScoreColor(score.overallScore)
                        }`}
                      >
                        {score.overallScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {score.company.sector} · {score.company.stage}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border border-slate-200 text-slate-600">
                        Evidence: {score.evidenceScore}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border border-slate-200 text-slate-600">
                        Reimbursement: {score.reimbursementScore}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border border-slate-200 text-slate-600">
                        Acquirer Fit: {score.acquirerFitScore}
                      </span>
                    </div>
                    {score.rationale.length > 0 && (
                      <ul className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                        {score.rationale.slice(0, 2).map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (inWatchlist) {
                        toggleWatchlist(score.company);
                      } else {
                        // Need to use addToWatchlist with tags - get from context
                        // For simplicity, just toggle without tags for now
                        toggleWatchlist(score.company);
                      }
                    }}
                    className="ml-2 shrink-0 p-2 rounded hover:bg-slate-100"
                    aria-label={inWatchlist
                      ? "Remove from watchlist"
                      : "Add to watchlist"}
                  >
                    {inWatchlist
                      ? <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                      : <Bookmark className="h-4 w-4 text-slate-400" />}
                  </button>
                </div>
              );
            })}
          </div>

          {items.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">
                Your Watchlist: {items.length} companies
              </p>
              {items.filter((i) => i.tags.includes("maternal-health")).length >
                  0 && (
                <p className="text-xs text-lacuna-plum mt-1">
                  {items.filter((i) => i.tags.includes("maternal-health"))
                    .length} maternal health tracked
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
