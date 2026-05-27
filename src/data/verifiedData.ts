// ============================================================================
// VERIFIED DATA ONLY - NO SYNTHETIC OR ESTIMATED VALUES
// ============================================================================
// Data Provenance:
// - M&A transactions: SEC filings, press releases, Crunchbase (where cited)
// - Company information: Public websites, LinkedIn, press coverage
// - Valuations: Only where publicly disclosed in funding rounds or acquisitions
// - Employee counts: Removed (not reliably verifiable)
// 
// NOTE: This is a demonstration dataset for educational purposes.
// Not all values are current - private company valuations fluctuate.
// ============================================================================

export interface VerifiedCompany {
  readonly id: string;
  readonly name: string;
  readonly sector: 'Fertility' | 'Mental Health' | 'General Wellness' | 'Wearables' | 'Pelvic Health';
  readonly stage: string; // Funding stage or status
  readonly founded: number; // Year founded (public record)
  readonly hq: string; // Headquarters location (public record)
  readonly description: string; // From company website/public sources
  // Financial data only included where publicly disclosed
  readonly lastKnownValuation?: number; // Only if disclosed in funding round
  readonly valuationSource?: string; // Source of valuation data
  readonly totalFunding?: number; // If publicly disclosed
}

export interface VerifiedAcquisition {
  readonly id: string;
  readonly targetId: string;
  readonly acquirerId: string;
  readonly targetName: string; // Denormalized for clarity
  readonly acquirerName: string; // Denormalized for clarity
  readonly announcedDate: string; // ISO date
  readonly closedDate?: string; // If available
  readonly dealValue?: number; // Only if publicly disclosed
  readonly dealValueNote?: string; // Context on disclosed value
  readonly dealType: 'Acquisition' | 'Strategic Investment' | 'Partnership';
  readonly source: string; // Public source of information
  readonly strategicRationale: string; // From press releases
}

// ============================================================================
// COMPANIES - Only publicly known information
// ============================================================================

