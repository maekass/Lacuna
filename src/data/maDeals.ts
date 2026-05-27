export interface Company {
  id: string;
  name: string;
  sector: 'Fertility' | 'Mental Health' | 'Cardiovascular' | 'Oncology' | 'Menopause' | 'Pelvic Health' | 'General Wellness' | 'Wearables' | 'Sexual Wellness';
  stage: 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Series D' | 'Series F' | 'Late Stage' | 'Pre-IPO' | 'Public';
  founded: number;
  valuation?: number; // in millions
  employees: number;
  hq: string;
  description: string;
}

export interface Acquisition {
  id: string;
  targetId: string;
  acquirerId: string;
  announcedDate: string;
  closedDate?: string;
  dealValue?: number; // in millions
  dealType: 'Acquisition' | 'Merger' | 'Strategic Investment' | 'Asset Purchase';
  strategicRationale: string;
  multiples?: {
    revenue?: number;
    ebitda?: number;
  };
}

export const companies: Company[] = [
  {
    id: 'c1',
    name: 'Modern Fertility',
    sector: 'Fertility',
    stage: 'Late Stage',
    founded: 2017,
    valuation: 225,
    employees: 150,
    hq: 'San Francisco, CA',
    description: 'At-home fertility testing and telehealth'
  },
  {
    id: 'c2',
    name: 'Ro',
    sector: 'General Wellness',
    stage: 'Late Stage',
    founded: 2017,
    valuation: 7000,
    employees: 900,
    hq: 'New York, NY',
    description: 'Men\'s and women\'s health telemedicine platform'
  },
  {
    id: 'c3',
    name: 'Elvie',
    sector: 'Pelvic Health',
    stage: 'Series B',
    founded: 2013,
    valuation: 150,
    employees: 120,
    hq: 'London, UK',
    description: 'Connected pelvic floor trainer and breast pump'
  },
  {
    id: 'c4',
    name: 'Maven Clinic',
    sector: 'Fertility',
    stage: 'Series D',
    founded: 2014,
    valuation: 1300,
    employees: 400,
    hq: 'New York, NY',
    description: 'Virtual clinic for women\'s and family health'
  },
  {
    id: 'c5',
    name: 'Tia',
    sector: 'General Wellness',
    stage: 'Series A',
    founded: 2017,
    valuation: 100,
    employees: 80,
    hq: 'New York, NY',
    description: 'Women\'s health clinic combining physical and virtual care'
  },
  {
    id: 'c6',
    name: 'Carrot Fertility',
    sector: 'Fertility',
    stage: 'Series C',
    founded: 2016,
    valuation: 400,
    employees: 200,
    hq: 'San Francisco, CA',
    description: 'Global fertility benefits platform for employers'
  },
  {
    id: 'c7',
    name: 'Kindbody',
    sector: 'Fertility',
    stage: 'Series D',
    founded: 2018,
    valuation: 600,
    employees: 350,
    hq: 'New York, NY',
    description: 'Fertility and family-building benefit solution'
  },
  {
    id: 'c8',
    name: 'Parsley Health',
    sector: 'General Wellness',
    stage: 'Series C',
    founded: 2016,
    valuation: 180,
    employees: 200,
    hq: 'New York, NY',
    description: 'Functional medicine for women\'s health'
  },
  {
    id: 'c9',
    name: 'Everlywell',
    sector: 'General Wellness',
    stage: 'Late Stage',
    founded: 2015,
    valuation: 325,
    employees: 300,
    hq: 'Austin, TX',
    description: 'At-home health testing including women\'s health panels'
  },
  {
    id: 'c10',
    name: 'Ava',
    sector: 'Fertility',
    stage: 'Series A',
    founded: 2014,
    valuation: 45,
    employees: 40,
    hq: 'Zurich, Switzerland',
    description: 'Fertility tracking wearable bracelet'
  },
  {
    id: 'c11',
    name: 'Proov',
    sector: 'Fertility',
    stage: 'Seed',
    founded: 2016,
    valuation: 15,
    employees: 25,
    hq: 'Boulder, CO',
    description: 'At-home progesterone test strips'
  },
  {
    id: 'c12',
    name: 'Nurx',
    sector: 'General Wellness',
    stage: 'Late Stage',
    founded: 2015,
    valuation: 300,
    employees: 200,
    hq: 'San Francisco, CA',
    description: 'Telehealth for birth control and women\'s health'
  },
  {
    id: 'c13',
    name: 'Lemonaid Health',
    sector: 'Mental Health',
    stage: 'Late Stage',
    founded: 2013,
    valuation: 500,
    employees: 150,
    hq: 'San Francisco, CA',
    description: 'Telehealth platform with strong women\'s health focus'
  },
  {
    id: 'c14',
    name: 'Talkspace',
    sector: 'Mental Health',
    stage: 'Pre-IPO',
    founded: 2012,
    valuation: 1400,
    employees: 600,
    hq: 'New York, NY',
    description: 'Online therapy platform, 70% women users'
  },
  {
    id: 'c15',
    name: 'Calm',
    sector: 'Mental Health',
    stage: 'Late Stage',
    founded: 2012,
    valuation: 2000,
    employees: 400,
    hq: 'San Francisco, CA',
    description: 'Meditation and sleep app, 70%+ female user base'
  },
  {
    id: 'c16',
    name: 'Oura',
    sector: 'Wearables',
    stage: 'Series C',
    founded: 2013,
    valuation: 2500,
    employees: 300,
    hq: 'Oulu, Finland',
    description: 'Smart ring with women\'s health tracking features'
  },
  {
    id: 'c17',
    name: 'Whoop',
    sector: 'Wearables',
    stage: 'Series F',
    founded: 2012,
    valuation: 3600,
    employees: 500,
    hq: 'Boston, MA',
    description: 'Fitness wearable with menstrual cycle integration'
  },
  {
    id: 'c18',
    name: 'Natural Cycles',
    sector: 'Fertility',
    stage: 'Series B',
    founded: 2013,
    valuation: 150,
    employees: 100,
    hq: 'Stockholm, Sweden',
    description: 'FDA-cleared birth control app'
  },
  {
    id: 'c19',
    name: 'Clue',
    sector: 'Fertility',
    stage: 'Series B',
    founded: 2012,
    valuation: 120,
    employees: 80,
    hq: 'Berlin, Germany',
    description: 'Period and fertility tracking app'
  },
  {
    id: 'c20',
    name: 'Bloomi',
    sector: 'Sexual Wellness',
    stage: 'Seed',
    founded: 2018,
    valuation: 12,
    employees: 15,
    hq: 'Los Angeles, CA',
    description: 'Clean intimate care products'
  }
];

