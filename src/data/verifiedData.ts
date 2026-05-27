// ============================================================================
// VERIFIED DATA ONLY
// ============================================================================
// This file intentionally exposes a *typed interface* + derived helpers.
// The underlying dataset lives in JSON so it can scale without code edits.
// ============================================================================

import verifiedDataset from './dataset.verified.json';

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
  readonly sources: readonly string[]; // Verified sources for all data
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
  readonly strategicRationale: string; // From press releases
  readonly source: string; // Primary citation (human-readable)
}

export const verifiedCompanies: VerifiedCompany[] = verifiedDataset.companies as VerifiedCompany[];

export const verifiedAcquisitions: VerifiedAcquisition[] =
  verifiedDataset.acquisitions as VerifiedAcquisition[];

// ============================================================================
// ACQUIRERS (Public companies - well documented)
// ============================================================================

export const verifiedAcquirers = verifiedDataset.acquirers as Array<{
  id: string;
  name: string;
  ticker?: string;
  sector: string;
  hq: string;
}>;

// ============================================================================
// DATA PROVENANCE SUMMARY
// ============================================================================

export const dataProvenance = verifiedDataset.provenance;

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
