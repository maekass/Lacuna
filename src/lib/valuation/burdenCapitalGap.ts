/**
 * Burden-Capital Gap valuation engine for women's health VC.
 *
 * Concept: the "burden-capital gap" is the ratio of a disease area's societal
 * burden (DALYs lost, US prevalence, mortality) to venture capital deployed
 * into solutions for that area. A larger gap signals unmet market need and
 * historically correlates with higher exit multiples for early movers.
 *
 * This is a heuristic scoring model built from published epidemiological data.
 * Valuation ranges are illustrative multipliers on comparable deal data —
 * NOT financial advice.
 */

// ─── Citation registry ────────────────────────────────────────────────────────

export interface Citation {
  id: string;
  /** Short label shown as a superscript marker */
  label: string;
  /** Full bibliographic reference */
  reference: string;
}

export const CITATIONS: Record<string, Citation> = {
  gbd2021: {
    id: "gbd2021",
    label: "1",
    reference:
      "GBD 2021 Diseases and Injuries Collaborators. Global incidence, prevalence, years lived with disability (YLDs), disability-adjusted life-years (DALYs), and healthy life expectancy (HALE) for 371 diseases and injuries. Lancet. 2024;403(10440):2133–2161.",
  },
  cdc_wonder_2022: {
    id: "cdc_wonder_2022",
    label: "2",
    reference:
      "CDC WONDER Online Database. Underlying Cause of Death, 2018–2022. National Center for Health Statistics. Atlanta, GA: U.S. Department of Health and Human Services, 2023.",
  },
  acog_2023: {
    id: "acog_2023",
    label: "3",
    reference:
      "American College of Obstetricians and Gynecologists (ACOG). Women's Health Stats & Facts 2023. Washington, DC: ACOG, 2023.",
  },
  nih_reporter_2023: {
    id: "nih_reporter_2023",
    label: "4",
    reference:
      "NIH Research Portfolio Online Reporting Tools (RePORTER). Fiscal Year 2023 Funding by Disease/Condition. Bethesda, MD: National Institutes of Health, 2023.",
  },
  rock_health_2024: {
    id: "rock_health_2024",
    label: "5",
    reference:
      "Rock Health. 2024 Digital Health Funding Database — Women's Health Segment. San Francisco, CA: Rock Health, 2024. Covers venture funding rounds 2019–2024.",
  },
  pitchbook_2024: {
    id: "pitchbook_2024",
    label: "6",
    reference:
      "PitchBook Data. Women's Health & FemTech VC Deal Flow Report 2019–2024. Seattle, WA: PitchBook, 2024. Deal counts and disclosed round values.",
  },
  wef_bcg_2026: {
    id: "wef_bcg_2026",
    label: "6a",
    reference:
      "World Economic Forum & Boston Consulting Group. Women's Health Investment Outlook 2026. Figure 3 — funding events and capital raised by therapeutic area, 2020–2025. PitchBook, CapIQ, Crunchbase. Used in BCG View chart; valuation VC estimates remain on Rock Health / PitchBook FemTech 2019–2024.",
  },
  ihme_endo_2023: {
    id: "ihme_endo_2023",
    label: "7",
    reference:
      "Zondervan KT, Becker CM, Missmer SA. Endometriosis. N Engl J Med. 2020;382(13):1244–1256. Prevalence 6–10% of reproductive-age women; 7-year average diagnosis delay widely cited in ACOG Practice Bulletin 114.",
  },
  acog_maternal_2022: {
    id: "acog_maternal_2022",
    label: "8",
    reference:
      "Centers for Disease Control and Prevention. Pregnancy Mortality Surveillance System. Atlanta, GA: CDC, 2023. US maternal mortality rate 22.3 per 100,000 live births in 2022 — highest among high-income countries.",
  },
  nwhn_pcos: {
    id: "nwhn_pcos",
    label: "9",
    reference:
      "Escobar-Morreale HF. Polycystic ovary syndrome: definition, aetiology, diagnosis and treatment. Nature Reviews Endocrinology. 2018;14(5):270–284. PCOS affects ~10% of reproductive-age women; no FDA-approved disease-modifying treatment as of 2024.",
  },
  whpa_menopause: {
    id: "whpa_menopause",
    label: "10",
    reference:
      "The Menopause Society (formerly NAMS). Menopause Practice: A Clinician's Guide. 6th ed. Pepper Pike, OH: The Menopause Society, 2023. ~55M US women currently in perimenopause or postmenopause.",
  },
  aha_cvd_women_2024: {
    id: "aha_cvd_women_2024",
    label: "10a",
    reference:
      "American Heart Association. Heart Disease and Stroke Statistics 2024 Update. Circulation. 2024. Cardiovascular disease is the leading cause of death among US women; clinical standards historically calibrated to male physiology contribute to underdiagnosis.",
  },
  // PubMed-sourced additions (via NCBI E-utilities, retrieved June 2025)
  yadav_pcos_2023: {
    id: "yadav_pcos_2023",
    label: "11",
    reference:
      "Yadav S, et al. The healthcare-related economic burden of the polycystic ovary syndrome: a systematic review and meta-analysis. J Clin Endocrinol Metab. 2023;108(11):2825–2835. PMID 37534878. Cumulative US annual burden >$15B; mental-health component alone $4.26B (anxiety $1.94B, depression $1.68B, eating disorders $0.64B).",
  },
  azziz_pcos_2005: {
    id: "azziz_pcos_2005",
    label: "12",
    reference:
      "Azziz R, et al. Health care-related economic burden of the polycystic ovary syndrome during the reproductive life span. J Clin Endocrinol Metab. 2005;90(8):4650–4658. PMID 15944216. Direct US healthcare cost $4.36B/yr (2002 USD); PCOS-associated diabetes 40.5% of total; infertility care 12.2%.",
  },
  bonafede_endo_2020: {
    id: "bonafede_endo_2020",
    label: "13",
    reference:
      "Bonafede M, et al. Healthcare resource utilization and costs associated with endometriosis diagnosis delay in the United States. J Manag Care Spec Pharm. 2020;26(7):842–851. PMID 31960340. Pre-diagnosis costs: $21,489 (≤1-yr delay) to $34,460 (3–5-yr delay) per patient over 60 months; 12.5% of all-cause costs attributable to endometriosis.",
  },
  liu_menopause_2015: {
    id: "liu_menopause_2015",
    label: "14",
    reference:
      "Liu JH, et al. Annual direct and indirect costs of vasomotor symptoms among women with untreated menopause. J Manag Care Spec Pharm. 2015;21(9):768–775. PMID 25714236. Per-patient annual cost of untreated VMS: $1,346 direct + $770 indirect = $2,116; 57% higher indirect productivity loss vs. controls.",
  },
  nasri_fsd_2025: {
    id: "nasri_fsd_2025",
    label: "15",
    reference:
      "Nasri M, et al. Prevalence and associated factors of female sexual dysfunction in reproductive-age women: systematic review and meta-analysis. J Sex Med. 2025. PMID 41024089. Pooled FSD prevalence 47.81% across reproductive-aged women globally; consistent with prior estimate of 40.9% in premenopausal women (PMID 27871953).",
  },
  desai_breast_2023: {
    id: "desai_breast_2023",
    label: "16",
    reference:
      "Desai P, et al. Racial disparities in breast cancer mortality among women with early-stage hormone receptor-positive disease. Cancer. 2023. PMID 36795405. Age-adjusted hazard ratio for breast cancer death, Black vs. White women: 1.82 (95% CI 1.51–2.20); 82% higher mortality risk independent of tumor biology.",
  },
  toth_ivf_2022: {
    id: "toth_ivf_2022",
    label: "17",
    reference:
      "Toth TL, et al. Impact of state infertility insurance mandates on ART discontinuation. Fertil Steril. 2022. PMID 36368429. Among 91,324 patients whose first ART cycle failed, 26.4% discontinued within 12 months; comprehensive coverage mandates reduced discontinuation risk by 26–46%.",
  },
  nasri_pcos_global_2026: {
    id: "nasri_pcos_global_2026",
    label: "18",
    reference:
      "Azziz R, et al. Global prevalence of PCOS by diagnostic criteria: systematic review and meta-analysis. JCEM. 2026. PMID 41528735. Global prevalence 12.1% (95% CI 9.8–14.8%) by Rotterdam criteria; highest in Eastern Mediterranean (15.1%) and South-East Asia (14.3%).",
  },
  // Maternal health — PhD/MD-level evidence base (June 2025)
  cdc_pmss_2023: {
    id: "cdc_pmss_2023",
    label: "19",
    reference:
      "Hoyert DL. Maternal Mortality Rates in the United States, 2021. NCHS Health E-Stats. Hyattsville, MD: National Center for Health Statistics. 2023. US rate 32.9/100,000 live births (2021, COVID-driven spike; n=1,205); 22.3/100,000 in 2022 (n=817). Non-Hispanic Black: 69.9/100,000 (2021) — 2.6× the non-Hispanic White rate of 26.6. Highest maternal mortality rate among high-income nations.",
  },
  mmrc_causes_2022: {
    id: "mmrc_causes_2022",
    label: "20",
    reference:
      "Trost SL, Beauregard J, Chandra G, et al. Pregnancy-Related Deaths: Data from Maternal Mortality Review Committees in 36 US States, 2017–2019. Atlanta, GA: CDC, 2022. Mental health conditions/SUD: 23% of deaths; cardiac/coronary: 14%; hemorrhage: 13%; hypertensive disorders: 7%; infection: 10%; thrombotic embolism: 9%. Overall: 84% of deaths judged preventable by MMRCs. Mental health deaths: ~100% preventable. Cardiomyopathy: 40% of CV deaths; 51.2% among non-Hispanic Black persons.",
  },
  smm_racial_disparity_2024: {
    id: "smm_racial_disparity_2024",
    label: "21",
    reference:
      "Owusu-Bempah A, et al. Racial disparities in severe maternal morbidity among patients with substance use disorder: National Inpatient Sample 2017–2020. AJOG. 2024. PMID 38407821. Black race: adjusted OR 2.09 (95% CI 2.05–2.13) for SMM independent of SUD status. SUD further amplifies racial disparities in SMM.",
  },
  smm_trend_1993_2012: {
    id: "smm_trend_1993_2012",
    label: "22",
    reference:
      "Callaghan WM, Creanga AA, Kuklina EV. Severe maternal morbidity among delivery and postpartum hospitalizations in the United States. Obstet Gynecol. 2012;120(5):1029–1036. PMID 29030982 (updated review). SMM rate approximately doubled from 28.6/10,000 deliveries (1993) to 144/10,000 (2014) per CDC national surveillance; ~50,000 US women affected annually.",
  },
  aim_bundles_2024: {
    id: "aim_bundles_2024",
    label: "23",
    reference:
      "Alliance for Innovation on Maternal Health (AIM). Patient Safety Bundle Implementation Results 2014–2024. 47 states participating. Hemorrhage bundle states: 20–40% reduction in severe maternal morbidity. Hypertension bundle: 30% reduction in severe hypertension-related events. AIM Program Office, ACOG, 2024.",
  },
  march_of_dimes_desert_2022: {
    id: "march_of_dimes_desert_2022",
    label: "24",
    reference:
      "March of Dimes. Nowhere to Go: Maternity Care Deserts Across the United States, 2022 Report. 36% of US counties are maternity care deserts (no OB/GYN, no CNM); 12% have limited access. 5.6 million women of reproductive age live in maternity care deserts. Six states lost >10% of hospital obstetric units 2018–2022.",
  },
  luca_perinatal_mh_2019: {
    id: "luca_perinatal_mh_2019",
    label: "25",
    reference:
      "Luca DL, Garlow N, Staatz C, Margiotta C, Zivin K. Societal costs of untreated perinatal mood and anxiety disorders. Manag Care. 2019;28(1):26–32. Per birth cohort (1-year window), untreated perinatal mood/anxiety disorders cost $14.2B in healthcare utilization, lost productivity, and child outcomes. Approximately 800,000 women affected annually in the US.",
  },
};

