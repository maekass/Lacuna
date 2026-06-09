import { describe, expect, it } from 'vitest';
import { isGenomicsRelevantCompany } from '@/lib/data/genomicsFilters';
import type { VerifiedDataset } from '@/lib/data/datasetTypes';

const baseCompany: VerifiedDataset['companies'][number] = {
  id: 'c-test',
  name: 'Example Co',
  sector: 'Fertility',
  stage: 'Growth',
  founded: 2015,
  hq: 'Boston, MA',
  description: 'Fertility tracking app',
};

describe('isGenomicsRelevantCompany', () => {
  it('matches Diagnostics sector (success)', () => {
    expect(isGenomicsRelevantCompany({ ...baseCompany, sector: 'Diagnostics' })).toBe(true);
  });

  it('matches genomics keywords in description (success)', () => {
    expect(
      isGenomicsRelevantCompany({
        ...baseCompany,
        description: 'Comprehensive genomic profiling for breast cancer',
      }),
    ).toBe(true);
  });

  it('returns false for unrelated sectors (edge)', () => {
    expect(isGenomicsRelevantCompany(baseCompany)).toBe(false);
  });
});
