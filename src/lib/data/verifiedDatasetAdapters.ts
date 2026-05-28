/**
 * Adapters from verified public dataset (dataset.verified.json) for UI modules.
 * No mock companies or fabricated deal records.
 */

import {
  verifiedAcquisitions,
  verifiedAcquirers,
  verifiedCompanies,
} from '@/data/verifiedData';
import type { Company, Acquisition } from '@/lib/types';
import type {
  Acquirer,
  AcquiredCompany,
  AcquisitionRecord,
} from '@/lib/competitive/acquirerAnalysis';

function mapStage(stage: string): Company['stage'] {
  const s = stage.toLowerCase();
  if (s.includes('series a')) return 'Series A';
  if (s.includes('series b')) return 'Series B';
  if (s.includes('series c')) return 'Series C';
  if (s.includes('series d')) return 'Series D';
  if (s.includes('series f')) return 'Series F';
  if (s.includes('public')) return 'Public';
  if (s.includes('acquired')) return 'Late Stage';
  if (s.includes('late')) return 'Late Stage';
  if (s.includes('seed')) return 'Seed';
  return 'Series B';
}

function mapDealType(dealType: string): Acquisition['dealType'] {
  if (dealType === 'Strategic Investment') return 'Strategic Investment';
  if (dealType === 'Partnership') return 'Strategic Investment';
  return 'Acquisition';
}

/** Companies for ML / matrix views (no fabricated employee counts). */
export function getVerifiedCompaniesForAnalysis(): Company[] {
  return verifiedCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    sector: c.sector as Company['sector'],
    stage: mapStage(c.stage),
    founded: c.founded,
    valuation: c.lastKnownValuation,
    employees: 0,
    hq: c.hq,
    description: c.description,
  }));
}

export function getVerifiedAcquisitionsForAnalysis(): Acquisition[] {
  return verifiedAcquisitions.map((d) => ({
    id: d.id,
    targetId: d.targetId,
    acquirerId: d.acquirerId,
    announcedDate: d.announcedDate,
    closedDate: d.closedDate,
    dealValue: d.dealValue,
    dealType: mapDealType(d.dealType),
    strategicRationale: d.strategicRationale,
  }));
}

function inferAcquirerType(name: string): Acquirer['type'] {
  const n = name.toLowerCase();
  if (n.includes('amazon') || n.includes('apple') || n.includes('google')) return 'strategic_tech';
  if (n.includes('kkr') || n.includes('bain') || n.includes('blackstone')) return 'private_equity';
  if (n.includes('united') || n.includes('cvs')) return 'corporate_health';
  return 'strategic_healthcare';
}

function mapCompanyStage(stage: string): AcquiredCompany['stage'] {
  const s = stage.toLowerCase();
  if (s.includes('pre-seed') || s.includes('student')) return 'pre_seed';
  if (s.includes('seed')) return 'seed';
  if (s.includes('series a')) return 'series_a';
  if (s.includes('series b')) return 'series_b';
  if (s.includes('series c')) return 'series_c';
  if (s.includes('series d') || s.includes('series f')) return 'series_d_plus';
  if (s.includes('public')) return 'public';
  if (s.includes('acquired')) return 'series_b';
  return 'series_b';
}

/** Competitive analysis inputs derived only from verified acquisitions. */
export function getVerifiedCompetitiveAnalysisData(): {
  acquirers: Acquirer[];
  companies: AcquiredCompany[];
  acquisitions: AcquisitionRecord[];
} {
  const acquirerIds = new Set<string>();
  for (const a of verifiedAcquirers) acquirerIds.add(a.id);
  for (const d of verifiedAcquisitions) acquirerIds.add(d.acquirerId);

  const acquirerNameById = new Map<string, string>();
  for (const a of verifiedAcquirers) acquirerNameById.set(a.id, a.name);
  for (const c of verifiedCompanies) acquirerNameById.set(c.id, c.name);

  const acquirers: Acquirer[] = [...acquirerIds].map((id) => {
    const name = acquirerNameById.get(id) ?? id;
    return {
      id,
      name,
      type: inferAcquirerType(name),
      sizeTier: 'mid_market',
      headquarters: 'US',
    };
  });

  const acquiredTargetIds = new Set(verifiedAcquisitions.map((d) => d.targetId));

  const companies: AcquiredCompany[] = verifiedCompanies
    .filter((c) => acquiredTargetIds.has(c.id))
    .map((c) => {
      const deal = verifiedAcquisitions.find((d) => d.targetId === c.id);
      const yearAcquired = deal
        ? new Date(deal.announcedDate).getFullYear()
        : c.founded;
      return {
        id: c.id,
        name: c.name,
        sector: c.sector,
        stage: mapCompanyStage(c.stage),
        yearFounded: c.founded,
        yearAcquired,
        acquisitionValue: deal?.dealValue,
        geography: 'us',
      };
    });

  const acquisitions: AcquisitionRecord[] = verifiedAcquisitions.map((d) => ({
    acquirerId: d.acquirerId,
    companyId: d.targetId,
    year: new Date(d.announcedDate).getFullYear(),
    value: d.dealValue,
  }));

  return { acquirers, companies, acquisitions };
}

/** Network graph for honest network analysis (verified deals only). */
export function getVerifiedNetworkGraph(): {
  nodes: import('@/lib/network/networkStatistics').NetworkNode[];
  edges: import('@/lib/network/networkStatistics').NetworkEdge[];
} {
  const { acquirers, companies, acquisitions } = getVerifiedCompetitiveAnalysisData();
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const acquirerById = new Map(acquirers.map((a) => [a.id, a]));

  const nodes: import('@/lib/network/networkStatistics').NetworkNode[] = [
    ...acquirers.map((a) => ({
      id: a.id,
      label: a.name,
      type: 'acquirer' as const,
      sector: 'Acquirer',
    })),
    ...companies.map((c) => ({
      id: c.id,
      label: c.name,
      type: 'company' as const,
      sector: c.sector,
      valuation: c.acquisitionValue,
    })),
  ];

  const edges: import('@/lib/network/networkStatistics').NetworkEdge[] = acquisitions.map(
    (a) => {
      const dealType =
        companyById.has(a.companyId) &&
        verifiedAcquisitions.find((d) => d.targetId === a.companyId)?.dealType ===
          'Strategic Investment'
          ? 'partnership'
          : 'acquisition';
      return {
        source: a.acquirerId,
        target: a.companyId,
        type: dealType as 'acquisition' | 'partnership',
        year: a.year,
        weight: a.value,
      };
    }
  );

  void acquirerById;
  return { nodes, edges };
}