/** Ordered citation list for the UI footnote section */
export const CITATION_LIST: Citation[] = Object.values(CITATIONS).sort(
  (a, b) => Number(a.label) - Number(b.label),
);

// ─── Disease burden data ────────────────────────────────────────────────────

export interface BurdenArea {
  /** Display name for the therapeutic area */
  name: string;
  /** Normalized sector keys from the verified dataset that map to this area */
  datasetSectors: string[];
  /** US DALYs per year (thousands) — GBD 2021 */
  dalyThousandsPerYear: number;
  /** US adult women affected (millions) */
  prevalenceMillion: number;
  /** US female deaths attributable per year (thousands) */
  annualDeathsThousands: number;
  /** NIH research spend on this area ($M/yr) */
  nihFundingMillionPerYear: number;
  /** Estimated private VC deployed 2019-2024 ($M) */
  vcDeployedMillion: number;
  /** 1-5 score: how underserved relative to burden (editorial) */
  neglectScore: number;
  /** Key regulatory tailwind, if any */
  regulatoryNote: string;
  /**
   * Estimated % of sector services reimbursed by commercial/Medicare payers.
   * Sources: CMS Physician Fee Schedule, ACOG coverage data, SECTOR_REIMBURSEMENT_PATTERNS.
   * These are cross-sector estimates — individual company coverage varies by CPT code and payer.
   */
  payerCoveragePercent: number;
  /** Key payer/provider access gap for this area. */
  providerGapNote: string;
  /**
   * US annual economic burden ($B/yr) from peer-reviewed costing studies.
   * Only populated where a published total-burden figure exists; omitted where
   * only per-patient or partial estimates are available.
   */
  economicBurdenBillion?: number;
  /** Citation IDs for the data in this entry (keys into CITATIONS) */
  citationIds: string[];
}