export const acquirers: Company[] = [
  {
    id: 'a1',
    name: 'Procter & Gamble',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1837,
    employees: 100000,
    hq: 'Cincinnati, OH',
    description: 'Consumer goods conglomerate expanding femtech portfolio'
  },
  {
    id: 'a2',
    name: 'Johnson & Johnson',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1886,
    employees: 140000,
    hq: 'New Brunswick, NJ',
    description: 'Healthcare giant with women\'s health division'
  },
  {
    id: 'a3',
    name: 'Roche',
    sector: 'Oncology',
    stage: 'Public',
    founded: 1896,
    employees: 100000,
    hq: 'Basel, Switzerland',
    description: 'Pharmaceutical and diagnostics leader'
  },
  {
    id: 'a4',
    name: 'Abbott',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1888,
    employees: 110000,
    hq: 'Abbott Park, IL',
    description: 'Medical devices and diagnostics'
  },
  {
    id: 'a5',
    name: 'Hologic',
    sector: 'Oncology',
    stage: 'Public',
    founded: 1985,
    employees: 6700,
    hq: 'Marlborough, MA',
    description: 'Women\'s health diagnostics specialist'
  },
  {
    id: 'a6',
    name: 'Teladoc',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 2002,
    employees: 4400,
    hq: 'Purchase, NY',
    description: 'Virtual care leader'
  },
  {
    id: 'a7',
    name: 'CVS Health',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1963,
    employees: 300000,
    hq: 'Woonsocket, RI',
    description: 'Healthcare services and retail'
  },
  {
    id: 'a8',
    name: 'Walgreens',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1901,
    employees: 220000,
    hq: 'Deerfield, IL',
    description: 'Pharmacy and healthcare retail'
  },
  {
    id: 'a9',
    name: 'Apple',
    sector: 'Wearables',
    stage: 'Public',
    founded: 1976,
    employees: 161000,
    hq: 'Cupertino, CA',
    description: 'Technology company with health tracking focus'
  },
  {
    id: 'a10',
    name: 'Google/Alphabet',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1998,
    employees: 156000,
    hq: 'Mountain View, CA',
    description: 'Technology conglomerate, Fitbit acquirer'
  },
  {
    id: 'a11',
    name: 'Amazon',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1994,
    employees: 1540000,
    hq: 'Seattle, WA',
    description: 'Expanding healthcare services including One Medical'
  },
  {
    id: 'a12',
    name: 'Microsoft',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1975,
    employees: 181000,
    hq: 'Redmond, WA',
    description: 'Cloud and AI services for healthcare'
  },
  {
    id: 'a13',
    name: 'UnitedHealth Group',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 1977,
    employees: 400000,
    hq: 'Minnetonka, MN',
    description: 'Healthcare services and Optum digital health'
  },
  {
    id: 'a14',
    name: 'Evolent Health',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 2011,
    employees: 3600,
    hq: 'Arlington, VA',
    description: 'Healthcare services and technology'
  },
  {
    id: 'a15',
    name: 'Livongo',
    sector: 'General Wellness',
    stage: 'Public',
    founded: 2008,
    employees: 700,
    hq: 'Mountain View, CA',
    description: 'Chronic condition management (acquired by Teladoc)'
  }
];