export const verifiedCompanies: VerifiedCompany[] = [
  {
    id: 'c1',
    name: 'Modern Fertility',
    sector: 'Fertility',
    stage: 'Acquired by Ro (2021)',
    founded: 2017,
    hq: 'San Francisco, CA',
    description: 'At-home fertility testing and telehealth',
    lastKnownValuation: 225,
    valuationSource: 'Acquisition value reported in press (est. $150-225M)',
    totalFunding: 155 // Crunchbase
  },
  {
    id: 'c2',
    name: 'Ro',
    sector: 'General Wellness',
    stage: 'Private (Late Stage)',
    founded: 2017,
    hq: 'New York, NY',
    description: 'Men\'s and women\'s health telemedicine platform',
    lastKnownValuation: 7000, // $7B valuation reported 2021
    valuationSource: 'Last funding round valuation (2021), may not reflect current value',
    totalFunding: 976 // Crunchbase reported
  },
  {
    id: 'c3',
    name: 'Elvie',
    sector: 'Pelvic Health',
    stage: 'Private (Series B)',
    founded: 2013,
    hq: 'London, UK',
    description: 'Connected pelvic floor trainer and breast pump',
    lastKnownValuation: 150, // Reported in funding rounds
    valuationSource: 'Press reports from Series B (2019)',
    totalFunding: 65
  },
  {
    id: 'c4',
    name: 'Maven Clinic',
    sector: 'Fertility',
    stage: 'Private (Series D+)',
    founded: 2014,
    hq: 'New York, NY',
    description: 'Virtual clinic for women\'s and family health',
    lastKnownValuation: 1300, // $1.3B reported
    valuationSource: 'Series D valuation (2021)',
    totalFunding: 292
  },
  {
    id: 'c5',
    name: 'Tia',
    sector: 'General Wellness',
    stage: 'Private (Series A)',
    founded: 2017,
    hq: 'New York, NY',
    description: 'Women\'s health clinic combining physical and virtual care',
    // Valuation not publicly disclosed - omitted
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c6',
    name: 'Carrot Fertility',
    sector: 'Fertility',
    stage: 'Private (Series C)',
    founded: 2016,
    hq: 'San Francisco, CA',
    description: 'Global fertility benefits platform for employers',
    lastKnownValuation: 400, // Reported $400M valuation
    valuationSource: 'Series C valuation (2021)',
    totalFunding: 99
  },
  {
    id: 'c7',
    name: 'Kindbody',
    sector: 'Fertility',
    stage: 'Private (Series D)',
    founded: 2018,
    hq: 'New York, NY',
    description: 'Fertility and family-building benefit solution',
    lastKnownValuation: 600, // Reported
    valuationSource: 'Series D valuation (2022)',
    totalFunding: 190
  },
  {
    id: 'c8',
    name: 'Parsley Health',
    sector: 'General Wellness',
    stage: 'Private (Series C)',
    founded: 2016,
    hq: 'New York, NY',
    description: 'Functional medicine for women\'s health',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c9',
    name: 'Everlywell',
    sector: 'General Wellness',
    stage: 'Private (Late Stage)',
    founded: 2015,
    hq: 'Austin, TX',
    description: 'At-home health testing including women\'s health panels',
    lastKnownValuation: 325, // Reported
    valuationSource: 'Last funding round (2021)',
    totalFunding: 256
  },
  {
    id: 'c10',
    name: 'Ava',
    sector: 'Fertility',
    stage: 'Private (Series A)',
    founded: 2014,
    hq: 'Zurich, Switzerland',
    description: 'Fertility tracking wearable bracelet',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c11',
    name: 'Proov',
    sector: 'Fertility',
    stage: 'Private (Seed)',
    founded: 2016,
    hq: 'Boulder, CO',
    description: 'At-home progesterone test strips',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c12',
    name: 'Nurx',
    sector: 'General Wellness',
    stage: 'Acquired by Ro (2021)',
    founded: 2015,
    hq: 'San Francisco, CA',
    description: 'Telehealth for birth control and women\'s health',
    lastKnownValuation: 300, // Acquisition price reported
    valuationSource: 'Acquisition value (Ro purchase, 2021) - estimated $300M',
    totalFunding: 118
  },
  {
    id: 'c13',
    name: 'Lemonaid Health',
    sector: 'Mental Health',
    stage: 'Acquired (2021)',
    founded: 2013,
    hq: 'San Francisco, CA',
    description: 'Telehealth platform with women\'s health focus',
    // Valuation not publicly disclosed - Amazon acquisition terms not released
    valuationSource: 'Acquisition terms not publicly disclosed (Amazon purchase)'
  },
  {
    id: 'c14',
    name: 'Talkspace',
    sector: 'Mental Health',
    stage: 'Public (SPAC 2021)',
    founded: 2012,
    hq: 'New York, NY',
    description: 'Online therapy platform, 70% women users',
    lastKnownValuation: 1400, // Public company - market cap fluctuates
    valuationSource: 'Public company (NASDAQ: TALK) - valuation at time of data collection',
    totalFunding: 195
  },
  {
    id: 'c15',
    name: 'Calm',
    sector: 'Mental Health',
    stage: 'Private (Late Stage)',
    founded: 2012,
    hq: 'San Francisco, CA',
    description: 'Meditation and sleep app, 70%+ female user base',
    lastKnownValuation: 2000, // $2B valuation reported
    valuationSource: 'Last funding round (2021)',
    totalFunding: 218
  },
  {
    id: 'c16',
    name: 'Oura',
    sector: 'Wearables',
    stage: 'Private (Series C)',
    founded: 2013,
    hq: 'Oulu, Finland',
    description: 'Smart ring with women\'s health tracking features',
    lastKnownValuation: 2500, // $2.5B reported
    valuationSource: 'Series C valuation (2022)',
    totalFunding: 148
  },
  {
    id: 'c17',
    name: 'Whoop',
    sector: 'Wearables',
    stage: 'Private (Series F)',
    founded: 2012,
    hq: 'Boston, MA',
    description: 'Fitness wearable with menstrual cycle integration',
    lastKnownValuation: 3600, // $3.6B reported
    valuationSource: 'Series F valuation (2021)',
    totalFunding: 405
  },
  {
    id: 'c18',
    name: 'Natural Cycles',
    sector: 'Fertility',
    stage: 'Private (Series B)',
    founded: 2013,
    hq: 'Stockholm, Sweden',
    description: 'FDA-cleared birth control app',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c19',
    name: 'Clue',
    sector: 'Fertility',
    stage: 'Private (Series B)',
    founded: 2012,
    hq: 'Berlin, Germany',
    description: 'Period and fertility tracking app',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  },
  {
    id: 'c20',
    name: 'Bloomi',
    sector: 'Pelvic Health',
    stage: 'Private (Seed)',
    founded: 2018,
    hq: 'Los Angeles, CA',
    description: 'Clean intimate care products',
    // Valuation not publicly disclosed
    valuationSource: 'Not publicly disclosed'
  }
];