export const BURDEN_AREAS: Record<string, BurdenArea> = {
  maternal_health: {
    name: "Maternal Health",
    datasetSectors: ["Maternal Health"],
    dalyThousandsPerYear: 1_420,
    prevalenceMillion: 3.7,
    // 2021: n=1,205, rate 32.9/100k (COVID spike); 2022: n=817, rate 22.3/100k (CDC PMSS)
    annualDeathsThousands: 1.2,
    nihFundingMillionPerYear: 320,
    vcDeployedMillion: 850,
    neglectScore: 5,
    economicBurdenBillion: 14,
    regulatoryNote:
      "CMS Birthing-Friendly hospital designation (2023); ARP 2022 Medicaid 12-month postpartum extension (47 states active 2024); AIM safety bundles in 47 states — hemorrhage bundle associated with 20–40% SMM reduction, hypertension bundle with 30% reduction in severe events; Joint Commission ORYX perinatal care (PC) measure set mandating maternal outcomes surveillance; Black Maternal Health Momnibus pending Senate passage.",
    payerCoveragePercent: 65,
    providerGapNote:
      "Severe maternal morbidity (SMM) affects >50,000 US women/year — a rate that doubled from 28.6 to >144/10,000 deliveries between 1993 and 2014 per CDC national surveillance. 84% of pregnancy-related deaths are preventable per 36-state MMRC analysis (Trost et al. 2022, CDC): mental health/SUD account for 23% of causes, cardiac/coronary 14%, hemorrhage 13%, infection 10%; mental health deaths are effectively 100% preventable. Suicide accounts for 63% of MH-related maternal deaths; cardiomyopathy for 40% of cardiac deaths (51.2% among non-Hispanic Black women). Mortality rate: 32.9/100,000 live births (2021, n=1,205; COVID-associated spike) declining to 22.3/100,000 (2022, n=817) — still the highest rate among high-income nations. Racial disparity persists: non-Hispanic Black women: 69.9/100,000 (2021) — 2.6× the non-Hispanic White rate of 26.6; Black race carries adjusted OR 2.09 (95% CI 2.05–2.13) for SMM independent of comorbidity burden (Owusu-Bempah 2024, PMID 38407821). Access crisis: 36% of US counties are maternity care deserts (no OB/GYN or CNM), encompassing 5.6M reproductive-age women; 6 states lost >10% of hospital obstetric units 2018–2022 (March of Dimes 2022). ~13,000 CNMs nationally attend ~10% of US births; ACOG projects net OB/GYN workforce deficit through 2030. Medicaid finances 43% of US births; 1 in 5 perinatal women experience mood/anxiety disorders — untreated burden estimated at $14.2B per birth cohort in healthcare utilization and lost productivity (Luca 2019).",
    citationIds: [
      "gbd2021",
      "acog_maternal_2022",
      "nih_reporter_2023",
      "rock_health_2024",
      "cdc_pmss_2023",
      "mmrc_causes_2022",
      "smm_racial_disparity_2024",
      "smm_trend_1993_2012",
      "aim_bundles_2024",
      "march_of_dimes_desert_2022",
      "luca_perinatal_mh_2019",
    ],
  },
  pcos: {
    name: "PCOS & Metabolic Reproductive",
    datasetSectors: ["Reproductive Health", "Reproductive"],
    dalyThousandsPerYear: 2_100,
    // US prevalence: ~6M (Yadav 2023); Rotterdam criteria gives 12.1% globally (PMID 41528735);
    // ~10M if broader criteria applied to full reproductive-age US cohort.
    prevalenceMillion: 6.0,
    annualDeathsThousands: 0.4,
    nihFundingMillionPerYear: 90,
    vcDeployedMillion: 420,
    neglectScore: 5,
    regulatoryNote: "No FDA-approved PCOS treatment — large regulatory moat",
    economicBurdenBillion: 15,
    payerCoveragePercent: 35,
    providerGapNote:
      "Fragmented care across endocrinology, OB/GYN, and PCP — no specialty owns PCOS. Cumulative US economic burden >$15B/yr (Yadav 2023, PMID 37534878): mental health alone $4.26B (anxiety $1.94B, depression $1.68B), PCOS-related diabetes $1.77B (Azziz 2005). No FDA-approved disease-modifying treatment; all prescribing is off-label.",
    citationIds: [
      "gbd2021",
      "nwhn_pcos",
      "yadav_pcos_2023",
      "azziz_pcos_2005",
      "nih_reporter_2023",
      "rock_health_2024",
      "nasri_pcos_global_2026",
    ],
  },
  endometriosis: {
    name: "Endometriosis & Pelvic Pain",
    datasetSectors: ["Pelvic Health", "Gynecological Surgery"],
    dalyThousandsPerYear: 3_800,
    prevalenceMillion: 6.5,
    annualDeathsThousands: 0.1,
    nihFundingMillionPerYear: 60,
    vcDeployedMillion: 310,
    neglectScore: 5,
    regulatoryNote:
      "FDA Priority Review eligible; diagnosis delay 1–5 years depending on pathway",
    payerCoveragePercent: 50,
    providerGapNote:
      "Requires MIS-trained gynecologist; surgical expertise concentrated in academic centers. Pre-diagnosis healthcare costs $21,489–$34,460 per patient over 60 months (Bonafede et al. 2020, PMID 31960340); 35.3% of patients wait 3–5 years for diagnosis, 12.5% of all their healthcare costs are endometriosis-related during that period. Depression SMD 0.71, anxiety SMD 0.60 vs. healthy controls (PMID 34077695).",
    citationIds: [
      "gbd2021",
      "ihme_endo_2023",
      "bonafede_endo_2020",
      "nih_reporter_2023",
      "rock_health_2024",
    ],
  },
  menopause: {
    name: "Menopause & Midlife Health",
    datasetSectors: ["Menopause", "General Wellness", "Wellness"],
    dalyThousandsPerYear: 1_950,
    prevalenceMillion: 55.0,
    annualDeathsThousands: 0.2,
    nihFundingMillionPerYear: 45,
    vcDeployedMillion: 280,
    neglectScore: 4,
    regulatoryNote: "FemTech menopause guidance (FDA 2024); HRT access bills",
    payerCoveragePercent: 45,
    providerGapNote:
      "Untreated vasomotor symptoms cost $2,116/patient/yr ($1,346 direct + $770 indirect productivity loss; 57% higher lost-work-day rate vs. controls; Liu et al. 2015, PMID 25714236). NAMS-certified menopause practitioners rare outside metro areas; most PCPs undertreated. HRT coverage uneven across commercial payers; wellness services largely excluded.",
    citationIds: [
      "gbd2021",
      "whpa_menopause",
      "liu_menopause_2015",
      "nih_reporter_2023",
      "rock_health_2024",
    ],
  },
  fertility: {
    name: "Fertility & IVF",
    datasetSectors: ["Fertility"],
    dalyThousandsPerYear: 900,
    prevalenceMillion: 7.4,
    annualDeathsThousands: 0.05,
    nihFundingMillionPerYear: 200,
    vcDeployedMillion: 2_100,
    neglectScore: 2,
    regulatoryNote: "Most-funded sector; competitive but maturing",
    payerCoveragePercent: 15,
    providerGapNote:
      "Predominantly cash-pay: only 19 states mandate fertility coverage. Of 91,324 patients whose first ART cycle failed, 26.4% discontinued within 12 months; state mandates reduced discontinuation risk by 26–46% (Toth et al. 2022, PMID 36368429). Male-factor coverage varies: 72.9% of clinics report 0–25% payer coverage for sperm extraction. RE clinics concentrated in urban centers; rural access minimal.",
    citationIds: [
      "gbd2021",
      "acog_2023",
      "toth_ivf_2022",
      "nih_reporter_2023",
      "pitchbook_2024",
    ],
  },
  breast_health: {
    name: "Breast Health & Oncology",
    datasetSectors: ["Breast Health", "Diagnostics", "Diagnostic"],
    dalyThousandsPerYear: 4_200,
    prevalenceMillion: 4.1,
    annualDeathsThousands: 43.5,
    nihFundingMillionPerYear: 800,
    vcDeployedMillion: 1_400,
    neglectScore: 2,
    regulatoryNote: "Strong NCI funding; FDA 510(k) pathways well-worn",
    payerCoveragePercent: 80,
    providerGapNote:
      "Well-integrated: mammography is a mandated preventive benefit (ACA). Dense-breast notification laws (38 states) drive supplemental imaging. Black women face age-adjusted breast cancer mortality HR 1.82 vs. White women (95% CI 1.51–2.20) for early-stage HR+ disease (Desai et al. 2023, PMID 36795405) — driven by social determinants and treatment access gaps, not tumor biology alone.",
    citationIds: [
      "gbd2021",
      "cdc_wonder_2022",
      "desai_breast_2023",
      "nih_reporter_2023",
      "pitchbook_2024",
    ],
  },
  contraception: {
    name: "Contraception & Family Planning",
    datasetSectors: ["Contraception"],
    dalyThousandsPerYear: 1_100,
    prevalenceMillion: 72.0,
    annualDeathsThousands: 0.3,
    nihFundingMillionPerYear: 120,
    vcDeployedMillion: 380,
    neglectScore: 4,
    regulatoryNote: "Post-Dobbs: state-level complexity; telehealth tailwinds",
    payerCoveragePercent: 85,
    providerGapNote:
      "ACA mandates no-cost contraception coverage at 85%+ of commercial plans, but post-Dobbs state restrictions and Title X clinic closures create geographic provider gaps for low-income women. Digital contraception (FDA-cleared apps) opens access pathways but reimbursement lags clinical validation.",
    citationIds: [
      "gbd2021",
      "acog_2023",
      "nih_reporter_2023",
      "rock_health_2024",
    ],
  },
  mental_health: {
    name: "Women's Mental Health",
    datasetSectors: ["Mental Health"],
    dalyThousandsPerYear: 5_600,
    prevalenceMillion: 28.0,
    annualDeathsThousands: 7.0,
    nihFundingMillionPerYear: 340,
    vcDeployedMillion: 920,
    neglectScore: 3,
    regulatoryNote:
      "MHPAEA parity enforcement; postpartum depression FDA approvals (brexanolone 2019, zuranolone 2023)",
    payerCoveragePercent: 75,
    providerGapNote:
      "55% of US counties have no psychiatrist; therapist shortage severe (SAMHSA 2022). MHPAEA parity enforcement gaps: behavioral health reimbursement 20–30% below medical/surgical parity. Sex-specific risk: women 1.5–2× more likely than men to develop depression or anxiety (GBD 2021); postpartum psychiatric conditions are leading cause of maternal mortality in the US.",
    citationIds: [
      "gbd2021",
      "cdc_wonder_2022",
      "nih_reporter_2023",
      "rock_health_2024",
    ],
  },
  precision_medicine: {
    name: "Precision Medicine & Genomics",
    datasetSectors: ["Precision Medicine", "Biotech", "Tech Bio"],
    dalyThousandsPerYear: 2_800,
    prevalenceMillion: 12.0,
    annualDeathsThousands: 18.0,
    nihFundingMillionPerYear: 550,
    vcDeployedMillion: 760,
    neglectScore: 3,
    regulatoryNote:
      "FDA CLIA LDT rule (2024); NIH All of Us mandate for 50% diverse cohort",
    payerCoveragePercent: 30,
    providerGapNote:
      "<7,000 ABGC-certified genetic counselors in US (2023) for a population with millions of hereditary risk variants. Women historically underrepresented in pharmacogenomic trials — sex-based dosing differences lead to 2× higher adverse drug reaction rates in women. LDT reimbursement uncertain post-FDA rule; payer prior-auth for germline testing high.",
    citationIds: [
      "gbd2021",
      "cdc_wonder_2022",
      "nih_reporter_2023",
      "pitchbook_2024",
    ],
  },
  sexual_wellness: {
    name: "Sexual Health & Wellness",
    datasetSectors: ["Sexual Wellness", "Consumer", "Wearables"],
    // Pooled FSD prevalence 47.81% in reproductive-aged women (PMID 41024089, 2025);
    // 40.9% in premenopausal women (PMID 27871953, 2016). ~43M is conservative US estimate.
    dalyThousandsPerYear: 680,
    prevalenceMillion: 43.0,
    annualDeathsThousands: 0.02,
    nihFundingMillionPerYear: 18,
    vcDeployedMillion: 190,
    neglectScore: 4,
    regulatoryNote:
      "D2C / non-regulated pathways dominant; FDA OTC reclassification creating new category",
    payerCoveragePercent: 15,
    providerGapNote:
      "FSD affects 47.81% of reproductive-aged women globally (Nasri et al. 2025, PMID 41024089), yet remains largely unaddressed clinically. Most CPT codes for female sexual dysfunction map to urology rather than gynecology; D2C / cash-pay dominates. Cultural stigma and provider training gaps mean only a fraction of affected women receive any treatment.",
    citationIds: [
      "gbd2021",
      "nasri_fsd_2025",
      "acog_2023",
      "nih_reporter_2023",
      "rock_health_2024",
    ],
  },
  cardiovascular_women: {
    name: "Women's Cardiovascular Disease",
    datasetSectors: ["Cardiovascular"],
    // GBD 2021 US female aggregate (IHD, stroke, hypertensive heart disease) — editorial sum
    dalyThousandsPerYear: 13_500,
    // ~44M US women 20+ with CVD (AHA 2024); prevalence figure rounded for model
    prevalenceMillion: 44.0,
    // ~300k US female CVD deaths/yr (CDC WONDER underlying cause, heart disease)
    annualDeathsThousands: 300,
    nihFundingMillionPerYear: 1_200,
    // WEF/BCG Figure 3: 11 WH funding events, ~$10M raised, 2020–2025
    vcDeployedMillion: 10,
    neglectScore: 5,
    regulatoryNote:
      "FDA sex-specific trial guidance; AHA Go Red for Women; CMS quality measures expanding sex-stratified reporting — yet WH-specific CVD capital remains <0.01% of total cardiovascular funding per WEF/BCG 2026.",
    payerCoveragePercent: 85,
    providerGapNote:
      "Leading cause of death in US women, yet often misclassified outside women's health. WEF/BCG: 11 funding transactions and ~$10M WH-specific capital raised (2020–2025) vs. $4.2B total cardiovascular flows — sharpest burden–capital misalignment in the WH Investment Index. Symptoms present differently in women; male-normative clinical pathways delay diagnosis. Cardiologists with women's heart programs concentrated at academic centers.",
    citationIds: [
      "gbd2021",
      "cdc_wonder_2022",
      "aha_cvd_women_2024",
      "nih_reporter_2023",
      "wef_bcg_2026",
    ],
  },
  metabolic_women: {
    name: "Women's Metabolic Disorders",
    datasetSectors: ["General Wellness", "Wearables", "Digital Health"],
    // GBD 2021 US female diabetes + obesity-related metabolic burden — editorial aggregate
    dalyThousandsPerYear: 4_800,
    // CDC: ~15M US women with diabetes; broader metabolic syndrome prevalence higher
    prevalenceMillion: 15.0,
    annualDeathsThousands: 42,
    nihFundingMillionPerYear: 680,
    // WEF/BCG Figure 3: 8 WH funding events, ~$4M raised, 2020–2025
    vcDeployedMillion: 4,
    neglectScore: 5,
    regulatoryNote:
      "GLP-1 wave expanding metabolic market, but women's-specific indications (PCOS, gestational diabetes transition, menopause metabolic shift) remain under-tagged in WH funding databases.",
    payerCoveragePercent: 55,
    providerGapNote:
      "WEF/BCG: 8 WH funding transactions and ~$4M capital raised (2020–2025) — less than 0.01% of total metabolic funding. Diabetes and metabolic syndrome affect women differently across life stages (PCOS, GDM, menopause); fragmented between endocrinology, OB/GYN, and primary care. CGM and metabolic FemTech often categorized as general wellness, not WH-specific.",
    citationIds: ["gbd2021", "cdc_wonder_2022", "nwhn_pcos", "nih_reporter_2023", "wef_bcg_2026"],
  },
};

