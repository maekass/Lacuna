"use client";

import { Link } from "wouter";
import DataProvenanceBanner from "@/components/DataProvenanceBanner";
import MotionSection from "@/components/ui/MotionSection";
import StatTile from "@/components/ui/StatTile";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { WORKSPACES } from "@/lib/navigation/workspaces";

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
  const { verifiedAcquisitions, valuationDisparity, headlineStats } =
    useDashboardData();

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

      <MotionSection
        delay={0.1}
        className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {headlineStats.map((stat) => (
          <StatTile key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </MotionSection>

      {valuationDisparity !== null
        ? (
          <div className="mb-10 flex items-start gap-3 rounded-xl border border-lacuna-lavender/40 bg-lacuna-lavender/20 p-4">
            <span className="shrink-0 text-sm font-medium text-lacuna-plum">
              Insight
            </span>
            <span className="text-sm text-lacuna-blue">
              Among disclosed valuations, {valuationDisparity.highSector}{" "}
              averages {formatValuationGap(valuationDisparity.percentDiff)}{" "}
              {valuationDisparity.lowSector}{" "}
              — the widest sector gap in the dataset (n={valuationDisparity
                .highN} vs n={valuationDisparity.lowN} disclosed).
            </span>
          </div>
        )
        : null}

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
              className="group rounded-xl border border-lacuna-lavender/40 bg-white p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-lavender"
            >
              <h3 className="text-lg font-semibold text-lacuna-plum group-hover:text-lacuna-blue">
                {ws.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-lacuna-blue">
                {ws.description}
              </p>
              <p className="mt-4 text-xs font-medium text-lacuna-plum/80">
                {ws.sections.length} sections →
              </p>
            </Link>
          ))}
        </div>
      </MotionSection>
    </div>
  );
}
