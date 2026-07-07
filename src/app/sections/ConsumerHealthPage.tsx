"use client";

import {
  DealFlowChart,
  ForceNetwork,
  ValuationMatrix,
} from "@/app/lazyDashboard";
import DataCoverageCard from "@/components/DataCoverageCard";
import DatasetScopeBanner from "@/components/DatasetScopeBanner";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { useDashboardData } from "@/lib/data/useDashboardData";
import { CONSUMER_FEATURED_DEAL_ID } from "@/lib/deals/dealTypes";
import { getDealById } from "@/lib/deals/getDealById";
import Link from "next/link";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

export default function ConsumerHealthPage() {
  const { networkNodes, networkLinks, dealsByYear } = useDashboardData();
  const {
    verifiedCompanies,
    verifiedAcquirers,
    verifiedAcquisitions,
    dataProvenance,
  } = useVerifiedDataset();

  const featuredDeal = getDealById(
    {
      companies: verifiedCompanies,
      acquirers: verifiedAcquirers,
      acquisitions: verifiedAcquisitions,
      provenance: dataProvenance,
    },
    CONSUMER_FEATURED_DEAL_ID,
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Consumer health workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Wearables, wellness apps, and consumer digital health M&A — a separate
          diligence track from medicine and biotech.
        </p>
      </header>

      <MotionSection className="mb-10">
        <DatasetScopeBanner
          scope="consumer_health"
          companyCount={verifiedCompanies.length}
          dealCount={verifiedAcquisitions.length}
        />
      </MotionSection>

      {featuredDeal
        ? (
          <MotionSection delay={0.03} className="mb-8">
            <div className="rounded-xl border border-lacuna-lavender/30 bg-white/80 p-4 text-sm text-lacuna-blue">
              <span className="font-medium text-lacuna-plum">
                Featured deal:
              </span>{" "}
              {featuredDeal.acquisition.acquirerName} →{" "}
              {featuredDeal.acquisition.targetName}
              {featuredDeal.acquisition.dealValue
                ? ` · $${featuredDeal.acquisition.dealValue}M disclosed`
                : ""}
              {" · "}
              <Link
                href={`/deals/${featuredDeal.acquisition.id}`}
                className="font-medium text-lacuna-plum underline-offset-2 hover:underline"
              >
                Deal detail
              </Link>
            </div>
          </MotionSection>
        )
        : null}

      <MotionSection id="coverage" delay={0.05} className={SECTION}>
        <DataCoverageCard />
      </MotionSection>

      <MotionSection id="network" delay={0.08} className={SECTION}>
        <SectionHeader
          title="Consumer health deal network"
          description="Acquirers and targets in wearables, wellness, and consumer digital health — verified public sources only."
        />
        <ForceNetwork nodes={networkNodes} links={networkLinks} />
      </MotionSection>

      <MotionSection id="activity" delay={0.1} className={SECTION}>
        <SectionHeader
          title="Deal activity"
          description="Year-over-year announced deals in the consumer health scope."
        />
        <DealFlowChart data={dealsByYear} />
      </MotionSection>

      <MotionSection id="matrix" delay={0.12} className={SECTION}>
        <SectionHeader
          title="Valuation matrix"
          description="Sector × stage heatmap using disclosed values in this scope."
        />
        <ValuationMatrix />
      </MotionSection>
    </div>
  );
}