// ─── Gap computation ────────────────────────────────────────────────────────

export interface GapMetrics {
  areaKey: string;
  area: BurdenArea;
  /** Composite burden score (0-100) */
  burdenScore: number;
  /** Capital efficiency ratio: $M VC per 1k DALYs */
  capitalPerKDaly: number;
  /**
   * Normalized gap score (1-100): higher = more underfunded relative to burden.
   * Floored at 1 so the most-funded sector never reads as "zero gap" — it means
   * "lowest gap in the current dataset", not "no gap exists."
   */
  gapScore: number;
  /** Percentile rank among all areas (0-100) */
  gapPercentile: number;
}

function computeBurdenScore(area: BurdenArea): number {
  // Weighted composite — DALYs matter most, then prevalence, then mortality
  const dalyNorm = Math.log10(area.dalyThousandsPerYear + 1);
  const prevNorm = Math.log10(area.prevalenceMillion * 100 + 1);
  const mortNorm = Math.log10(area.annualDeathsThousands * 10 + 1);
  return (dalyNorm * 0.5 + prevNorm * 0.3 + mortNorm * 0.2) * 25;
}

export function computeGapMetrics(): GapMetrics[] {
  const keys = Object.keys(BURDEN_AREAS);

  const raw = keys.map((key) => {
    const area = BURDEN_AREAS[key];
    const burdenScore = computeBurdenScore(area);
    const capitalPerKDaly = area.vcDeployedMillion /
      (area.dalyThousandsPerYear || 1);
    // Gap = high burden, low capital
    const rawGap = burdenScore / Math.log10(capitalPerKDaly * 100 + 2);
    return { key, area, burdenScore, capitalPerKDaly, rawGap };
  });

  const maxGap = Math.max(...raw.map((r) => r.rawGap));
  const minGap = Math.min(...raw.map((r) => r.rawGap));

  const sorted = [...raw].sort((a, b) => a.rawGap - b.rawGap);

  return raw.map((r) => {
    // Scale 1-100: floor at 1 so the lowest-ranked area doesn't display as "0"
    // (which implies no gap, rather than "lowest gap in this comparison set").
    const rawNorm = maxGap === minGap
      ? 50
      : ((r.rawGap - minGap) / (maxGap - minGap)) * 99 + 1;
    const gapScore = Math.round(Math.max(1, rawNorm));

    const rank = sorted.findIndex((s) => s.key === r.key);
    const gapPercentile = (rank / (sorted.length - 1)) * 100;
    return {
      areaKey: r.key,
      area: r.area,
      burdenScore: r.burdenScore,
      capitalPerKDaly: r.capitalPerKDaly,
      gapScore,
      gapPercentile,
    };
  });
}

