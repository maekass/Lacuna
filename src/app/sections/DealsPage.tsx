"use client";

import {
  ClusteringAnalysis,
  CompanySimilarity,
  CompetitiveAnalysisDashboard,
  DealFlowChart,
  ExitPredictor,
  ForceNetwork,
  NetworkAnalysisHonest,
  ValidationTracker,
  ValuationMatrix,
  WhiteSpaceAnalysis,
} from "@/app/lazyDashboard";
import DataCoverageCard from "@/components/DataCoverageCard";
import DataIngestPanel from "@/components/DataIngestPanel";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import { useDashboardData } from "@/lib/data/useDashboardData";

const SECTION = "mb-16 scroll-mt-28";

export default function DealsPage() {
  const {
    verifiedCompanies,
    verifiedAcquisitions,
    networkNodes,
    networkLinks,
    dealsByYear,
  } = useDashboardData();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">Deals workspace</h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Verified M&amp;A network, deal flow, valuations, and acquirer
          landscape — descriptive analytics from public sources only.
        </p>
      </header>

      <MotionSection id="data-coverage" className={SECTION}>
        <DataCoverageCard />
      </MotionSection>

      <MotionSection id="data-pipelines" delay={0.03} className={SECTION}>
        <DataIngestPanel />
      </MotionSection>

      <MotionSection id="network" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Who's Connected to Whom"
          description="Explore the relationships between acquirers and the women's health companies they've welcomed into their portfolios."
        />
        <ForceNetwork
          nodes={networkNodes}
          links={networkLinks}
          highlightForeground={true}
        />
      </MotionSection>

      <MotionSection
        id="analytics"
        delay={0.1}
        className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2"
      >
        <DealFlowChart data={dealsByYear} />
        <div className="rounded-xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
          <SectionHeader
            title="What's Happening Now"
            description="The latest deals shaping the women's health landscape."
          />
          <div className="space-y-4">
            {verifiedAcquisitions.slice(0, 5).map((deal) => {
              const target = verifiedCompanies.find((c) =>
                c.id === deal.targetId
              );
              const acquirer = networkNodes.find((n) =>
                n.id === deal.acquirerId
              );
              return (
                <div
                  key={deal.id}
                  className="flex flex-col justify-between gap-1 rounded-lg bg-lacuna-pink/10 p-3 sm:flex-row sm:items-center sm:gap-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-lacuna-plum">
                      {target?.name}
                    </p>
                    <p className="truncate text-xs text-lacuna-blue">
                      {deal.dealType} by {acquirer?.name || deal.acquirerName}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    {deal.dealValue
                      ? (
                        <p className="font-semibold text-lacuna-plum">
                          ${deal.dealValue}M
                        </p>
                      )
                      : (
                        <p className="text-xs text-lacuna-blue/70">
                          Terms not disclosed
                        </p>
                      )}
                    <p className="text-xs text-lacuna-blue/70">
                      {deal.announcedDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
    </div>
  );
}