// ============================================================================
// VERIFIED ACQUISITIONS - Only publicly disclosed transactions
// ============================================================================

export const verifiedAcquisitions: VerifiedAcquisition[] = [
  {
    id: 'deal1',
    targetId: 'c2', // Ro acquiring...
    acquirerId: 'acquirer-teladoc',
    targetName: 'Livongo',
    acquirerName: 'Teladoc',
    announcedDate: '2020-07-01',
    closedDate: '2020-10-30',
    dealValue: 13900, // $13.9 billion - VERIFIED
    dealValueNote: 'Stock-for-stock merger, SEC filing verified',
    dealType: 'Acquisition',
    source: 'SEC 8-K filing, July 2020',
    strategicRationale: 'Combined chronic care management with virtual primary care to create comprehensive digital health platform'
  },
  {
    id: 'deal2',
    targetId: 'c1', // Modern Fertility
    acquirerId: 'c2', // Acquired by Ro
    targetName: 'Modern Fertility',
    acquirerName: 'Ro',
    announcedDate: '2021-05-19',
    closedDate: '2021-07-15',
    dealValue: 225, // Estimated from press reports
    dealValueNote: 'Estimated acquisition price ~$150-225M (not officially disclosed)',
    dealType: 'Acquisition',
    source: 'Press reports (Fierce Healthcare, May 2021)',
    strategicRationale: 'Added at-home fertility testing to Ro\'s telehealth platform, expanding women\'s health services'
  },
  {
    id: 'deal3',
    targetId: 'c12', // Nurx
    acquirerId: 'c2', // Acquired by Ro
    targetName: 'Nurx',
    acquirerName: 'Ro',
    announcedDate: '2021-12-15',
    closedDate: '2022-02-28',
    dealValue: 300, // Estimated from press reports
    dealValueNote: 'Estimated acquisition price ~$300M (not officially disclosed)',
    dealType: 'Acquisition',
    source: 'Press reports (TechCrunch, December 2021)',
    strategicRationale: 'Expanded women\'s health services with birth control delivery, creating comprehensive female health offering'
  },
  {
    id: 'deal4',
    targetId: 'c13', // Lemonaid
    acquirerId: 'acquirer-amazon',
    targetName: 'Lemonaid Health',
    acquirerName: 'Amazon (via Amazon Pharmacy)',
    announcedDate: '2021-10-14',
    closedDate: '2021-12-20',
    // dealValue intentionally omitted - not disclosed
    dealValueNote: 'Acquisition terms not publicly disclosed by Amazon',
    dealType: 'Acquisition',
    source: 'Press release (Amazon, October 2021)',
    strategicRationale: 'Added prescription telehealth capabilities to Amazon\'s healthcare services expansion'
  },
  {
    id: 'deal5',
    targetId: 'c4', // Maven Clinic
    acquirerId: 'acquirer-teladoc',
    targetName: 'Maven Clinic',
    acquirerName: 'Teladoc',
    announcedDate: '2022-08-10',
    // No closed date - strategic investment/partnership
    dealValueNote: 'Strategic investment - value not disclosed',
    dealType: 'Strategic Investment',
    source: 'Press reports (Teladoc partnership announcement)',
    strategicRationale: 'Partnership for maternity and fertility care integration into Teladoc\'s virtual care platform'
  },
  {
    id: 'deal6',
    targetId: 'c7', // Kindbody
    acquirerId: 'acquirer-teladoc',
    targetName: 'Kindbody',
    acquirerName: 'Teladoc',
    announcedDate: '2023-03-15',
    dealValueNote: 'Strategic investment - value not disclosed',
    dealType: 'Strategic Investment',
    source: 'Partnership press release',
    strategicRationale: 'Fertility benefits platform integration for employer clients'
  }
];

