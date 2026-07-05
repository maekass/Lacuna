"use client";

import { useMemo } from "react";
import {
  ClusteringAnalysis,
  CompanySimilarity,
  CompetitiveAnalysisDashboard,
  DealFlowChart,
  ExitPredictor,
  ForceNetwork,
  NetworkAnalysisHonest,
  QuantValuationPanel,
  SurvivalCurve,
  ValidationTracker,
  ValuationMatrix,
  WhiteSpaceAnalysis,
} from "@/app/lazyDashboard";
import DataCoverageCard from "@/components/DataCoverageCard";
import DataIngestPanel from "@/components/DataIngestPanel";
import DealEmpowermentContext from "@/components/DealEmpowermentContext";
import DealReviewQueue from "@/components/DealReviewQueue";
import PipelineStatusStrip from "@/components/PipelineStatusStrip";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { empowermentContextForDeal } from "@/lib/deals/empowermentContextForDeal";
import { getFeaturedDeal } from "@/lib/deals/getFeaturedDeal";
import { buildPatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

export default function DealsPage() {
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
    const snapshot = buildPatientEmpowermentSnapshot(dataset);
    return empowermentContextForDeal(deal, snapshot);
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
          Verified M&A network, deal flow, valuations, and acquirer landscape —
          descriptive analytics from public sources only.
        </p>
      </header>

      <MotionSection id="data-coverage" className={SECTION}>
        <DataCoverageCard />
        {featuredEmpowerment
          ? (
            <div className="mt-4">
              <SectionHeader
                title="Featured deal — empowerment context"
                description="HLTH/Outcomes4Me 2022 baseline dimensions crosswalked to the pinned featured deal target (affinity-based, not live outcomes)."
              />
              <DealEmpowermentContext context={featuredEmpowerment} />
            </div>
          )
          : null}
      </MotionSection>

      <MotionSection id="data-pipelines" delay={0.03} className={SECTION}>
        <PipelineStatusStrip />
        <div className="mt-4">
          <DataIngestPanel />
        </div>
        <div className="mt-6">
          <DealReviewQueue />
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

      <MotionSection id="quant-valuation" delay={0.17} className={SECTION}>
        <SectionHeader
          title="Quant valuation & exit-likelihood (heuristic)"
          description="Rule-based valuation anchored on verified comparable deals, with burden-capital gap signal per sector. Not a trained model — not investment advice."
        />
        <QuantValuationPanel />
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
          <ExitPredictor />
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
