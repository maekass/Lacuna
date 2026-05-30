import { describe, expect, it } from 'vitest';
import { minimalVerifiedDataset } from '../../helpers/fixtures';
import { validateVerifiedDataset } from '@/lib/data/validateVerifiedDataset';
import {
  computeDisclosureStats,
  computeEffectiveNBadges,
  computeSectorDealCounts,
} from '@/lib/data/datasetCoverageStats';

describe('validateVerifiedDataset', () => {
  it('passes for minimal verified JSON slice (success)', () => {
    const report = validateVerifiedDataset(minimalVerifiedDataset);
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('errors on broken target FK (error)', () => {
    const broken = structuredClone(minimalVerifiedDataset);
    broken.acquisitions[0].targetId = 'missing-id';
    const report = validateVerifiedDataset(broken);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === 'deal.targetFk')).toBe(true);
  });

  it('warns on single-source companies (warning)', () => {
    const singleSource = structuredClone(minimalVerifiedDataset);
    singleSource.companies = singleSource.companies.map((c) => ({
      ...c,
      sources: c.sources?.slice(0, 1) ?? [],
    }));
    const report = validateVerifiedDataset(singleSource);
    expect(report.warnings.some((w) => w.code === 'company.singleSource')).toBe(true);
  });

  it('warns on corporate acquirer id (warning)', () => {
    const report = validateVerifiedDataset(minimalVerifiedDataset);
    expect(report.warnings.some((w) => w.code === 'deal.corporateAcquirer')).toBe(true);
  });
});

describe('datasetCoverageStats', () => {
  it('computes disclosure and sector breakdowns (success)', () => {
    const stats = computeDisclosureStats(minimalVerifiedDataset);
    expect(stats.dealsTotal).toBe(1);
    expect(stats.dealsDisclosed).toBe(1);

    const sectors = computeSectorDealCounts(minimalVerifiedDataset);
    expect(sectors.some((s) => s.sector === 'Fertility' && s.deals === 1)).toBe(true);

    const badges = computeEffectiveNBadges(minimalVerifiedDataset);
    expect(badges.network.tier).toBe('insufficient');
    expect(badges.fairness.tier).toBe('insufficient');
  });
});