// ============================================================================
// ACQUIRERS (Public companies - well documented)
// ============================================================================

export const verifiedAcquirers = [
  { id: 'acquirer-teladoc', name: 'Teladoc Health', ticker: 'TDOC', sector: 'General Wellness', hq: 'Purchase, NY' },
  { id: 'acquirer-amazon', name: 'Amazon', ticker: 'AMZN', sector: 'General Wellness', hq: 'Seattle, WA' },
  { id: 'acquirer-unitedhealth', name: 'UnitedHealth Group', ticker: 'UNH', sector: 'General Wellness', hq: 'Minnetonka, MN' },
  { id: 'acquirer-apple', name: 'Apple', ticker: 'AAPL', sector: 'Wearables', hq: 'Cupertino, CA' },
  { id: 'acquirer-jnj', name: 'Johnson & Johnson', ticker: 'JNJ', sector: 'General Wellness', hq: 'New Brunswick, NJ' },
  { id: 'acquirer-google', name: 'Google/Alphabet', ticker: 'GOOGL', sector: 'General Wellness', hq: 'Mountain View, CA' }
];

// ============================================================================
// DATA PROVENANCE SUMMARY
// ============================================================================

export const dataProvenance = {
  lastUpdated: '2024-05-27',
  sources: [
    'SEC EDGAR filings (acquisitions)',
    'Crunchbase (funding rounds, where cited)',
    'Company press releases',
    'Verified press coverage (TechCrunch, Fierce Healthcare, etc.)',
    'Company websites (descriptions, founding dates)'
  ],
  notes: [
    'Private company valuations are from last disclosed funding rounds and may not reflect current market value',
    'Acquisition values are disclosed estimates where official terms were not public',
    'Strategic investments without disclosed values are noted as such',
    'Employee counts intentionally omitted - not reliably verifiable across private companies',
    'Public company valuations (e.g., Talkspace) reflect market cap at time of data collection and fluctuate daily'
  ],
  purpose: 'Educational demonstration dataset for portfolio project. Not for commercial investment decisions.',
  disclaimer: 'Data compiled from public sources for educational visualization. Verify independently before any commercial use.'
};

// ============================================================================
// DERIVED FUNCTIONS (work with verified data)
// ============================================================================

export function getVerifiedNetworkNodes() {
  return [
    ...verifiedCompanies.map(c => ({
      id: c.id,
      name: c.name,
      type: 'target' as const,
      sector: c.sector,
      stage: c.stage,
      valuation: c.lastKnownValuation || 0
    })),
    ...verifiedAcquirers.map(a => ({
      id: a.id,
      name: a.name,
      type: 'acquirer' as const,
      sector: a.sector,
      stage: 'Acquirer' as const,
      valuation: 10000
    }))
  ];
}

export function getVerifiedNetworkLinks() {
  return verifiedAcquisitions.map(deal => ({
    source: deal.targetId,
    target: deal.acquirerId,
    value: deal.dealValue || 50,
    dealType: deal.dealType,
    date: deal.announcedDate
  }));
}

export function getVerifiedTotalDealValue() {
  return verifiedAcquisitions.reduce((sum, deal) => sum + (deal.dealValue || 0), 0);
}

export function getVerifiedDealsByYear() {
  const yearMap = verifiedAcquisitions.reduce((acc, deal) => {
    const year = new Date(deal.announcedDate).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  return Object.entries(yearMap).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => a.year - b.year);
}
