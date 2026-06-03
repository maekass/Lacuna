import { describe, expect, it } from 'vitest';
import { computeCapitalClusters } from '@/lib/data/capitalClustering';
import type { VerifiedCompanyView } from '@/lib/data/verifiedDataHelpers';

const clusterable: VerifiedCompanyView[] = [
  {
    id: 'c1',
    name: 'Small Co',
    sector: 'Fertility',
    stage: 'Seed',
    founded: 2020,
    hq: 'NY',
    description: 'x',
    lastKnownValuation: 10,
    totalFunding: 5,
    sources: [],
  },
  {
    id: 'c2',
    name: 'Mid Co',
    sector: 'Wearables',
    stage: 'Series B',
    founded: 2015,
    hq: 'CA',
    description: 'y',
    lastKnownValuation: 200,
    totalFunding: 80,
    sources: [],
  },
  {
    id: 'c3',
    name: 'Large Co',
    sector: 'Mental Health',
    stage: 'Series D',
    founded: 2010,
    hq: 'MA',
    description: 'z',
    lastKnownValuation: 2000,
    totalFunding: 500,
    sources: [],
  },
];

describe('computeCapitalClusters', () => {
  it('returns three clusters for clusterable companies (success)', () => {
    const { clusters, unclusteredCount } = computeCapitalClusters(clusterable);
    expect(clusters).toHaveLength(3);
    expect(unclusteredCount).toBe(0);
    expect(clusters.reduce((sum, c) => sum + c.companies.length, 0)).toBe(3);
  });

  it('excludes companies missing valuation or funding (edge)', () => {
    const mixed: VerifiedCompanyView[] = [
      ...clusterable,
      {
        id: 'c4',
        name: 'Undisclosed',
        sector: 'Fertility',
        stage: 'Series A',
        founded: 2021,
        hq: 'TX',
        description: 'no numbers',
        sources: [],
      },
    ];
    const { unclusteredCount } = computeCapitalClusters(mixed);
    expect(unclusteredCount).toBe(1);
  });

  it('handles empty input (edge)', () => {
    const { clusters, unclusteredCount } = computeCapitalClusters([]);
    expect(clusters).toHaveLength(3);
    expect(unclusteredCount).toBe(0);
    clusters.forEach((cluster) => expect(cluster.companies).toHaveLength(0));
  });
});
