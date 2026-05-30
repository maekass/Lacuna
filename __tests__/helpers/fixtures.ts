import type { VerifiedDataset } from '@/lib/data/datasetTypes';
import type {
  AcquisitionRow,
  AcquirerRow,
  CompanyRow,
  ProvenanceRow,
} from '@/lib/data/mapVerifiedDataset';

export const minimalVerifiedDataset: VerifiedDataset = {
  provenance: {
    lastUpdated: '2026-01-15',
    purpose: 'Test dataset',
    disclaimer: 'Not for production',
    sources: ['unit test'],
    notes: ['fixture'],
  },
  companies: [
    {
      id: 'c1',
      name: 'Alpha Health',
      sector: 'Fertility',
      stage: 'Series B',
      founded: 2018,
      hq: 'Boston, MA',
      description: 'Test company',
      lastKnownValuation: 100,
      totalFunding: 40,
      sources: ['crunchbase'],
    },
    {
      id: 'c2',
      name: 'Beta Wearables',
      sector: 'Wearables',
      stage: 'Series A',
      founded: 2019,
      hq: 'Austin, TX',
      description: 'No financials disclosed',
    },
  ],
  acquirers: [
    {
      id: 'a1',
      name: 'Big Pharma Co',
      ticker: 'BIG',
      sector: 'Pharma',
      hq: 'NJ',
    },
  ],
  acquisitions: [
    {
      id: 'd1',
      targetId: 'c1',
      acquirerId: 'a1',
      targetName: 'Alpha Health',
      acquirerName: 'Big Pharma Co',
      announcedDate: '2024-06-01',
      closedDate: '2024-09-01',
      dealValue: 250,
      dealType: 'Acquisition',
      source: 'press release',
      strategicRationale: 'Expand fertility portfolio',
    },
  ],
};

export const sampleProvenanceRow: ProvenanceRow = {
  last_updated: '2026-01-15',
  purpose: 'Test dataset',
  disclaimer: 'Not for production',
  sources: ['unit test'],
  notes: ['fixture'],
};

export const sampleCompanyRow: CompanyRow = {
  id: 'c1',
  name: 'Alpha Health',
  sector: 'Fertility',
  stage: 'Series B',
  founded: 2018,
  hq: 'Boston, MA',
  description: 'Test company',
  last_known_valuation: '100',
  valuation_source: 'Series B',
  total_funding: 40,
  sources: ['crunchbase'],
};

export const sampleAcquirerRow: AcquirerRow = {
  id: 'a1',
  name: 'Big Pharma Co',
  ticker: 'BIG',
  sector: 'Pharma',
  hq: 'NJ',
};

export const sampleAcquisitionRow: AcquisitionRow = {
  id: 'd1',
  target_id: 'c1',
  acquirer_id: 'a1',
  target_name: 'Alpha Health',
  acquirer_name: 'Big Pharma Co',
  announced_date: new Date('2024-06-01'),
  closed_date: null,
  deal_value: 250,
  deal_value_note: null,
  deal_type: 'Acquisition',
  source: 'press release',
  strategic_rationale: 'Expand fertility portfolio',
};
