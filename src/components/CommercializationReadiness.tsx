"use client";

import { useMemo, useState } from "react";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import type { VerifiedCompanyView } from "@/lib/data/verifiedDataHelpers";
import { useWatchlist } from "@/lib/data/WatchlistContext";
import { EvidenceContextCard } from "@/components/research/EvidenceContextCard";
import ResearchIntegrityNote from "@/components/research/ResearchIntegrityNote";
import {
  DIAGNOSTICS_TOOLS_SECTOR_CONTEXT,
  SVB_H2_2026_METHODOLOGY_NOTE,
  SVB_H2_2026_SOURCE,
} from "@/lib/research/evidenceBoundaries";
import Card from "@/components/ui/Card";
import { Bookmark, BookmarkCheck, FileText } from "lucide-react";

function isMaternalHealth(company: VerifiedCompanyView): boolean {
  return company.sector.includes("Maternal") ||
    /maternal|pregnancy|postpartum/i.test(company.description ?? "");
}

export default function CommercializationReadiness() {
  const { verifiedCompanies } = useVerifiedDataset();
  const { isInWatchlist, toggleWatchlist, items } = useWatchlist();
  const [maternalOnly, setMaternalOnly] = useState(false);

  const companies = useMemo(() => {
    const rows = [...verifiedCompanies].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return maternalOnly ? rows.filter(isMaternalHealth) : rows;
  }, [verifiedCompanies, maternalOnly]);

  const maternalCount = useMemo(
    () => verifiedCompanies.filter(isMaternalHealth).length,
    [verifiedCompanies],
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 border-b border-lacuna-lavender/20">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4" />
            Commercialization catalog
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Verified company name, sector, and stage only. Stage, funding, and
            sector reports stay as context. They are not a readiness score, a
            clinical-validation claim, or an acquisition forecast.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <ResearchIntegrityNote />
          <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-lacuna-text-secondary">
              Sector context
            </p>
            <p className="mt-1 text-xs leading-relaxed text-lacuna-blue">
              {DIAGNOSTICS_TOOLS_SECTOR_CONTEXT}
            </p>
            <p className="mt-1 text-[11px] text-lacuna-blue/80">
              Sector context for diagnostics and tools. It does not assess the
              companies listed below.
            </p>
            <div className="mt-2">
              <EvidenceContextCard
                {...SVB_H2_2026_SOURCE}
                lacunaUse="sector context for diagnostics and tools diligence questions"
                prohibitedUses={[
                  "company-specific assessment",
                  "company score",
                  "investment recommendations",
                  "clinical guidance",
                ]}
                methodologyNote={`${SVB_H2_2026_METHODOLOGY_NOTE} It does not score the companies listed below.`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMaternalOnly(false)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                maternalOnly
                  ? "bg-lacuna-lavender/20 text-lacuna-blue"
                  : "bg-lacuna-plum text-white"
              }`}
            >
              All catalog companies
            </button>
            <button
              type="button"
              onClick={() => setMaternalOnly(true)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                maternalOnly
                  ? "bg-lacuna-plum text-white"
                  : "bg-lacuna-lavender/20 text-lacuna-blue"
              }`}
            >
              Maternal health text match ({maternalCount})
            </button>
          </div>

          <div className="space-y-3">
            {companies.map((company) => {
              const inWatchlist = isInWatchlist(company.id);
              return (
                <div
                  key={company.id}
                  className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-slate-800">
                        {company.name}
                      </h4>
                      {isMaternalHealth(company) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border border-lacuna-lavender text-lacuna-plum bg-lacuna-lavender/10">
                          Maternal health text
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {company.sector} · {company.stage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(company)}
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
                Your watchlist: {items.length} companies
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
