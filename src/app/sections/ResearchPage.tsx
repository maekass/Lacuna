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
import PatientEmpowermentPanel from "@/components/PatientEmpowermentPanel";
import WomensHealthExitsContext from "@/components/WomensHealthExitsContext";
import RhCapitalPortfolioContext from "@/components/RhCapitalPortfolioContext";
import ClinicalTrialsMlPanel from "@/components/ClinicalTrialsMlPanel";
import SpaceWhResearchGapsPanel from "@/components/SpaceWhResearchGapsPanel";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";

import type { PatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

interface ResearchPageProps {
  empowermentSnapshot?: PatientEmpowermentSnapshot;
}

export default function ResearchPage({
  empowermentSnapshot,
}: ResearchPageProps) {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Research workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Clinical trials, evidence maturity, genomics, health equity, and
          patient empowerment baselines — public data, cited.
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
          description="US GBD 2021 burden × VC deployed — WEF-aligned for CVD/metabolic ($10M / $4M), Rock Health / PitchBook elsewhere. Cardiovascular and metabolic areas now in gap scoring. Heuristic — not financial advice."
        />
        <BurdenCapitalGapValuation />
      </MotionSection>

      <MotionSection id="womens-health-exits" delay={0.03} className={SECTION}>
        <SectionHeader
          title="Women's health exit landscape"
          description="AOA Dx Follow the Exits (Jan 2026): 276 exits and $100B+ in M&A/IPO value (2000–2025), often mis-tagged in PitchBook. Compared honestly to Lacuna's curated deal set."
        />
        <WomensHealthExitsContext />
      </MotionSection>

      <MotionSection id="rh-capital-portfolio" delay={0.04} className={SECTION}>
        <SectionHeader
          title="RH Capital portfolio"
          description="Funds I & II (Foreground Capital): cited funding and exit notes for portfolio companies on rhcapital.vc — overlaid on the network graph as RH Capital."
        />
        <RhCapitalPortfolioContext />
      </MotionSection>

      <MotionSection id="space-wh-gaps" delay={0.045} className={SECTION}>
        <SectionHeader
          title="Space research → trial → transaction"
          description="Space-linked women's health assets scored on a fixed pipeline (research signal → space validation → Earth trial → company → verified M&A). Gap matrix and LLM analyst expose where research never becomes a deal."
        />
        <SpaceWhResearchGapsPanel />
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
        <p className="text-center text-xs text-lacuna-blue/80 mb-6" role="note">
          Trial search is live; cohort sample sizes are static citations.
        </p>
        <ClinicalTrialsMlPanel />
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

      <MotionSection id="patient-empowerment" delay={0.12} className={SECTION}>
        <SectionHeader
          title="Patient empowerment baseline"
          description="HLTH Foundation / Outcomes4Me (2022): cited empowerment gaps indexed 0–100 and crosswalked to Lacuna portfolio by sector + keyword affinity. GET /api/research/patient-empowerment."
        />
        <PatientEmpowermentPanel snapshot={empowermentSnapshot} />
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
