import { describe, expect, it } from 'vitest';
import { buildVerifiedDerivedData } from '@/lib/data/verifiedDataHelpers';
import { minimalVerifiedDataset } from '../../helpers/fixtures';

describe('buildVerifiedDerivedData', () => {
  it('builds views and helper accessors (success)', () => {
    const derived = buildVerifiedDerivedData(minimalVerifiedDataset);

    expect(derived.verifiedCompanies).toHaveLength(2);
    expect(derived.verifiedAcquisitions).toHaveLength(1);
    expect(derived.verifiedAcquirers).toHaveLength(1);
    expect(derived.dataProvenance.purpose).toBe('Test dataset');
  });

  it('getVerifiedNetworkNodes includes targets and acquirers (success)', () => {
    const { getVerifiedNetworkNodes } = buildVerifiedDerivedData(minimalVerifiedDataset);
    const nodes = getVerifiedNetworkNodes();

    expect(nodes.some((n) => n.id === 'c1' && n.type === 'target')).toBe(true);
    expect(nodes.some((n) => n.id === 'a1' && n.type === 'acquirer')).toBe(true);
  });

  it('getVerifiedNetworkLinks uses deal value or default 50 (edge)', () => {
    const dataset = structuredClone(minimalVerifiedDataset);
    dataset.acquisitions.push({
      ...dataset.acquisitions[0],
      id: 'd2',
      dealValue: undefined,
    });
    const { getVerifiedNetworkLinks } = buildVerifiedDerivedData(dataset);
    const links = getVerifiedNetworkLinks();

    expect(links.find((l) => l.value === 250)).toBeDefined();
    expect(links.find((l) => l.value === 50)).toBeDefined();
  });

  it('getVerifiedTotalDealValue sums disclosed values only (edge)', () => {
    const { getVerifiedTotalDealValue } = buildVerifiedDerivedData(minimalVerifiedDataset);
    expect(getVerifiedTotalDealValue()).toBe(250);
  });

  it('getVerifiedDealsByYear aggregates by announcement year (success)', () => {
    const { getVerifiedDealsByYear } = buildVerifiedDerivedData(minimalVerifiedDataset);
    expect(getVerifiedDealsByYear()).toEqual([{ year: 2024, count: 1 }]);
  });

  it('handles empty acquisitions for totals and year buckets (edge)', () => {
    const emptyDeals = structuredClone(minimalVerifiedDataset);
    emptyDeals.acquisitions = [];
    const derived = buildVerifiedDerivedData(emptyDeals);

    expect(derived.getVerifiedTotalDealValue()).toBe(0);
    expect(derived.getVerifiedDealsByYear()).toEqual([]);
    expect(derived.getVerifiedNetworkLinks()).toEqual([]);
  });
});