export const acquisitions: Acquisition[] = [
  {
    id: 'deal1',
    targetId: 'c2',
    acquirerId: 'a6',
    announcedDate: '2020-07-01',
    closedDate: '2020-10-30',
    dealValue: 13900,
    dealType: 'Acquisition',
    strategicRationale: 'Combined chronic care management with virtual primary care',
    multiples: { revenue: 18.2 }
  },
  {
    id: 'deal2',
    targetId: 'c1',
    acquirerId: 'c2',
    announcedDate: '2021-05-19',
    closedDate: '2021-07-15',
    dealValue: 225,
    dealType: 'Acquisition',
    strategicRationale: 'Added at-home fertility testing to telehealth platform',
    multiples: { revenue: 15.0 }
  },
  {
    id: 'deal3',
    targetId: 'c12',
    acquirerId: 'c2',
    announcedDate: '2021-12-15',
    closedDate: '2022-02-28',
    dealValue: 300,
    dealType: 'Acquisition',
    strategicRationale: 'Expanded women\'s health services with birth control delivery',
    multiples: { revenue: 12.5 }
  },
  {
    id: 'deal4',
    targetId: 'c13',
    acquirerId: 'a11',
    announcedDate: '2021-10-14',
    closedDate: '2021-12-20',
    dealValue: 400,
    dealType: 'Acquisition',
    strategicRationale: 'Added prescription telehealth to healthcare services',
    multiples: { revenue: 11.0 }
  },
  {
    id: 'deal5',
    targetId: 'c4',
    acquirerId: 'a6',
    announcedDate: '2022-08-10',
    dealType: 'Strategic Investment',
    strategicRationale: 'Partner for maternity and fertility care integration'
  },
  {
    id: 'deal6',
    targetId: 'c7',
    acquirerId: 'a6',
    announcedDate: '2023-03-15',
    dealType: 'Strategic Investment',
    strategicRationale: 'Fertility benefits platform integration partnership'
  },
  {
    id: 'deal7',
    targetId: 'c6',
    acquirerId: 'a13',
    announcedDate: '2021-06-22',
    dealType: 'Strategic Investment',
    strategicRationale: 'Employer fertility benefits network expansion'
  },
  {
    id: 'deal8',
    targetId: 'c8',
    acquirerId: 'a6',
    announcedDate: '2021-09-08',
    dealType: 'Strategic Investment',
    strategicRationale: 'Functional medicine and holistic care partnership'
  }
];

// Derived statistics
export const getSectorDistribution = () => {
  const sectors = companies.reduce((acc, c) => {
    acc[c.sector] = (acc[c.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(sectors).map(([name, count]) => ({ name, count }));
};

export const getStageDistribution = () => {
  const stages = companies.reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(stages).map(([name, count]) => ({ name, count }));
};

export const getTotalDealValue = () => {
  return acquisitions.reduce((sum, deal) => sum + (deal.dealValue || 0), 0);
};

export const getDealsByYear = () => {
  const yearMap = acquisitions.reduce((acc, deal) => {
    const year = new Date(deal.announcedDate).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  return Object.entries(yearMap).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => a.year - b.year);
};

export const getNetworkNodes = () => {
  return [
    ...companies.map(c => ({
      id: c.id,
      name: c.name,
      type: 'target' as const,
      sector: c.sector,
      stage: c.stage,
      valuation: c.valuation || 0
    })),
    ...acquirers.map(a => ({
      id: a.id,
      name: a.name,
      type: 'acquirer' as const,
      sector: a.sector,
      stage: 'Acquirer' as const,
      valuation: 10000
    }))
  ];
};

export const getNetworkLinks = () => {
  return acquisitions.map(deal => ({
    source: deal.targetId,
    target: deal.acquirerId,
    value: deal.dealValue || 50,
    dealType: deal.dealType,
    date: deal.announcedDate
  }));
};