// ─── Sector → gap lookup ─────────────────────────────────────────────────────

let _cachedMetrics: GapMetrics[] | null = null;

function getCachedMetrics(): GapMetrics[] {
  if (!_cachedMetrics) _cachedMetrics = computeGapMetrics();
  return _cachedMetrics;
}

/**
 * Map a raw dataset sector string to the closest BURDEN_AREAS key.
 * Returns null if no area covers that sector.
 */
export function sectorToAreaKey(sector: string): string | null {
  for (const [key, area] of Object.entries(BURDEN_AREAS)) {
    if (
      area.datasetSectors.some(
        (s) => s.toLowerCase() === sector.toLowerCase(),
      )
    ) {
      return key;
    }
  }
  return null;
}

/**
 * Get the gap score (1-100) for a dataset sector string.
 * Returns null if the sector is not mapped.
 */
export function gapScoreForSector(sector: string): number | null {
  const key = sectorToAreaKey(sector);
  if (!key) return null;
  const metrics = getCachedMetrics();
  return metrics.find((m) => m.areaKey === key)?.gapScore ?? null;
}

// ─── Valuation model ────────────────────────────────────────────────────────

export type FundingStage =
  | "Pre-Seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+";

export type ClinicalEvidence =
  | "none"
  | "pilot"
  | "retrospective"
  | "rct_phase2"
  | "pivotal_phase3"
  | "fda_cleared";

