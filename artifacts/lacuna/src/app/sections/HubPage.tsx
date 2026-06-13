"use client";

import { Link } from "wouter";
import DataProvenanceBanner from "@/components/DataProvenanceBanner";
import MotionSection from "@/components/ui/MotionSection";
import StatTile from "@/components/ui/StatTile";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { WORKSPACES } from "@/lib/navigation/workspaces";

function formatValuationGap(percentDiff: number): string {
  if (percentDiff >= 400) {
    const multiple = 1 + percentDiff / 100;
    return `${multiple >= 10 ? multiple.toFixed(0) : multiple.toFixed(1)}× higher than`;
  }
  return `${percentDiff.toFixed(0)}% above`;
}

export default function HubPage() {
  const { valuationDisparity, headlineStats } = useDashboardData();

  return (
    <div id="top">
      <MotionSection className="mb-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <h1 className="mb-4 text-3xl font-bold leading-tight text-lacuna-plum sm:text-4xl md:text-5xl">
              <span className="block">Women&apos;s Health M&amp;A</span>
              <span className="block">Diligence Stack</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-lacuna-blue/85">
              Prototype investment-research environment — verified deal provenance,
              clinical trial search, genomics governance, and cited analytics from
              public sources.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-lacuna-blue/55">
              SEC EDGAR ingest · HIPAA/GDPR genomics layer · descriptive analytics only.
              Not PitchBook, not live market feeds, and not investment advice.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {headlineStats.map((stat) => (
              <StatTile key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.05} className="mb-8">
        <DataProvenanceBanner />
      </MotionSection>

      {valuationDisparity !== null && (
        <div className="mb-8 border-l-2 border-lacuna-lavender/50 pl-4 py-1">
          <p className="text-sm leading-relaxed text-lacuna-blue/80">
            Among disclosed valuations, {valuationDisparity.highSector}{" "}
            averages {formatValuationGap(valuationDisparity.percentDiff)}{" "}
            {valuationDisparity.lowSector} — the widest sector gap in the
            dataset (n={valuationDisparity.highN} vs n={valuationDisparity.lowN} disclosed).
          </p>
        </div>
      )}

      <MotionSection delay={0.15}>
        <h2 className="mb-2 text-xl font-semibold text-lacuna-plum">
          Workspaces
        </h2>
        <p className="mb-6 max-w-2xl text-sm text-lacuna-blue/65 leading-relaxed">
          Dashboards grouped by diligence workflow — shareable URLs, less scroll fatigue.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WORKSPACES.map((ws) => (
            <Link
              key={ws.slug}
              href={ws.href}
              className="group block rounded-lg border border-lacuna-lavender/25 bg-white p-5 sm:p-6 hover:border-lacuna-lavender/50 hover:bg-lacuna-pink/[0.03] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-lavender"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-lacuna-plum">
                  {ws.label}
                </h3>
                <span className="text-lacuna-blue/30 group-hover:text-lacuna-blue/60 transition-colors text-sm">
                  →
                </span>
              </div>
              <p className="text-sm leading-relaxed text-lacuna-blue/65">
                {ws.description}
              </p>
              <p className="mt-4 text-xs text-lacuna-blue/40">
                {ws.sections.length} sections
              </p>
            </Link>
          ))}
        </div>
      </MotionSection>
    </div>
  );
}
