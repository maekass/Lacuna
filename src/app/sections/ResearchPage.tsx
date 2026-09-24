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
import SpaceWhResearchGapsPanel from "@/components/SpaceWhResearchGapsPanel";
import MotionSection from "@/components/ui/MotionSection";
import SectionHeader from "@/components/ui/SectionHeader";

import type { PatientEmpowermentInsightData } from "@/lib/research/patientEmpowermentInsightTypes";
import type { PatientEmpowermentSnapshot } from "@/lib/research/patientEmpowermentPipeline";
import type { TrialToTransactionSnapshot } from "@/lib/research/trialToTransactionPipeline";

const SECTION = "mb-16 scroll-mt-20 sm:scroll-mt-28";

interface ResearchPageProps {
  empowermentSnapshot: PatientEmpowermentSnapshot;
  empowermentInsight?: PatientEmpowermentInsightData;
  spaceWhSnapshot: TrialToTransactionSnapshot;
}

export default function ResearchPage({
  empowermentSnapshot,
  empowermentInsight,
  spaceWhSnapshot,
}: ResearchPageProps) {
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-lacuna-plum">
          Research workspace
        </h1>
        <p className="mt-2 max-w-2xl text-lacuna-blue">
          Clinical trials, registry fields, genomics, health equity, and patient
          empowerment baselines — public data labeled{" "}
          <code className="text-xs">cited_*</code>{" "}
          or affinity. Heuristic crosswalks stay here; they do not feed deal
          economics, comps, or dual-source badges.
        </p>
      </header>

      <MotionSection id="burden-capital-gap" className={SECTION}>
        <SectionHeader
          title="Burden–Capital Opportunity Context"
          description="WEF/BCG Figure 3: sourced population burden and historical funding context across women's-health therapeutic areas. A research heuristic for diligence questions — not enterprise value. Widest contrast is outside the traditional bucket (CVD, metabolic). Burden columns pending IHME GBD 2023."
        />
        <div className="mb-8">
          <BurdenCapitalGap />
        </div>
        <SectionHeader
          title="Stage funding median"
          description="Burden–Capital Opportunity Context continued: US GBD 2021 burden and historical VC context — WEF-aligned for CVD/metabolic. Dollar output is the verified-dataset stage funding median only; editorial Rock Health / PitchBook medians and gap multipliers are not used as a price."
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
        <SpaceWhResearchGapsPanel snapshot={spaceWhSnapshot} />
      </MotionSection>

      <MotionSection id="clinical-trials" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Clinical Trials Worth Watching"
          description="Live oncology, pelvic health, fibroids, fertility, contraception, maternal health, sickle cell, GRAIL MCED, NCI HER2/pertuzumab, and platinum-resistant ovarian searches plus a cited domestic sample-size catalog."
        />
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ClinicalTrialTracker />
          <DomesticStudyCatalog />
        </div>
        <p className="text-center text-xs text-lacuna-blue/80 mb-6" role="note">
          Trial search is live; cohort sample sizes are static citations.
          Model-derived trial scores are not displayed because Lacuna does not
          currently ship a version trained on a documented, versioned
          ClinicalTrials.gov cohort.
        </p>
      </MotionSection>

      <MotionSection id="evidence-maturity" delay={0.05} className={SECTION}>
        <SectionHeader
          title="Registry fields"
          description="ClinicalTrials.gov and openFDA fields on verified targets when a lookup returns them. Missing records stay blank. They are not a clinical-validation score."
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
        <HealthEquityDashboard empowermentInsight={empowermentInsight} />
      </MotionSection>

      <MotionSection id="impact-assessment" delay={0.2} className={SECTION}>
        <SectionHeader
          title="Measuring What Matters"
          description="Cited burden and penetration context beside verified companies. No composite impact score, and no valuation inferred from a gap."
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
          description="Verified company name, sector, and stage for commercialization context. Report context is not turned into a company score."
        />
        <CommercializationReadiness />
      </MotionSection>
    </div>
  );
}