export interface ValuationInputs {
  areaKey: string;
  stage: FundingStage;
  totalFundingRaisedM: number;
  clinicalEvidence: ClinicalEvidence;
  /** Has reimbursement pathway (CPT code, payer coverage) */
  hasReimbursement: boolean;
  /** Addresses health disparities (racial/ethnic equity angle) */
  hasEquityAngle: boolean;
  /** Platform play (multiple indications) vs single-indication */
  isPlatform: boolean;
}

/**
 * Illustrative WHO cost-effectiveness analysis against US GDP/capita thresholds.
 *
 * Formula: Drummond et al. "Methods for Economic Evaluation of Health Care
 * Programmes" (4th ed., 2015) + WHO-CHOICE (Tan-Torres Edejer et al. 2003).
 * Threshold: Newall et al. (2014) GDP/capita benchmarks (1× = cost-effective,
 * 3× = upper bound). US GDP per capita 2023: $76,330 (World Bank).
 *
 * Key modelling choices:
 *  - Stage-adjusted penetration: earlier-stage companies are further from
 *    market; base penetration scales from 0.3% (Pre-Seed) to 12% (Series D+).
 *  - Payer coverage factor: without reimbursement, effective reach is limited
 *    to cash-pay patients. Derived from sector-level payer coverage data.
 *  - Program cost > R&D investment: implementation at scale requires commercial
 *    infrastructure, real-world evidence generation, and provider adoption;
 *    multiplier rises with stage (1.2× Pre-Seed → 3.2× Series D+).
 *  - 10-year horizon: standard for chronic-disease cost-effectiveness models.
 */
export interface WHOCEAEstimate {
  /** US GDP per capita 2023 (World Bank) used as WTP reference. */
  gdpPerCapita: number;
  /** Illustrative cost per DALY averted ($USD). */
  illustrativeCostPerDALY: number | null;
  /** WHO threshold classification. */
  category:
    | "Very cost-effective"
    | "Cost-effective"
    | "Not cost-effective"
    | "Insufficient data";
  /** Human-readable threshold context. */
  thresholdContext: string;
  /** DALYs averted over 10-year horizon under effective-penetration assumption. */
  dalysAvertedEstimate: number | null;
  /** Effective market penetration used (stage × payer factor). */
  effectivePenetration: number;
  /** Payer coverage factor applied (0–1.5). */
  payerCoverageFactor: number;
  /** Program cost used ($M) — investment × stage scale-up multiplier. */
  programCostM: number;
  /** Provider/payer access gap note for this burden area. */
  providerGapNote: string;
}

export interface ValuationOutput {
  lowM: number;
  midM: number;
  highM: number;
  /** The burden-capital gap multiplier applied (1.0 = neutral) */
  gapMultiplier: number;
  /** Qualitative signal: "Significant" | "Moderate" | "Limited" */
  gapSignal: "Significant" | "Moderate" | "Limited";
  /** Stage-based comparable median ($M) before gap adjustment */
  stageComparableM: number;
  /** Individual factor scores driving the estimate */
  factors: ValuationFactor[];
  methodology: string;
  /** Citation IDs relevant to this output */
  citationIds: string[];
  /** WHO cost-effectiveness estimate relative to US GDP/capita thresholds. */
  whocea: WHOCEAEstimate;
}

export interface ValuationFactor {
  name: string;
  score: number; // -2 to +2
  note: string;
}

// Stage-level comparable medians from Rock Health / PitchBook women's health 2019-2024
const STAGE_MEDIANS_M: Record<FundingStage, number> = {
  "Pre-Seed": 8,
  Seed: 18,
  "Series A": 65,
  "Series B": 200,
  "Series C": 580,
  "Series D+": 1_400,
};

