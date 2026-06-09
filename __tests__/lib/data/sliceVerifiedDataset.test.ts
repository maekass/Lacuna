import { describe, expect, it } from 'vitest';
import { minimalVerifiedDataset } from '../../helpers/fixtures';
import { sliceVerifiedDataset } from '@/lib/data/sliceVerifiedDataset';

describe('sliceVerifiedDataset', () => {
  it('paginates companies without loading extra resources (success)', () => {
    const result = sliceVerifiedDataset(minimalVerifiedDataset, {
      resource: 'companies',
      limit: 1,
      offset: 0,
    });

    expect(result.companies).toHaveLength(1);
    expect(result.acquisitions).toHaveLength(0);
    expect(result.meta.total.companies).toBe(2);
  });

  it('filters genomics-relevant companies (success)', () => {
    const dataset = {
      ...minimalVerifiedDataset,
      companies: [
        ...minimalVerifiedDataset.companies,
        {
          id: 'c-dx',
          name: 'GenomeDx',
          sector: 'Diagnostics',
          stage: 'Growth',
          founded: 2010,
          hq: 'San Diego, CA',
          description: 'Hereditary cancer screening',
        },
      ],
    };

    const result = sliceVerifiedDataset(dataset, {
      resource: 'companies',
      limit: 50,
      offset: 0,
      genomics: true,
    });

    expect(result.companies.every((c) => c.sector === 'Diagnostics' || /genomic|genome/i.test(c.description))).toBe(
      true,
    );
    expect(result.meta.genomics).toBe(true);
  });
});
