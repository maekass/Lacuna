/**
 * RH Capital portfolio research layer (Funds I & II, managed by Foreground Capital).
 *
 * Source: https://rhcapital.vc/portfolio/ (curated July 2026). Funding and exit
 * figures are cited from press releases and trade press only — not invented.
 *
 * Overlaps Lacuna `dataset.verified.json` where `datasetCompanyId` is set.
 * Portfolia fund listings (c90+) may share names but are a separate investor overlay.
 */

import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

export interface RhCapitalExit {
  readonly acquirer: string;
  readonly announcedDate: string;
  /** Only when publicly disclosed */
  readonly dealValueM: number | null;
  readonly note: string;
}

/** One RH Capital portfolio company with cited public metrics. */
export interface RhCapitalPortfolioCompany {
  readonly id: string;
  /** Must match `companies.name` in dataset when `datasetCompanyId` is set */
  readonly name: string;
  readonly datasetCompanyId: string | null;
  readonly website: string;
  readonly tagline: string;
  readonly focusArea: string;
  /** USD millions; null when no lifetime total cited */
  readonly totalFundingM: number | null;
  readonly lastKnownValuationM: number | null;
  readonly valuationSource: string | null;
  readonly exit: RhCapitalExit | null;
  readonly primarySourceUrl: string;
  readonly sources: readonly string[];
}

export const RH_CAPITAL_MANAGER_NOTE =
  "RH Capital Funds I and II are managed by Foreground Capital (foreground.vc).";

