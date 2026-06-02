/**
 * Static health-equity focus areas for contextual framing.
 * Epidemiology rows reuse citations from EPIDEMIOLOGY_DATABASE where available.
 * Portfolio overlap is computed at runtime from the verified company list — not stored here.
 */

export type HealthEquityDataTier = 'cited_epidemiology' | 'illustrative_static';

export interface HealthEquityFocusArea {
  id: string;
  title: string;
  summary: string;
  disparityLabel: string;
  dataTier: HealthEquityDataTier;
  source: string;
  sourceYear?: number;
  relatedSectors: readonly string[];
  /** Matches `condition` in EPIDEMIOLOGY_DATABASE when cited_epidemiology */
  epidemiologyCondition?: string;
}

export const HEALTH_EQUITY_FOCUS_AREAS: readonly HealthEquityFocusArea[] = [
  {
    id: 'maternal-health',
    title: 'Maternal health complications',
    summary:
      'Severe maternal morbidity and mortality disproportionately affect Black women in the US.',
    disparityLabel: 'Black women: 44.8 vs 14.2/100K live births — 3.2× disparity (CDC NCHS 2024)',
    dataTier: 'cited_epidemiology',
    source: 'CDC NCHS Maternal Mortality Rates in the US, 2024 (Mar 2026)',
    sourceYear: 2026,
    relatedSectors: ['Fertility', 'General Wellness', 'Maternal Health'],
    epidemiologyCondition: 'Maternal Health Complications',
  },
  {
    id: 'uterine-fibroids',
    title: 'Uterine fibroids',
    summary:
      'Fibroids drive pain, anemia, and hysterectomy; prevalence is higher among Black women.',
    disparityLabel: '20–80% of women by age 50; disproportionately affects Black women (NIH/NICHD 2024)',
    dataTier: 'cited_epidemiology',
    source: 'NIH/NICHD Uterine Fibroids Fact Sheet (Jul 2024); DiscoverWHR NIH overview (2024)',
    sourceYear: 2024,
    relatedSectors: ['Pelvic Health', 'Gynecological Surgery'],
    epidemiologyCondition: 'Uterine Fibroids',
  },
  {
    id: 'fertility',
    title: 'Fertility challenges',
    summary:
      'Reproductive-age women facing infertility; overlaps with FemTech, IVF devices, reproductive testing, and telehealth in our sample.',
    disparityLabel: '13.4% of women ages 15–49 have impaired fecundity — 9.7M (NCHS 2024)',
    dataTier: 'cited_epidemiology',
    source: 'NCHS National Health Statistics Report No. 202 (Apr 2024); NSFG 2015-2019',
    sourceYear: 2024,
    relatedSectors: ['Fertility', 'Reproductive Health', 'Diagnostics', 'Contraception'],
    epidemiologyCondition: 'Fertility Challenges',
  },
  {
    id: 'mental-health',
    title: 'Postpartum depression',
    summary:
      'Postpartum mood disorders; mental-health apps in the verified sample are proxies, not clinical outcomes.',
    disparityLabel: '~1 in 8 postpartum women report depressive symptoms (Childstats 2024)',
    dataTier: 'cited_epidemiology',
    source: 'Childstats.gov America\'s Children Special Issue (2024); PLOS One NHANES study (Apr 2025)',
    sourceYear: 2025,
    relatedSectors: ['Mental Health'],
    epidemiologyCondition: 'Postpartum Depression',
  },
  {
    id: 'wearables',
    title: 'Cardiovascular monitoring (wearables proxy)',
    summary:
      'Wearables may support early detection; CVD mortality disparities for Black women are documented in public health literature.',
    disparityLabel: 'Higher CVD mortality vs white women — use cited reviews before investing claims',
    dataTier: 'illustrative_static',
    source: 'Illustrative framing only — not a live CDC feed; see OAIS methodology docs',
    relatedSectors: ['Wearables'],
  },
  {
    id: 'breast-cancer',
    title: 'Breast cancer diagnostics & precision medicine',
    summary:
      'Breast cancer is the most common cancer among women globally; genomic profiling and precision diagnostics are transforming treatment decisions.',
    disparityLabel: 'Black women: 38% higher breast cancer mortality (ACS 2025)',
    dataTier: 'cited_epidemiology',
    source: 'ACS Breast Cancer Facts & Figures 2024-2025; ACS Cancer Statistics for Black People (Feb 2025)',
    sourceYear: 2025,
    relatedSectors: ['Breast Health', 'Precision Medicine'],
    epidemiologyCondition: 'Breast Cancer',
  },
] as const;
