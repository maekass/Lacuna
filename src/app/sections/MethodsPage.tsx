"use client";

import { CausalInferenceEngine, TemporalValidation } from "@/app/lazyDashboard";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import DatasetCoverageFootnote from "@/components/DatasetCoverageFootnote";
import type { DatasetChangelog } from "@/lib/data/datasetCoverage";
import type { ReactNode } from "react";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

interface MethodsPageProps {
  changelog: DatasetChangelog;
  /** Server-rendered quality census — must not import quality JSON here. */
  dataQuality?: ReactNode;
}

export default function MethodsPage(
  { changelog, dataQuality }: MethodsPageProps,
) {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Methods workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Record-quality grades, observed sector composition, and announcement
          timing from the verified public-source dataset.
        </p>
        <DatasetCoverageFootnote
          changelog={changelog}
          className="mt-3 rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/15 px-3 py-2 text-xs text-lacuna-blue"
        />
        <p className="mt-2 text-xs text-lacuna-blue/80">
          This page does not publish causal effects, Bayesian posteriors, or
          sensitivity bounds. Disclosed-value headlines use the{" "}
          <code className="text-[11px]">disclosed_only_observed_sum</code>{" "}
          estimand from <code className="text-[11px]">lacunaDataset</code>
          ; see{" "}
          <a
            href="https://github.com/maekass/Lacuna/blob/main/docs/LIMITATIONS.md"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            LIMITATIONS.md
          </a>
          .
        </p>
      </header>

      {dataQuality}

      <MotionSection id="observed-patterns" className={SECTION}>
        <SectionHeader
          title="Observed sector composition"
          description="Counts of companies and verified deals by sector. Shares describe this curated set; they are not acquisition probabilities or causal effects."
        />
        <CausalInferenceEngine />
      </MotionSection>

      <MotionSection id="temporal" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Announcement timing"
          description="Year counts from verified press releases and filings in the dataset."
        />
        <TemporalValidation />
      </MotionSection>
    </div>
  );
}