export const RH_CAPITAL_PORTFOLIO: readonly RhCapitalPortfolioCompany[] = [
  {
    id: "rh-aoa-dx",
    name: "AOA Dx",
    datasetCompanyId: "c136",
    website: "https://aoadx.com",
    tagline:
      "Pioneering glycolipid biomarkers for early ovarian cancer detection and diagnosis.",
    focusArea: "Oncology diagnostics",
    totalFundingM: 24,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://endpoints.news/exclusive-liquid-biopsy-startup-closes-17m-series-b-to-fund-ovarian-cancer-diagnostic-test/",
    sources: [
      "Endpoints News — $17M Series B; $24M total raised (Oct 2023)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-bloomlife",
    name: "Bloomlife",
    datasetCompanyId: "c137",
    website: "https://bloomlife.com",
    tagline:
      "Revolutionizing maternal health through data-driven solutions and remote prenatal care.",
    focusArea: "Maternal digital health",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/womens-digital-health-startup-bloomlife-raises-4m-in-seed-funding-300313912.html",
    sources: [
      "PRNewswire — $4M seed; $6M total at time of announcement (Aug 2016)",
      "Femtech Insider — $12.2M Series A (Sep 2024); no newer lifetime total cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-cadence-otc",
    name: "Cadence OTC",
    datasetCompanyId: "c138",
    website: "https://cadenceotc.com",
    tagline:
      "Breaking down reproductive health barriers with safe, affordable OTC birth control pills.",
    focusArea: "Contraception",
    totalFundingM: 35,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20240328289214/en/Cadence-OTC-Announces-Community-Investment-Campaign-to-Support-the-Movement-for-Accessible-Birth-Control-in-Post-Roe-America",
    sources: [
      "Business Wire — more than $35M raised (Mar 2024)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-cayaba-care",
    name: "Cayaba Care",
    datasetCompanyId: "c139",
    website: "https://cayabacare.com",
    tagline:
      "Home-based maternity care for underserved communities via community and technology.",
    focusArea: "Maternal health equity",
    totalFundingM: 15,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/cayaba-care-secures-12m-in-series-a-funding-to-expand-maternity-health-access-and-services-to-underserved-populations-301550740.html",
    sources: [
      "PRNewswire — $12M Series A; $15M total to date (May 2022)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-cirqle",
    name: "Cirqle",
    datasetCompanyId: "c140",
    website: "https://cirqle.bio",
    tagline:
      "Next-gen contraception via human-centered design and cervical mucus barrier properties.",
    focusArea: "Contraception",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20190827005148/en/Cirqle-Biomedical-Secures-Pre-Seed-Funding-for-Next-Generation-Contraceptive",
    sources: [
      "Business Wire — $1.8M pre-seed (Aug 2019); lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-cofertility",
    name: "Cofertility",
    datasetCompanyId: "c141",
    website: "https://cofertility.com",
    tagline: "Family-building options that put you first.",
    focusArea: "Fertility",
    totalFundingM: 16,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20250416509158/en/Cofertility-Closes-Series-A-Funding-Led-by-Next-Ventures-and-Offline-Ventures-to-Revolutionize-Fertility-and-Family-Building",
    sources: [
      "Business Wire — $16M total capital raised (Apr 2025)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-contraline",
    name: "Contraline",
    datasetCompanyId: "c78",
    website: "https://contraline.com",
    tagline:
      "Inventing male contraception with a long-lasting, reversible implant for men.",
    focusArea: "Male contraception",
    totalFundingM: 127,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://medcitynews.com/2026/06/contraline-birth-control-contraceptive-funding/",
    sources: [
      "MedCity News — fundraising total $127M after $92.5M Series B (Jun 2026)",
      "Business Wire — $92.5M Series B (Jun 2026)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-eli-health",
    name: "Eli Health",
    datasetCompanyId: "c142",
    website: "https://eli.health",
    tagline:
      "At-home saliva hormone monitoring with real-time hormonal insights.",
    focusArea: "Hormone diagnostics",
    totalFundingM: 20,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://eli.health/blogs/resources/we-re-building-the-interface-to-the-human-body",
    sources: [
      "Eli Health — total capital raised $20M (Jun 2025)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-evvy",
    name: "Evvy",
    datasetCompanyId: "c76",
    website: "https://evvy.com",
    tagline:
      "At-home vaginal microbiome tests to close the gender health gap.",
    focusArea: "Diagnostics",
    totalFundingM: 19,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://medcitynews.com/2023/09/funding-vaginal-healthcare-microbiome-testing/",
    sources: [
      "MedCity News — $19M total raised (Sep 2023)",
      "Business Wire — $14M Series A (Sep 2023)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-gesynta",
    name: "Gesynta Pharma",
    datasetCompanyId: "c86",
    website: "https://gesynta.se",
    tagline:
      "Non-hormonal endometriosis treatment to reduce pain and lesion burden.",
    focusArea: "Endometriosis therapeutics",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://news.cision.com/gesynta-pharma/r/gesynta-pharma-announces-second-closing-of-series-b-now-totaling-sek-347m---healthcap-and-hadean-gro,c4282039",
    sources: [
      "Cision — Series B totaling SEK 347M (Jul 2025); USD lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-mae",
    name: "Mae",
    datasetCompanyId: "c143",
    website: "https://meetmae.com",
    tagline:
      "Culturally competent digital-first care for Black women through pregnancy and postpartum.",
    focusArea: "Maternal health equity",
    totalFundingM: 1.3,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20210908005314/en/Maternal-Health-Platform-Mae-Launches-with-%241.3M",
    sources: [
      "Business Wire — $1.3M pre-seed at launch (Sep 2021); later seed amount undisclosed",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-millie",
    name: "Millie",
    datasetCompanyId: "c81",
    website: "https://millieclinic.com",
    tagline:
      "Holistic, tech-enabled, midwife-led pregnancy care.",
    focusArea: "Maternal care delivery",
    totalFundingM: 19,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://techcrunch.com/2025/02/26/maternity-clinic-millie-nabs-12m-series-a-from-an-all-star-all-female-class-of-vcs/",
    sources: [
      "TechCrunch — nearly $19M total to date (Feb 2025)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-neuspera",
    name: "Neuspera",
    datasetCompanyId: "c119",
    website: "https://neuspera.com",
    tagline: "Next-gen treatment for urinary incontinence.",
    focusArea: "Pelvic health device",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/neuspera-medical-raises-23-million-in-series-d-financing-302196849.html",
    sources: [
      "PRNewswire — $23M Series D (Jul 2024); lifetime total not cited",
      "PRNewswire — $65M Series C (Jul 2021)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-novocuff",
    name: "Novocuff",
    datasetCompanyId: "c144",
    website: "https://novocuff.com",
    tagline:
      "Medical device to improve pregnancy outcomes and reduce preterm birth risk.",
    focusArea: "Preterm birth device",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20240717930069/en/Novocuff-Raises-26-Million-in-Oversubscribed-Series-A-Funding-to-Advance-Technology-Aimed-at-Reducing-Preterm-Births",
    sources: [
      "Business Wire — $26M Series A + $2M seed (Jul 2024); lifetime total not stated",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-nurx",
    name: "Nurx",
    datasetCompanyId: "c12",
    website: "https://nurx.com",
    tagline:
      "Telehealth and online pharmacy for reproductive and sexual health (Thirty Madison brand).",
    focusArea: "Digital pharmacy",
    totalFundingM: 110,
    lastKnownValuationM: 322.5,
    valuationSource:
      "PitchBook valuation cited by Axios (Feb 2022); CEO cited $110M total raised",
    exit: {
      acquirer: "Thirty Madison (Ro parent)",
      announcedDate: "2022-02-09",
      dealValueM: null,
      note:
        "Stock merger; financial terms not disclosed. Ro had acquired Nurx in Dec 2021 (~$300M estimated).",
    },
    primarySourceUrl: "https://www.axios.com/2022/02/09/thirty-madison-nurx-merger",
    sources: [
      "Axios — Thirty Madison / Nurx merger (Feb 2022)",
      "TechCrunch — Ro acquisition coverage (Dec 2021)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-ocon-med",
    name: "Ocon Med",
    datasetCompanyId: "c145",
    website: "https://oconmed.com",
    tagline:
      "Healthier, safer uterine drug-delivery solutions for women's quality of life.",
    focusArea: "Drug delivery",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/ocon-therapeutics-secures-10m-in-funding-to-revolutionize-womens-health-with-advanced-drug-delivery-solutions-302180059.html",
    sources: [
      "PRNewswire — $10M round (Jun 2024); lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-ovia",
    name: "Ovia Health",
    datasetCompanyId: "c64",
    website: "https://oviahealth.com",
    tagline:
      "Continuous support across fertility, maternity, and parenting.",
    focusArea: "Digital maternal health",
    totalFundingM: 23.4,
    lastKnownValuationM: null,
    valuationSource: "Acquisition terms not disclosed (LabCorp, Aug 2021)",
    exit: {
      acquirer: "LabCorp",
      announcedDate: "2021-08-12",
      dealValueM: null,
      note:
        "Terms not disclosed. LabCorp cited ~$20M annual revenue at acquisition.",
    },
    primarySourceUrl:
      "https://ir.labcorp.com/news-releases/news-release-details/labcorp-extends-leadership-womens-health-acquisition-ovia-health",
    sources: [
      "LabCorp IR — acquisition press release (Aug 2021)",
      "Business Wire — LabCorp / Ovia announcement",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-planera",
    name: "Planera",
    datasetCompanyId: "c146",
    website: "https://planera.care",
    tagline:
      "Certified flushable, 100% biodegradable sanitary pads eliminating period waste.",
    focusArea: "Period care",
    totalFundingM: 9.5,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/rh-capital-announces-three-new-investments-to-improve-womens-health-301560592.html",
    sources: [
      "PRNewswire — RH Capital $9.5M seed round announcement (Jun 2022)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-raydiant",
    name: "Raydiant Oximetry",
    datasetCompanyId: "c147",
    website: "https://raydiantoximetry.com",
    tagline:
      "First non-invasive fetal oxygenation monitor for safer childbirth.",
    focusArea: "Maternal-fetal monitoring",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.globenewswire.com/news-release/2024/06/04/2893104/0/en/Raydiant-Oximetry-Oversubscribes-Series-A-7-5-Million-Extension-Round.html",
    sources: [
      "GlobeNewswire — $7.5M Series A extension (Jun 2024); lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-seven-starling",
    name: "Seven Starling",
    datasetCompanyId: "c148",
    website: "https://sevenstarling.com",
    tagline:
      "Insurance-covered perinatal mental health therapy and community support.",
    focusArea: "Perinatal mental health",
    totalFundingM: 22,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://medcitynews.com/2025/09/seven-starling-mental-maternal-health/",
    sources: [
      "MedCity News — $22M total raised (Sep 2025)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-testmate",
    name: "Testmate Health",
    datasetCompanyId: "c87",
    website: "https://testmatehealth.com",
    tagline:
      "At-home STI self-testing kits with results in minutes.",
    focusArea: "STI diagnostics",
    totalFundingM: 6,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/testmate-health-raises-6m-in-seed-funding-for-first-low-cost-at-home-sti-diagnostic-test-302139747.html",
    sources: [
      "PRNewswire — $6M seed (May 2024)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-twenty-eight",
    name: "Twenty Eight Health",
    datasetCompanyId: "c149",
    website: "https://twentyeighthealth.com",
    tagline:
      "Telehealth and pharmacy expanding access to sexual and reproductive care.",
    focusArea: "Reproductive telehealth",
    totalFundingM: 25,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.prnewswire.com/news-releases/twentyeight-health-secures-10m-in-series-a-funding--launches-new-payer-partnerships-amidst-surge-of-user-interest-lowering-barriers-to-sexual--reproductive-care-in-43-states-302342130.html",
    sources: [
      "PRNewswire — $25M total funding (Jan 2025)",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-vitra",
    name: "Vitra Labs",
    datasetCompanyId: "c150",
    website: "https://vitra.bio",
    tagline: "Accessible tools for the next generation of IVF.",
    focusArea: "Fertility technology",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.sec.gov/Archives/edgar/data/1961551/000196155124000001/0001961551-24-000001-index.htm",
    sources: [
      "SEC Form D — Nov 2024 offering; lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
  {
    id: "rh-yourchoice",
    name: "YourChoice Therapeutics",
    datasetCompanyId: "c134",
    website: "https://yourchoicetx.com",
    tagline:
      "Novel non-hormonal contraceptives for men and women.",
    focusArea: "Contraception therapeutics",
    totalFundingM: null,
    lastKnownValuationM: null,
    valuationSource: null,
    exit: null,
    primarySourceUrl:
      "https://www.businesswire.com/news/home/20240924791648/en/YourChoice-Therapeutics-Begins-Second-Human-Study-for-Hormone-Free-Male-Birth-Control-Pill",
    sources: [
      "Business Wire — $15M Series A (2022); lifetime total not cited",
      "RH Capital portfolio — rhcapital.vc/portfolio/",
    ],
  },
] as const;

/** Company names for Foreground / RH Capital portfolio overlay (matches dataset names). */
export const RH_CAPITAL_PORTFOLIO_NAMES: readonly string[] =
  RH_CAPITAL_PORTFOLIO.map((c) => c.name);

export interface RhCapitalPortfolioSummary {
  readonly companyCount: number;
  readonly withCitedFunding: number;
  readonly citedFundingTotalM: number;
  readonly exitCount: number;
  readonly exitsWithDisclosedValue: number;
}

/** Aggregate cited funding and exit counts from RH Capital research layer. */
export function computeRhCapitalPortfolioSummary(): RhCapitalPortfolioSummary {
  let citedFundingTotalM = 0;
  let withCitedFunding = 0;
  let exitCount = 0;
  let exitsWithDisclosedValue = 0;

  for (const company of RH_CAPITAL_PORTFOLIO) {
    if (company.totalFundingM != null) {
      withCitedFunding += 1;
      citedFundingTotalM += company.totalFundingM;
    }
    if (company.exit != null) {
      exitCount += 1;
      if (company.exit.dealValueM != null) {
        exitsWithDisclosedValue += 1;
      }
    }
  }

  return {
    companyCount: RH_CAPITAL_PORTFOLIO.length,
    withCitedFunding,
    citedFundingTotalM,
    exitCount,
    exitsWithDisclosedValue,
  };
}

export const RH_CAPITAL_SOURCES = [
  {
    label: "RH Capital portfolio",
    reference: "RH Capital — Portfolio page (Funds I & II, Foreground Capital).",
    url: "https://rhcapital.vc/portfolio/",
  },
  {
    label: "Foreground Capital",
    reference: RH_CAPITAL_MANAGER_NOTE,
    url: "https://foreground.vc/",
  },
] as const;

export const RH_CAPITAL_MODEL: ModelProvenance = {
  id: "rh-capital-portfolio",
  label: "RH Capital portfolio metrics",
  version: "2026-07-02",
  description:
    "Cited funding and exit notes for RH Capital portfolio companies. Not merged into Lacuna verified deals except where a disclosed acquisition already exists (Ovia, Nurx/Ro).",
  sources: RH_CAPITAL_SOURCES.map((s) => s.reference),
};
