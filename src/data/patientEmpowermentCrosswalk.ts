/**
 * Curated company ↔ empowerment gap mappings (analyst-maintained).
 * Preferred over sector/keyword heuristics in the pipeline join.
 */

import type { EmpowermentSourceTier } from "@/lib/research/patientEmpowermentTaxonomy";

export interface CuratedEmpowermentLink {
  companyId: string;
  metricId: string;
  note: string;
  rationale: string;
  reviewedAt: string;
  sourceUrl?: string;
  sourceTier?: EmpowermentSourceTier;
}

const REVIEWED_AT = "2026-07-05";

function link(
  partial: Omit<CuratedEmpowermentLink, "reviewedAt">,
): CuratedEmpowermentLink {
  return { ...partial, reviewedAt: REVIEWED_AT };
}

/** Explicit portfolio ↔ gap links — human-curated, not inferred. */
export const CURATED_EMPOWERMENT_LINKS: readonly CuratedEmpowermentLink[] = [
  link({
    companyId: "c24",
    metricId: "genetic-testing-not-recommended",
    note: "Biotheranostics — breast cancer prognostic genomics",
    rationale:
      "Breast Health diagnostic; EndoPredict / molecular profiling aligns with genetic testing gap.",
    sourceUrl:
      "https://www.hologic.com/hologic-products/tests/breast-cancer-index",
    sourceTier: "website",
  }),
  link({
    companyId: "c24",
    metricId: "no-survivorship-plan",
    note: "Biotheranostics — Breast Cancer Index for survivorship planning",
    rationale:
      "BCI guides extended endocrine therapy in survivorship; JNCCN registry shows plan changes.",
    sourceUrl:
      "https://jnccn.org/view/journals/jnccn/22/2/article-p99.xml",
    sourceTier: "trial",
  }),
  link({
    companyId: "c24",
    metricId: "unaware-survivorship-resources",
    note: "Biotheranostics — BCI patient decision support in survivorship",
    rationale:
      "Report: 2 in 3 unaware of survivorship resources; BCI informs personalized survivorship decisions.",
    sourceUrl:
      "https://www.breastcancer.org/screening-testing/breast-cancer-index-test",
    sourceTier: "website",
  }),
  link({
    companyId: "c25",
    metricId: "genetic-testing-not-recommended",
    note: "Endomagnetics — lymphatic mapping in breast cancer surgery",
    rationale: "Breast Health surgical oncology; adjacency to treatment pathway gaps.",
  }),
  link({
    companyId: "c37",
    metricId: "genetic-testing-not-recommended",
    note: "Genomic Health — Oncotype DX",
    rationale: "Precision oncology genomic assay; direct NCCN-adjacent testing theme.",
    sourceUrl:
      "https://www.exactsciences.com/oncology/oncotype-dx-breast-recurrence-score-test",
    sourceTier: "website",
  }),
  link({
    companyId: "c37",
    metricId: "clinical-trial-offered",
    note: "Genomic Health — Oncotype DX treatment pathway",
    rationale:
      "Oncotype DX informs chemotherapy decisions; precision oncology pathways include trial consideration.",
    sourceUrl:
      "https://investor.exactsciences.com/investor-relations/press-releases/press-release-details/2019/Exact-Sciences-to-Acquire-Genomic-Health-Creating-a-Global-Cancer-Diagnostics-Leader/default.aspx",
    sourceTier: "press",
  }),
  link({
    companyId: "c37",
    metricId: "no-survivorship-plan",
    note: "Genomic Health — recurrence risk guides survivorship",
    rationale:
      "Oncotype DX recurrence score informs post-treatment monitoring and survivorship planning.",
    sourceUrl:
      "https://www.exactsciences.com/oncology/oncotype-dx-breast-recurrence-score-test",
    sourceTier: "website",
  }),
  link({
    companyId: "c38",
    metricId: "genetic-testing-not-recommended",
    note: "Foundation Medicine — comprehensive genomic profiling",
    rationale: "Tumor genomic profiling; report cites under-recommendation of testing.",
    sourceUrl: "https://www.foundationmedicine.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c38",
    metricId: "clinical-trial-offered",
    note: "Foundation Medicine — trial matching ecosystem",
    rationale: "Precision oncology platforms surface trial options; maps to 1-in-5 gap.",
    sourceUrl: "https://www.foundationmedicine.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c38",
    metricId: "no-survivorship-plan",
    note: "Foundation Medicine — genomic-guided follow-up",
    rationale:
      "CGP informs surveillance and survivorship care planning after active treatment.",
    sourceUrl: "https://www.foundationmedicine.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c39",
    metricId: "clinical-trial-offered",
    note: "Flatiron Health — real-world evidence / trial networks",
    rationale: "Oncology data network; clinical trial access theme in report.",
    sourceUrl: "https://flatiron.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c39",
    metricId: "no-survivorship-plan",
    note: "Flatiron — survivorship / RWE monitoring",
    rationale: "Longitudinal oncology data supports survivorship care planning.",
    sourceUrl: "https://flatiron.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c39",
    metricId: "unaware-survivorship-resources",
    note: "Flatiron — patient community / RWE outreach",
    rationale: "Survivorship resources awareness gap in report.",
    sourceUrl: "https://flatiron.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c42",
    metricId: "no-survivorship-plan",
    note: "Focal Therapeutics — breast brachytherapy",
    rationale: "Breast treatment pathway; survivorship planning adjacency.",
  }),
  link({
    companyId: "c46",
    metricId: "clinical-trial-offered",
    note: "GRAIL — multi-cancer early detection trials",
    rationale: "Diagnostics with heavy trial enrollment narrative.",
    sourceUrl: "https://grail.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c46",
    metricId: "no-survivorship-plan",
    note: "GRAIL — screening surveillance in survivorship",
    rationale:
      "Multi-cancer early detection supports long-term surveillance after treatment.",
    sourceUrl: "https://grail.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c52",
    metricId: "genetic-testing-not-recommended",
    note: "Counsyl — reproductive carrier screening",
    rationale: "Germline screening overlap with hereditary cancer testing gap.",
  }),
  link({
    companyId: "c54",
    metricId: "genetic-testing-not-recommended",
    note: "Invitae Reproductive Health — carrier screening",
    rationale: "Germline/hereditary testing overlap with NCCN genetic gap.",
  }),
  link({
    companyId: "c56",
    metricId: "clinical-trial-offered",
    note: "Seagen — ADC oncology clinical development",
    rationale:
      "Pfizer/Seagen oncology portfolio advances breast cancer therapies through clinical trials.",
    sourceUrl:
      "https://www.pfizer.com/news/press-release/press-release-detail/pfizer-completes-acquisition-seagen",
    sourceTier: "press",
  }),
  link({
    companyId: "c56",
    metricId: "no-survivorship-plan",
    note: "Seagen — oncology survivorship support programs",
    rationale:
      "HER2+ and ADC therapies require structured post-treatment monitoring and planning.",
    sourceUrl:
      "https://www.pfizer.com/news/press-release/press-release-detail/pfizer-completes-acquisition-seagen",
    sourceTier: "press",
  }),
  link({
    companyId: "c56",
    metricId: "oncologist-listens",
    note: "Seagen — oncology therapeutics",
    rationale: "Precision Medicine oncology; treatment plan preference integration.",
    sourceUrl:
      "https://www.pfizer.com/news/press-release/press-release-detail/pfizer-completes-acquisition-seagen",
    sourceTier: "press",
  }),
  link({
    companyId: "c56",
    metricId: "unaware-survivorship-resources",
    note: "Seagen — patient support for breast oncology",
    rationale:
      "Oncology patient support programs address survivorship resource awareness gap.",
    sourceUrl:
      "https://www.pfizer.com/news/press-release/press-release-detail/pfizer-completes-acquisition-seagen",
    sourceTier: "press",
  }),
  link({
    companyId: "c57",
    metricId: "clinical-trial-offered",
    note: "Varian — radiation oncology treatment access",
    rationale:
      "Varian cancer care systems integrate trial-ready treatment pathways at community centers.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/siemens-healthineers-to-acquire-varian-medical-systems-to-advance-the-fight-against-cancer-301088373.html",
    sourceTier: "press",
  }),
  link({
    companyId: "c57",
    metricId: "no-survivorship-plan",
    note: "Varian — survivorship care in radiation oncology",
    rationale:
      "Radiation oncology platforms support long-term follow-up and survivorship workflows.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/siemens-healthineers-to-acquire-varian-medical-systems-to-advance-the-fight-against-cancer-301088373.html",
    sourceTier: "press",
  }),
  link({
    companyId: "c58",
    metricId: "clinical-trial-offered",
    note: "Immunomedics — Trodelvy clinical development",
    rationale:
      "Trodelvy (sacituzumab govitecan) advanced through trials for triple-negative breast cancer.",
    sourceUrl:
      "https://www.gilead.com/news-and-press/press-room/press-releases/2020/9/gilead-sciences-to-acquire-immunomedics",
    sourceTier: "press",
  }),
  link({
    companyId: "c58",
    metricId: "no-survivorship-plan",
    note: "Immunomedics — metastatic breast cancer survivorship",
    rationale:
      "ADC therapy for mTNBC requires structured survivorship and monitoring planning.",
    sourceUrl:
      "https://www.gilead.com/news-and-press/press-room/press-releases/2020/9/gilead-sciences-to-acquire-immunomedics",
    sourceTier: "press",
  }),
  link({
    companyId: "c58",
    metricId: "oncologist-listens",
    note: "Immunomedics — oncology therapeutic",
    rationale: "Breast oncology treatment; shared decision-making gap.",
    sourceUrl:
      "https://www.gilead.com/news-and-press/press-room/press-releases/2020/9/gilead-sciences-to-acquire-immunomedics",
    sourceTier: "press",
  }),
  link({
    companyId: "c58",
    metricId: "unaware-survivorship-resources",
    note: "Immunomedics — Gilead patient support programs",
    rationale:
      "Gilead oncology patient services address survivorship resource navigation.",
    sourceUrl:
      "https://www.gilead.com/news-and-press/press-room/press-releases/2020/9/gilead-sciences-to-acquire-immunomedics",
    sourceTier: "press",
  }),
  link({
    companyId: "c59",
    metricId: "clinical-trial-offered",
    note: "Thrive Earlier Detection — cancer screening trials",
    rationale: "Diagnostics oncology screening with trial narrative.",
  }),
  link({
    companyId: "c60",
    metricId: "genetic-testing-not-recommended",
    note: "PreventionGenetics — clinical genetic testing",
    rationale: "Diagnostics genetics lab; hereditary testing gap.",
  }),
  link({
    companyId: "c62",
    metricId: "portal-diagnosis",
    note: "Faxitron Bioptics — breast imaging / biopsy",
    rationale: "Breast diagnostics at detection phase; portal-before-team gap.",
  }),
  link({
    companyId: "c63",
    metricId: "care-team-accessible",
    note: "SuperSonic Imagine — breast ultrasound",
    rationale: "Breast imaging supports care-team navigation at diagnosis.",
  }),
  link({
    companyId: "c65",
    metricId: "genetic-testing-not-recommended",
    note: "Sividon Diagnostics — EndoPredict",
    rationale: "Breast prognostic RNA assay; genetic/genomic profiling dimension.",
    sourceUrl: "https://www.myriad.com/products/endopredict/",
    sourceTier: "website",
  }),
  link({
    companyId: "c65",
    metricId: "no-survivorship-plan",
    note: "Sividon — EndoPredict recurrence risk in survivorship",
    rationale:
      "EndoPredict prognostic score informs extended therapy and survivorship planning.",
    sourceUrl: "https://www.myriad.com/products/endopredict/",
    sourceTier: "website",
  }),
  link({
    companyId: "c65",
    metricId: "unaware-survivorship-resources",
    note: "Sividon — EndoPredict patient decision tools",
    rationale:
      "Prognostic testing helps patients understand survivorship treatment options.",
    sourceUrl: "https://www.myriad.com/products/endopredict/",
    sourceTier: "website",
  }),
  link({
    companyId: "c36",
    metricId: "genetic-testing-not-recommended",
    note: "Sequenom — maternal/fetal genetic testing",
    rationale: "Diagnostics genomics; hereditary testing theme.",
  }),
  link({
    companyId: "c89",
    metricId: "genetic-testing-not-recommended",
    note: "Juniper Genomics",
    rationale: "Diagnostics genomics company in sample.",
  }),
  link({
    companyId: "c93",
    metricId: "full-records-access",
    note: "b.well — health record aggregation",
    rationale: "Digital Health records access; Cures Act / HIPAA records gap.",
  }),
  link({
    companyId: "c93",
    metricId: "hipaa-compliant-institutions",
    note: "b.well — patient-directed records",
    rationale: "Records request compliance theme from report audit.",
  }),
  link({
    companyId: "c114",
    metricId: "full-records-access",
    note: "Maven Clinic — care navigation + records",
    rationale: "Women's health navigation platform; records access prerequisite.",
    sourceUrl: "https://www.mavenclinic.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c114",
    metricId: "care-team-accessible",
    note: "Maven Clinic — virtual care team",
    rationale: "Multidisciplinary access gap (~55% in report).",
    sourceUrl: "https://www.mavenclinic.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c114",
    metricId: "uncomfortable-advocating",
    note: "Maven — patient advocacy coaching",
    rationale: "Report: 1 in 2 uncomfortable advocating to care team.",
    sourceUrl: "https://www.mavenclinic.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c114",
    metricId: "no-survivorship-plan",
    note: "Maven Clinic — postpartum and cancer survivorship navigation",
    rationale:
      "Women's health virtual clinic supports survivorship care coordination.",
    sourceUrl: "https://www.mavenclinic.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c114",
    metricId: "unaware-survivorship-resources",
    note: "Maven Clinic — survivorship resource navigation",
    rationale:
      "Digital clinic connects patients to survivorship programs and specialists.",
    sourceUrl: "https://www.mavenclinic.com",
    sourceTier: "website",
  }),
  link({
    companyId: "c125",
    metricId: "records-not-understandable",
    note: "Simple HealthKit — patient-readable results",
    rationale: "Health literacy / understandable records (1 in 4 gap).",
  }),
  link({
    companyId: "c133",
    metricId: "clinical-trial-offered",
    note: "xCures — trial matching platform",
    rationale: "Digital Health trial navigation; direct clinical-trial-offered gap.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/xcures-raises-12-69-million-in-series-a-funding-for-their-ai-powered-precision-oncology-platform-301318198.html",
    sourceTier: "press",
  }),
  link({
    companyId: "c133",
    metricId: "no-survivorship-plan",
    note: "xCures — longitudinal cancer care records",
    rationale:
      "Platform aggregates records for ongoing care decisions after active treatment.",
    sourceUrl:
      "https://www.businesswire.com/news/home/20220531005196/en/Endeavor-BioMedicines-Partners-with-xCures-to-Identify-Patients-with-PTCH1-mutations-for-Phase-2-Trial-of-ENV-101-taladegib",
    sourceTier: "press",
  }),
  link({
    companyId: "c133",
    metricId: "unaware-survivorship-resources",
    note: "xCures — xINFORM patient treatment options portal",
    rationale:
      "AI platform surfaces personalized treatment options including trials and resources.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/xcures-raises-12-69-million-in-series-a-funding-for-their-ai-powered-precision-oncology-platform-301318198.html",
    sourceTier: "press",
  }),
] as const;

export function curatedLinksByMetricId(
  metricId: string,
): readonly CuratedEmpowermentLink[] {
  return CURATED_EMPOWERMENT_LINKS.filter((l) => l.metricId === metricId);
}

export function curatedLinksByCompanyId(
  companyId: string,
): readonly CuratedEmpowermentLink[] {
  return CURATED_EMPOWERMENT_LINKS.filter((l) => l.companyId === companyId);
}

/** Company IDs with at least one curated empowerment mapping. */
export function curatedCompanyIds(): Set<string> {
  return new Set(CURATED_EMPOWERMENT_LINKS.map((l) => l.companyId));
}
