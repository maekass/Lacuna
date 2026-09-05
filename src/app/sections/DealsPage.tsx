"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClusteringAnalysis,
  CompanySimilarity,
  CompetitiveAnalysisDashboard,
  DealFlowChart,
  ForceNetwork,
  NetworkAnalysisHonest,
  SurvivalCurve,
  ValidationTracker,
  ValuationMatrix,
  WhiteSpaceAnalysis,
} from "@/app/lazyDashboard";
import DataCoverageCard from "@/components/DataCoverageCard";
import DataQualityVisibility from "@/components/DataQualityVisibility";
import DatasetScopeBanner from "@/components/DatasetScopeBanner";
import DealEmpowermentContext from "@/components/DealEmpowermentContext";
import ReviewConsole from "@/components/ReviewConsole";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { empowermentContextForDeal } from "@/lib/deals/empowermentContextForDeal";
import { getFeaturedDeal } from "@/lib/deals/getFeaturedDeal";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

export default function DealsPage() {
  const searchParams = useSearchParams();
  const highlightNodeId = searchParams.get("highlight") ?? undefined;
  const { networkNodes, networkLinks, dealsByYear } = useDashboardData();
  const {
    verifiedCompanies,
    verifiedAcquirers,
    verifiedAcquisitions,
    dataProvenance,
  } = useVerifiedDataset();

  const featuredEmpowerment = useMemo(() => {
    const dataset = {
      companies: verifiedCompanies,
      acquirers: verifiedAcquirers,
      acquisitions: verifiedAcquisitions,
      provenance: dataProvenance,
    };
    const deal = getFeaturedDeal(dataset);
    if (!deal) return null;
    return empowermentContextForDeal(deal, dataset);
  }, [
    verifiedCompanies,
    verifiedAcquirers,
    verifiedAcquisitions,
    dataProvenance,
  ]);

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">Deals workspace</h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Medicine and biotech M&A — therapeutics, diagnostics, medtech, and
          clinical women&apos;s health. Descriptive analytics from public
          sources only.
        </p>
      </header>

      <MotionSection className="mb-8">
        <DatasetScopeBanner
          scope="med_biotech"
          companyCount={verifiedCompanies.length}
          dealCount={verifiedAcquisitions.length}
        />
      </MotionSection>

      <MotionSection id="data-coverage" className={SECTION}>
        <DataCoverageCard />
        <div className="mt-4">
          <DataQualityVisibility compact />
        </div>
        {featuredEmpowerment
          ? (
            <div className="mt-4">
              <SectionHeader
                title="Featured deal — empowerment context"
                description="HLTH/Outcomes4Me 2022 cited survey items mapped to the featured deal by analyst curation — not live outcomes or keyword affinity."
              />
              <DealEmpowermentContext context={featuredEmpowerment} />
            </div>
          )
          : null}
      </MotionSection>

      <MotionSection id="review" delay={0.03} className={SECTION}>
        {/* Back-compat anchor for older links */}
        <span id="data-pipelines" />
        <SectionHeader
          title="Review console"
          description="Staging candidates (SEC + manual import) live in Postgres until promoted into the verified dataset. Use this console to review, attest, preview, and promote."
        />
        <div className="mt-4">
          <ReviewConsole />
        </div>
      </MotionSection>

      <MotionSection id="network" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Who's Connected to Whom"
          description="Explore the relationships between acquirers and the women's health companies they've welcomed into their portfolios."
        />
        <ForceNetwork
          nodes={networkNodes}
          links={networkLinks}
          highlightPortfolios={true}
          highlightNodeId={highlightNodeId}
        />
      </MotionSection>

      <MotionSection id="analytics" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Deal Flow"
          description="Announced women's health M&A deals by year from verified public sources."
        />
        <DealFlowChart data={dealsByYear} />
      </MotionSection>

      <MotionSection id="matrix" delay={0.15} className={SECTION}>
        <ValuationMatrix />
      </MotionSection>

      <MotionSection id="network-analysis" delay={0.2} className={SECTION}>
        <SectionHeader
          title="A Closer Look at the Network"
          description="How concentrated is the acquirer landscape? Honest statistical measures with transparent confidence intervals."
        />
        <NetworkAnalysisHonest />
      </MotionSection>

      <MotionSection id="competitive-analysis" delay={0.22} className={SECTION}>
        <SectionHeader
          title="Getting to Know the Acquirers"
          description="Who's been most active, what are they building, and how do their strategies compare?"
        />
        <CompetitiveAnalysisDashboard />
      </MotionSection>

      <MotionSection id="validation-tracker" delay={0.24} className={SECTION}>
        <SectionHeader
          title="Did the Deal Deliver?"
          description="Checking in on what happened after the acquisition — did the outcomes match the promise?"
        />
        <ValidationTracker />
      </MotionSection>

      <MotionSection id="descriptive-scoring" delay={0.26} className={SECTION}>
        <SectionHeader
          title="Finding Companies Like Each Other"
          description="Which women's health companies share similar profiles? Explore natural groupings and see how they compare."
        />
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <CompanySimilarity />
        </div>
        <ClusteringAnalysis />
      </MotionSection>

      <MotionSection id="white-space-analysis" delay={0.28} className={SECTION}>
        <SectionHeader
          title="White Space Analysis"
          description="Sectors with high company density but low M&A activity — where the next wave may form."
        />
        <WhiteSpaceAnalysis />
      </MotionSection>

      <MotionSection id="survival-analysis" delay={0.30} className={SECTION}>
        <SectionHeader
          title="Time-to-Acquisition Survival Analysis"
          description="Kaplan-Meier estimates of how long companies in each sector remain independent — with log-rank test and Greenwood confidence bands."
        />
        <SurvivalCurve />
      </MotionSection>
    </div>
  );
}
