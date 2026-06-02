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
    disparityLabel: '3–4× higher maternal mortality vs white women (CDC)',
    dataTier: 'cited_epidemiology',
    source: 'CDC Pregnancy Mortality Surveillance System (2022)',
    sourceYear: 2022,
    relatedSectors: ['Fertility', 'General Wellness', 'Maternal Health'],
    epidemiologyCondition: 'Maternal Health Complications',
  },
  {
    id: 'uterine-fibroids',
    title: 'Uterine fibroids',
    summary:
      'Fibroids drive pain, anemia, and hysterectomy; prevalence is higher among Black women.',
    disparityLabel: '~80% of Black women affected by age 50 (NIH/NICHD estimate)',
    dataTier: 'cited_epidemiology',
    source: "NIH/NICHD Fibroid Research (2020), Journal of Women's Health",
    sourceYear: 2020,
    relatedSectors: ['Pelvic Health', 'Gynecological Surgery'],
    epidemiologyCondition: 'Uterine Fibroids',
  },
  {
    id: 'fertility',
    title: 'Fertility challenges',
    summary:
      'Reproductive-age women facing infertility; overlaps with FemTech, IVF devices, reproductive testing, and telehealth in our sample.',
    disparityLabel: '~12% of reproductive-age women (15–44) in the US (CDC NSFG)',
    dataTier: 'cited_epidemiology',
    source: 'CDC National Survey of Family Growth (2022)',
    sourceYear: 2022,
    relatedSectors: ['Fertility', 'Reproductive Health', 'Diagnostics', 'Contraception'],
    epidemiologyCondition: 'Fertility Challenges',
  },
  {
    id: 'mental-health',
    title: 'Postpartum depression',
    summary:
      'Postpartum mood disorders; mental-health apps in the verified sample are proxies, not clinical outcomes.',
    disparityLabel: '~10–15% of postpartum women (JAMA Psychiatry meta-analysis)',
    dataTier: 'cited_epidemiology',
    source: 'JAMA Psychiatry Meta-Analysis (2020)',
    sourceYear: 2020,
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
    disparityLabel: 'Black women: 40% higher breast cancer mortality (ACS 2023)',
    dataTier: 'cited_epidemiology',
    source: 'American Cancer Society Cancer Statistics 2023; SEER Program',
    sourceYear: 2023,
    relatedSectors: ['Breast Health', 'Precision Medicine'],
    epidemiologyCondition: 'Breast Cancer',
  },
] as const;
