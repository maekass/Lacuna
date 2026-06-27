"use client";

import {
  BurdenCapitalGap,
  BurdenCapitalGapValuation,
  ClinicalTrialTracker,
  CommercializationReadiness,
  DomesticStudyCatalog,
  EvidenceMaturityDashboard,
  HealthEquityDashboard,
  ImpactOpportunityCard,
  VariantCallsetBrowser,
} from "@/app/lazyDashboard";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";

const SECTION = "mb-16 scroll-mt-28";

export default function ResearchPage() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Research workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Clinical trials, evidence maturity, genomics governance, and health
          equity markers — with honest limits on live vs static data.
        </p>
      </header>

      <MotionSection id="burden-capital-gap" className={SECTION}>
        <SectionHeader
          title="Burden–Capital Gap"
          description="WEF/BCG Figure 3: capital raised vs. disease burden across women's-health therapeutic areas. Women's health is underfunded relative to burden — widest in conditions outside the traditional bucket (CVD, metabolic). Burden columns pending IHME GBD 2023."
        />
        <div className="mb-8">
          <BurdenCapitalGap />
        </div>
        <SectionHeader
          title="Gap valuation model"
          description="US GBD 2021 burden × Rock Health / PitchBook FemTech VC (2019–2024) — deal-level heuristic scoring. Complements the WEF chart above; capital figures differ by design. Cardiovascular and metabolic areas not yet in scoring model."
        />
        <BurdenCapitalGapValuation />
      </MotionSection>

      <MotionSection id="clinical-trials" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Clinical Trials Worth Watching"
          description="Live oncology, pelvic health, fibroids, fertility, contraception, maternal health, and sickle cell searches plus a cited domestic sample-size catalog."
        />
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ClinicalTrialTracker />
          <DomesticStudyCatalog />
        </div>
        <p className="text-center text-xs text-lacuna-blue/80" role="note">
          Trial search is live; cohort sample sizes are static citations.
        </p>
      </MotionSection>

      <MotionSection id="evidence-maturity" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Evidence maturity (descriptive)"
          description="Trial phase, FDA status, and publication flags scored from public metadata on verified companies — not a validated evidence benchmark."
        />
        <EvidenceMaturityDashboard />
      </MotionSection>

      <MotionSection id="variant-callsets" delay={0.1} className={SECTION}>
        <VariantCallsetBrowser />
      </MotionSection>

      <MotionSection id="health-equity" delay={0.15} className={SECTION}>
        <SectionHeader
          title="Genetic Markers & Health Equity"
          description="Maternal mortality, PCOS, hereditary breast cancer, sickle cell, lupus, and Lynch syndrome — with disparities that disproportionately affect Black women in the verified portfolio."
        />
        <HealthEquityDashboard />
      </MotionSection>

      <MotionSection id="impact-assessment" delay={0.2} className={SECTION}>
        <SectionHeader
          title="Measuring What Matters"
          description="How much real-world health impact could these acquisitions have? We score each honestly — and tell you what we can't measure, too."
        />
        <ImpactOpportunityCard />
      </MotionSection>

      <MotionSection
        id="commercialization-readiness"
        delay={0.25}
        className={SECTION}
      >
        <SectionHeader
          title="From Lab to Venture"
          description="For NIH researchers and academic founders evaluating commercialization pathways — evidence maturity, reimbursement readiness, and acquirer sector activity."
        />
        <CommercializationReadiness />
      </MotionSection>
    </div>
  );
}
