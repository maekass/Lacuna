"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DataProvenanceBanner from "@/components/DataProvenanceBanner";
import PipelineStatusStrip from "@/components/PipelineStatusStrip";
import MotionSection from "@/components/ui/MotionSection";
import StatTile from "@/components/ui/StatTile";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { useDashboardData } from "@/lib/data/useDashboardData";
import {
  getDealVelocityTopSector,
  VALUATION_DISPARITY_MODEL,
} from "@/lib/fairness/headlineStat";
import { WORKSPACES } from "@/lib/navigation/workspaces";

const CURRENT_YEAR = new Date().getFullYear();

/** Render huge relative gaps as a multiplier ("76× higher") — "7503% above" is unreadable. */
function formatValuationGap(percentDiff: number): string {
  if (percentDiff >= 400) {
    const multiple = 1 + percentDiff / 100;
    return `${
      multiple >= 10 ? multiple.toFixed(0) : multiple.toFixed(1)
    }× higher than`;
  }
  return `${percentDiff.toFixed(0)}% above`;
}

export default function HubPage() {
  const { verifiedAcquisitions, verifiedCompanies } = useVerifiedDataset();
  const { valuationDisparity, headlineStats } = useDashboardData();
  const dealVelocityTopSector = useMemo(
    () =>
      getDealVelocityTopSector(
        verifiedAcquisitions,
        verifiedCompanies,
        CURRENT_YEAR,
      ),
    [verifiedAcquisitions, verifiedCompanies],
  );
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  return (
    <div id="top">
      <MotionSection className="mb-12">
        <div className="max-w-3xl">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-lacuna-plum sm:text-4xl md:text-5xl">
            <span className="block">Women&apos;s Health M&amp;A</span>
            <span className="lacuna-gradient-text block">Diligence Stack</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-lacuna-blue">
            Prototype investment-research environment — verified deal
            provenance, clinical trial search, genomics governance, and cited
            analytics from public sources.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-lacuna-blue/80">
            n={verifiedAcquisitions.length}{" "}
            verified deals · SEC EDGAR ingest · HIPAA/GDPR genomics layer ·
            descriptive analytics only. Not PitchBook, not live market feeds,
            and not investment advice.
          </p>
        </div>
      </MotionSection>

      <MotionSection delay={0.05} className="mb-10">
        <DataProvenanceBanner />
      </MotionSection>

      <MotionSection delay={0.06} className="mb-10">
        <PipelineStatusStrip />
      </MotionSection>

      <MotionSection
        delay={0.1}
        className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {headlineStats.map((stat) => (
          <StatTile
            key={stat.label}
            value={stat.value}
            label={stat.label}
            model={stat.model}
          />
        ))}
      </MotionSection>

      {valuationDisparity !== null
        ? (
          <ModelProvenanceHint model={VALUATION_DISPARITY_MODEL}>
            <div className="mb-10 rounded-xl border border-lacuna-lavender/40 bg-lacuna-lavender/20 p-4 cursor-help">
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-sm font-medium text-lacuna-plum">
                  Insight
                </span>
                <span className="text-sm text-lacuna-blue">
                  Among disclosed valuations, {valuationDisparity.highSector}
                  {" "}
                  averages {formatValuationGap(valuationDisparity.percentDiff)}
                  {" "}
                  {valuationDisparity.lowSector}{" "}
                  — the widest sector gap in the dataset (n={valuationDisparity
                    .highN} vs n={valuationDisparity.lowN} disclosed).
                </span>
                <button
                  type="button"
                  onClick={() => setMethodologyOpen((v) => !v)}
                  aria-label="How is this calculated?"
                  className="ml-auto shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border border-lacuna-lavender/60 text-lacuna-plum/70 hover:bg-lacuna-lavender/30 transition-colors"
                >
                  ?
                </button>
              </div>
              {methodologyOpen && (
                <div className="mt-3 rounded-lg border border-lacuna-lavender/30 bg-white/70 px-4 py-3 text-xs text-lacuna-blue leading-relaxed">
                  <p className="font-medium text-lacuna-plum mb-1">
                    How the sector gap is calculated
                  </p>
                  <p>
                    For each company with a disclosed last-known valuation, we
                    group by primary sector and compute the mean valuation per
                    group. The gap is the percentage difference between the
                    highest- and lowest-mean sectors. Only sectors with ≥2
                    disclosed valuations are compared. Valuations sourced from
                    public filings, press releases, and Crunchbase where cited —
                    see DataProvenanceBanner above.
                  </p>
                  <a
                    href="https://github.com/maekass/Lacuna/tree/main/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block underline underline-offset-2 hover:text-lacuna-plum"
                  >
                    Full methodology docs →
                  </a>
                </div>
              )}
            </div>
          </ModelProvenanceHint>
        )
        : null}

      <MotionSection delay={0.13} className="mb-10">
        {dealVelocityTopSector !== null
          ? (
            <div className="mb-4 rounded-xl border border-lacuna-lavender/40 bg-lacuna-lavender/20 p-4">
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-sm font-medium text-lacuna-plum">
                  Insight
                </span>
                <span className="text-sm text-lacuna-blue">
                  {dealVelocityTopSector.sector} has seen{" "}
                  {dealVelocityTopSector.count} verified acquisitions in the past
                  four years — the highest velocity among all dataset sectors.
                </span>
              </div>
            </div>
          )
          : null}
        <Link
          href="/payer-ops"
          className="group flex flex-col gap-3 rounded-xl border-l-2 border-lacuna-plum bg-gradient-to-r from-lacuna-plum/5 to-lacuna-lavender/20 p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lacuna-plum text-white text-sm font-bold">
            P
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-lacuna-plum group-hover:text-lacuna-blue">
                Payer Intel
              </span>
              <span className="rounded-full bg-lacuna-pink/40 border border-lacuna-pink/60 px-2 py-0.5 text-[10px] font-semibold text-lacuna-plum uppercase tracking-wide">
                Featured
              </span>
            </div>
            <p className="mt-0.5 text-sm text-lacuna-blue">
              Prior-auth friction, avoidable admin waste, and VC investment
              signals for payer-aligned women&apos;s health deals — built for
              payer corporate venture context.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lacuna-lavender/20 border border-lacuna-lavender/30 px-2 py-0.5 text-[11px] font-medium text-lacuna-plum/80">
                Payer VC lens
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-lacuna-plum/60 group-hover:text-lacuna-blue">
            View
            <span className="inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </span>
        </Link>
      </MotionSection>

      <MotionSection delay={0.15}>
        <h2 className="mb-2 text-2xl font-semibold text-lacuna-plum">
          Choose a workspace
        </h2>
        <p className="mb-6 max-w-2xl text-lacuna-blue">
          Dashboards are grouped by diligence workflow. Each workspace loads
          only the panels you need — shareable URLs, less scroll fatigue.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2">
          {WORKSPACES.map((ws) => (
            <Link
              key={ws.slug}
              href={ws.href}
              className="group rounded-xl border border-lacuna-lavender/40 bg-white/85 backdrop-blur-sm p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-lavender"
            >
              <h3 className="text-lg font-semibold text-lacuna-plum group-hover:text-lacuna-blue">
                {ws.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
                {ws.description}
              </p>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {ws.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-lacuna-lavender/20 border border-lacuna-lavender/30 px-2 py-0.5 text-[11px] font-medium text-lacuna-plum/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {ws.slug === "deals"
                ? (
                  <span className="mt-3 inline-block text-[11px] font-medium text-lacuna-plum/60">
                    {verifiedAcquisitions.length} verified deals in dataset
                  </span>
                )
                : null}
            </Link>
          ))}
        </div>
      </MotionSection>
    </div>
  );
}
