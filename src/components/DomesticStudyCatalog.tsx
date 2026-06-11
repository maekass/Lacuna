"use client";

import { useEffect, useMemo, useState } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import type { DomesticInstitution } from "@/lib/research/domesticStudyCatalog";

interface StudyRow {
  studyId: string;
  title: string;
  institution: DomesticInstitution;
  institutionLabel: string;
  sampleSize: number;
  sampleSizeNote: string;
  conditions: string[];
  markerGenes: string[];
  dataTier: string;
  source: string;
  variantCallsetId?: string;
}

interface Stats {
  totalStudies: number;
  totalSampleSize: number;
  byInstitution: Record<
    DomesticInstitution,
    { studies: number; sampleSize: number }
  >;
}

const FILTERS: Array<{ id: "all" | DomesticInstitution; label: string }> = [
  { id: "all", label: "All domestic" },
  { id: "nih", label: "NIH" },
  { id: "harvard", label: "Harvard" },
  { id: "mit", label: "MIT" },
  { id: "harvard_mit_collab", label: "Broad" },
];

function formatSampleSize(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DomesticStudyCatalog() {
  const [studies, setStudies] = useState<StudyRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | DomesticInstitution>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter !== "all") params.set("institution", filter);

    fetch(`/api/research/studies?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`studies ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStudies(data.studies ?? []);
        setStats(data.stats ?? null);
        setError("");
      })
      .catch(() => setError("Could not load domestic study catalog."))
      .finally(() => setLoading(false));
  }, [filter]);

  const filteredSampleTotal = useMemo(
    () => studies.reduce((sum, s) => sum + s.sampleSize, 0),
    [studies],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-4 sm:p-6">
      <CuratedDatasetBanner className="mb-4" />
      <h3 className="text-lg font-semibold text-lacuna-plum mb-1">
        Domestic research sample universe
      </h3>
      <p className="text-sm text-lacuna-blue mb-4">
        Cited US cohort sizes from NIH, Harvard affiliates, and MIT/Broad —
        PCOS, BRCA, sickle cell, lupus, and population genomics.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filter === f.id
                ? "bg-lacuna-plum text-white border-lacuna-plum"
                : "bg-white text-lacuna-plum border-lacuna-lavender/60 hover:bg-lacuna-pink/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
            <p className="text-2xl font-bold text-lacuna-plum">
              {stats.totalStudies}
            </p>
            <p className="text-xs text-lacuna-blue mt-1">Cataloged studies</p>
          </div>
          <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
            <p className="text-2xl font-bold text-lacuna-plum">
              {formatSampleSize(stats.totalSampleSize)}
            </p>
            <p className="text-xs text-lacuna-blue mt-1">
              Combined sample size
            </p>
          </div>
          <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
            <p className="text-2xl font-bold text-lacuna-plum">
              {formatSampleSize(stats.byInstitution.nih.sampleSize)}
            </p>
            <p className="text-xs text-lacuna-blue mt-1">NIH participants</p>
          </div>
          <div className="rounded-lg bg-lacuna-pink/10 border border-lacuna-lavender/30 p-3">
            <p className="text-2xl font-bold text-lacuna-plum">
              {formatSampleSize(
                stats.byInstitution.harvard.sampleSize +
                  stats.byInstitution.harvard_mit_collab.sampleSize,
              )}
            </p>
            <p className="text-xs text-lacuna-blue mt-1">Harvard / Broad</p>
          </div>
        </div>
      )}

      {loading && (
        <div
          className="h-32 animate-pulse rounded-lg bg-lacuna-pink/10"
          aria-hidden
        />
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs text-lacuna-blue/80 mb-3">
            Showing {studies.length} studies ·{" "}
            {formatSampleSize(filteredSampleTotal)} participants in view
          </p>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {studies.map((study) => (
              <article
                key={study.studyId}
                className="rounded-lg border border-slate-200 p-3 hover:border-lacuna-lavender/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-lacuna-plum">
                      {study.title}
                    </p>
                    <p className="text-xs text-lacuna-blue mt-0.5">
                      {study.institutionLabel} ·{" "}
                      {study.conditions.slice(0, 3).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium">
                    n={study.sampleSize.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-lacuna-blue/70 mt-2">
                  {study.sampleSizeNote}
                </p>
                <p className="text-[11px] text-lacuna-blue/60 mt-1">
                  Markers: {study.markerGenes.join(", ")}
                  {study.variantCallsetId && (
                    <>
                      {" "}
                      · callset{" "}
                      <code className="text-[10px]">
                        {study.variantCallsetId}
                      </code>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-lacuna-blue/50 mt-1">
                  {study.source}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