const STAGE_RANGES: Record<FundingStage, [number, number]> = {
  "Pre-Seed": [3, 20],
  Seed: [8, 45],
  "Series A": [30, 150],
  "Series B": [80, 450],
  "Series C": [200, 1_200],
  "Series D+": [500, 4_000],
};

const EVIDENCE_SCORE: Record<ClinicalEvidence, number> = {
  none: -1,
  pilot: 0,
  retrospective: 0.5,
  rct_phase2: 1,
  pivotal_phase3: 1.5,
  fda_cleared: 2,
};

export function valuateInvestment(
  inputs: ValuationInputs,
  gapMetrics: GapMetrics[],
  /** Dataset-derived stage medians (total funding raised by stage). When
   * present, these replace the editorial STAGE_MEDIANS_M for the selected stage. */
  datasetStageMedians?: Partial<Record<FundingStage, number>>,
): ValuationOutput {
  const metrics = gapMetrics.find((m) => m.areaKey === inputs.areaKey);
  if (!metrics) throw new Error(`Unknown area key: ${inputs.areaKey}`);

  const datasetMedian = datasetStageMedians?.[inputs.stage];
  const stageComparableM = datasetMedian ?? STAGE_MEDIANS_M[inputs.stage];
  const isDatasetDerived = datasetMedian !== undefined;
  const [rangeLow, rangeHigh] = STAGE_RANGES[inputs.stage];

  // ── Gap multiplier ────────────────────────────────────────────────────────
  // gapScore 1-100 → multiplier 0.80–1.60
  const gapMultiplier = 0.8 + (metrics.gapScore / 100) * 0.8;

  const gapSignal: ValuationOutput["gapSignal"] = metrics.gapScore >= 65
    ? "Significant"
    : metrics.gapScore >= 35
    ? "Moderate"
    : "Limited";

  // ── Factor scoring ────────────────────────────────────────────────────────
  const factors: ValuationFactor[] = [
    {
      name: "Burden-Capital Gap",
      score: (metrics.gapScore / 100) * 4 - 2,
      note: `Gap score ${metrics.gapScore}/100 — $${
        metrics.capitalPerKDaly.toFixed(2)
      }M VC per 1k DALYs`,
    },
    {
      name: "Clinical Evidence",
      score: EVIDENCE_SCORE[inputs.clinicalEvidence],
      note: inputs.clinicalEvidence.replace(/_/g, " "),
    },
    {
      name: "Reimbursement Pathway",
      score: inputs.hasReimbursement ? 1 : -0.5,
      note: inputs.hasReimbursement
        ? "CPT/payer coverage in place"
        : "No reimbursement yet — key de-risking milestone",
    },
    {
      name: "Health Equity Angle",
      score: inputs.hasEquityAngle ? 0.5 : 0,
      note: inputs.hasEquityAngle
        ? "Addresses racial/ethnic disparities — strong grant + ESG signal"
        : "Single-population focus",
    },
    {
      name: "Platform Potential",
      score: inputs.isPlatform ? 1 : 0,
      note: inputs.isPlatform
        ? "Multi-indication platform → TAM expansion"
        : "Single-indication product",
    },
    {
      name: "Neglect Score (area)",
      score: (metrics.area.neglectScore - 3) * 0.5,
      note: `${metrics.area.neglectScore}/5 — ${
        metrics.area.neglectScore >= 4
          ? "highly underserved"
          : metrics.area.neglectScore === 3
          ? "moderately served"
          : "competitive sector"
      }`,
    },
    {
      // Payer coverage gap: sectors with low reimbursement face adoption barriers
      // that depress exit multiples unless the company has solved coverage.
      // If hasReimbursement = true, the company has de-risked this; score +1.
      // If sector coverage >70%, payer tailwind; 40–70% neutral; <40% headwind.
      name: "Payer Coverage",
      score: inputs.hasReimbursement
        ? 1.0
        : metrics.area.payerCoveragePercent > 70
        ? 0.0
        : metrics.area.payerCoveragePercent > 40
        ? -0.5
        : -1.0,
      note: inputs.hasReimbursement
        ? `Reimbursement pathway secured — payer gap de-risked (sector avg ${metrics.area.payerCoveragePercent}% covered)`
        : `No reimbursement yet; sector avg ${metrics.area.payerCoveragePercent}% payer coverage — ${
          metrics.area.payerCoveragePercent > 70
            ? "tailwind, but company-specific codes still needed"
            : metrics.area.payerCoveragePercent > 40
            ? "partial coverage; prior-auth risk"
            : "predominantly cash-pay — major adoption barrier"
        }`,
    },
    {
      // Provider access gap: fragmented care delivery or specialist dependency
      // constrains scalable adoption even when payer coverage exists.
      name: "Provider Access",
      score: metrics.area.payerCoveragePercent > 70
        ? 0.5 // Well-integrated into clinical workflows (e.g., breast, mental health)
        : metrics.area.payerCoveragePercent > 45
        ? 0.0 // Mixed integration (e.g., maternal, pelvic)
        : -0.5, // Fragmented care or specialist-dependent (e.g., fertility, PCOS, precision)
      note: metrics.area.providerGapNote,
    },
  ];

  // ── Aggregate adjustment ──────────────────────────────────────────────────
  const totalFactorScore = factors.reduce((s, f) => s + f.score, 0);
  const factorAdj = Math.max(-1, Math.min(1, totalFactorScore / 6)) * 0.4;

  const midM = stageComparableM * gapMultiplier * (1 + factorAdj);

  // Range based on stage spread; floor low end so it never rounds to 0
  const spread = rangeHigh / rangeLow;
  const lowM = Math.max(1, midM / Math.sqrt(spread) * 0.9);
  const highM = midM * Math.sqrt(spread) * 1.1;

  const citationIds = [
    ...new Set([
      ...metrics.area.citationIds,
      "rock_health_2024",
      "pitchbook_2024",
    ]),
  ];

  return {
    lowM: Math.round(lowM),
    midM: Math.round(midM),
    highM: Math.round(highM),
    gapMultiplier,
    gapSignal,
    stageComparableM,
    factors,
    citationIds,
    methodology:
      (isDatasetDerived
        ? "Stage comparable median (dataset-derived: median total funding raised by stage from verified companies)"
        : "Stage comparable median (Rock Health⁵ / PitchBook⁶ 2019-2024 editorial estimate)") +
      " × burden-capital gap multiplier × factor adjustments. " +
      "Disease burden from GBD 2021¹ and CDC WONDER 2022². " +
      "Heuristic only — not a financial model or investment advice.",
    whocea: computeWHOCEA(
      inputs.totalFundingRaisedM,
      inputs.stage,
      inputs.hasReimbursement,
      metrics.area,
    ),
  };
}

// ── WHO CEA constants ────────────────────────────────────────────────────────

const GDP_PER_CAPITA_US_2023 = 76_330; // World Bank 2023

/**
 * Stage-adjusted base market penetration.
 * Proxy for how much of the addressable DALY burden a company at this stage
 * will realistically reach over a 10-year horizon.
 * Earlier-stage companies are further from market; penetration scales with
 * commercial maturity. Conservative estimates — actual penetration is
 * condition- and intervention-specific.
 */
const STAGE_BASE_PENETRATION: Record<FundingStage, number> = {
  "Pre-Seed": 0.003, // 0.3% — concept stage, no market presence
  "Seed": 0.008, // 0.8% — early pilots / limited geography
  "Series A": 0.020, // 2.0% — early commercial launch
  "Series B": 0.045, // 4.5% — scaling commercial operations
  "Series C": 0.080, // 8.0% — established market presence
  "Series D+": 0.120, // 12% — market-leader territory
};

/**
 * Program cost multiplier: implementation at scale costs more than R&D
 * investment alone. Accounts for commercial infrastructure, provider education,
 * real-world evidence generation, and health-system integration.
 * Source: Drummond et al. "Methods for Economic Evaluation of Health Care
 * Programmes" (4th ed., OUP 2015), Ch. 3 on program vs. trial costs.
 */
const PROGRAM_COST_MULTIPLIER: Record<FundingStage, number> = {
  "Pre-Seed": 1.2,
  "Seed": 1.5,
  "Series A": 1.8,
  "Series B": 2.3,
  "Series C": 2.8,
  "Series D+": 3.2,
};

/**
 * Compute an illustrative WHO cost-effectiveness estimate.
 *
 * Cost per DALY averted = program cost / (annual DALYs × effective penetration × years).
 *
 * Three adjustments make this more defensible than a flat penetration assumption:
 *  1. Stage-adjusted base penetration — earlier stage → lower reach.
 *  2. Payer coverage factor — without reimbursement, effective reach is limited
 *     to cash-pay patients (often <20% of the addressable population).
 *  3. Program cost multiplier — implementation cost exceeds R&D investment,
 *     especially at later stages where commercial scale-up is required.
 *
 * All figures remain illustrative. Actual impact requires trial-level efficacy,
 * real-world adoption data, and counterfactual access estimates.
 */
export function computeWHOCEA(
  investmentM: number,
  stage: FundingStage,
  hasReimbursement: boolean,
  area: BurdenArea,
): WHOCEAEstimate {
  const insufficientData: WHOCEAEstimate = {
    gdpPerCapita: GDP_PER_CAPITA_US_2023,
    illustrativeCostPerDALY: null,
    category: "Insufficient data",
    thresholdContext: "Enter an investment amount to see a WHO CEA comparison.",
    dalysAvertedEstimate: null,
    effectivePenetration: 0,
    payerCoverageFactor: 0,
    programCostM: 0,
    providerGapNote: area.providerGapNote,
  };

  if (investmentM <= 0 || area.dalyThousandsPerYear <= 0) {
    return insufficientData;
  }

  // Payer coverage factor:
  //   With reimbursement: boost penetration up to 1.5× (payer covers cost,
  //   providers are reimbursed to offer it → broader adoption).
  //   Without reimbursement: penetration limited by cash-pay capacity;
  //   scales with sector payer coverage but capped at 0.6 to reflect
  //   the real-world barrier of out-of-pocket cost.
  const payerCoverageFactor = hasReimbursement
    ? Math.min(1.5, 1.0 + (area.payerCoveragePercent / 100) * 0.5)
    : Math.max(0.10, (area.payerCoveragePercent / 100) * 0.55);

  const stagePenetration = STAGE_BASE_PENETRATION[stage];
  const effectivePenetration = stagePenetration * payerCoverageFactor;

  // DALYs averted over 10-year horizon
  const YEARS = 10;
  const dalysAverted = area.dalyThousandsPerYear * 1_000 *
    effectivePenetration * YEARS;

  // Program cost: R&D investment × stage-specific scale-up multiplier
  const programCostM = investmentM * PROGRAM_COST_MULTIPLIER[stage];
  const costUSD = programCostM * 1_000_000;

  const costPerDALY = costUSD / dalysAverted;

  const category: WHOCEAEstimate["category"] =
    costPerDALY < GDP_PER_CAPITA_US_2023
      ? "Very cost-effective"
      : costPerDALY < GDP_PER_CAPITA_US_2023 * 3
      ? "Cost-effective"
      : "Not cost-effective";

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const thresholdContext = category === "Very cost-effective"
    ? `${fmt(costPerDALY)}/DALY averted — below 1× US GDP/capita (${
      fmt(GDP_PER_CAPITA_US_2023)
    }). WHO-CHOICE: Very cost-effective.`
    : category === "Cost-effective"
    ? `${fmt(costPerDALY)}/DALY averted — 1–3× US GDP/capita (${
      fmt(GDP_PER_CAPITA_US_2023)
    }–${fmt(GDP_PER_CAPITA_US_2023 * 3)}). WHO-CHOICE: Cost-effective.`
    : `${fmt(costPerDALY)}/DALY averted — above 3× US GDP/capita (${
      fmt(GDP_PER_CAPITA_US_2023 * 3)
    }). WHO-CHOICE: Not cost-effective at this threshold.`;

  return {
    gdpPerCapita: GDP_PER_CAPITA_US_2023,
    illustrativeCostPerDALY: Math.round(costPerDALY),
    category,
    thresholdContext,
    dalysAvertedEstimate: Math.round(dalysAverted),
    effectivePenetration,
    payerCoverageFactor,
    programCostM,
    providerGapNote: area.providerGapNote,
  };
}

/** Format dollar amounts for display */
export function formatValuation(m: number): string {
  if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}B`;
  return `$${Math.round(m)}M`;
}
