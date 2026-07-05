/**
 * Patient empowerment gap pipeline: join HLTH/Outcomes4Me cited gaps to Lacuna
 * verified companies by curated mapping, sector, and keyword affinity (tiered).
 */

import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  curatedLinksByMetricId,
  type CuratedEmpowermentLink,
} from "@/data/patientEmpowermentCrosswalk";
import {
  PATIENT_EMPOWERMENT_HEADLINE,
  PATIENT_EMPOWERMENT_METRICS,
  type PatientEmpowermentMetric,
} from "@/data/patientEmpowermentReport";
import {
  EMPOWERMENT_PHASE_LABELS,
  EMPOWERMENT_PHASE_ORDER,
  EMPOWERMENT_PREREQUISITE_LABELS,
  EMPOWERMENT_PREREQUISITE_ORDER,
  bestMatchTier,
  type EmpowermentCarePhase,
  type EmpowermentMatchTier,
  type EmpowermentPrerequisiteId,
} from "@/lib/research/patientEmpowermentTaxonomy";

export interface LinkedCompany {
  id: string;
  name: string;
  sector: string;
  matchTier: EmpowermentMatchTier;
  matchNote?: string;
}

export interface LinkedDeal {
  id: string;
  targetName: string;
  acquirerName: string;
  announcedDate: string;
  dealValue?: number;
}

export interface GapDimensionView {
  metric: PatientEmpowermentMetric;
  linkedCompanies: LinkedCompany[];
  linkedDeals: LinkedDeal[];
  addressableInSample: number;
  portfolioCoveragePct: number;
  isPortfolioGap: boolean;
  curatedLinkCount: number;
}

export interface PrerequisiteGapRow {
  prerequisiteId: EmpowermentPrerequisiteId;
  label: string;
  metricCount: number;
  meanGapIndexPct: number;
  maxGapIndexPct: number;
  linkedCompanyCount: number;
  linkedDealCount: number;
  dimensions: GapDimensionView[];
}

export interface PhaseGapRow {
  phase: EmpowermentCarePhase;
  label: string;
  meanGapIndexPct: number;
  metricCount: number;
}

export interface EmpowermentPipelineSummary {
  surveyRespondents: number;
  metricCount: number;
  meanGapIndexPct: number;
  addressableCompaniesInSample: number;
  linkedCompanyCount: number;
  linkedDealCount: number;
  portfolioGapCount: number;
  curatedLinkCount: number;
  highestGapMetricId: string;
  highestGapPrerequisiteId: EmpowermentPrerequisiteId;
}

export interface PatientEmpowermentSnapshot {
  headline: typeof PATIENT_EMPOWERMENT_HEADLINE;
  dimensions: GapDimensionView[];
  prerequisiteMatrix: PrerequisiteGapRow[];
  phaseSummary: PhaseGapRow[];
  summary: EmpowermentPipelineSummary;
  disclaimer: string;
}

interface CompanyMatchState {
  tier: EmpowermentMatchTier;
  note?: string;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function descriptionMatches(
  description: string,
  keywords: readonly string[],
): boolean {
  const haystack = normalizeText(description);
  return keywords.some((kw) => haystack.includes(normalizeText(kw)));
}

function companiesInSectors(
  dataset: VerifiedDataset,
  sectors: readonly string[],
): Set<string> {
  const sectorSet = new Set(sectors);
  return new Set(
    dataset.companies
      .filter((c) => sectorSet.has(c.sector))
      .map((c) => c.id),
  );
}

function applyCuratedLinks(
  matches: Map<string, CompanyMatchState>,
  curated: readonly CuratedEmpowermentLink[],
): void {
  for (const link of curated) {
    const existing = matches.get(link.companyId);
    const tier = bestMatchTier(existing?.tier ?? null, "curated");
    matches.set(link.companyId, {
      tier,
      note: tier === "curated" ? link.note : existing?.note,
    });
  }
}

/**
 * Score portfolio affinity for one empowerment gap dimension (tiered join).
 */
export function scoreGapDimension(
  metric: PatientEmpowermentMetric,
  dataset: VerifiedDataset,
): GapDimensionView {
  const sectorIds = companiesInSectors(dataset, metric.relatedSectors);
  const curated = curatedLinksByMetricId(metric.id);
  const matches = new Map<string, CompanyMatchState>();

  applyCuratedLinks(matches, curated);

  for (const company of dataset.companies) {
    if (sectorIds.has(company.id)) {
      const existing = matches.get(company.id);
      matches.set(company.id, {
        tier: bestMatchTier(existing?.tier ?? null, "sector"),
        note: existing?.note,
      });
    }
    if (descriptionMatches(company.description, metric.matchKeywords)) {
      const existing = matches.get(company.id);
      const tier = bestMatchTier(existing?.tier ?? null, "keyword");
      matches.set(company.id, {
        tier,
        note: existing?.note,
      });
    }
  }

  const companyById = new Map(dataset.companies.map((c) => [c.id, c]));
  const linkedCompanies: LinkedCompany[] = [];
  for (const [id, state] of matches) {
    const company = companyById.get(id);
    if (!company) continue;
    linkedCompanies.push({
      id: company.id,
      name: company.name,
      sector: company.sector,
      matchTier: state.tier,
      matchNote: state.note,
    });
  }
  linkedCompanies.sort((a, b) => a.name.localeCompare(b.name));

  const linkedIds = new Set(linkedCompanies.map((c) => c.id));
  const linkedDeals: LinkedDeal[] = [];
  for (const deal of dataset.acquisitions) {
    if (!linkedIds.has(deal.targetId)) continue;
    linkedDeals.push({
      id: deal.id,
      targetName: deal.targetName,
      acquirerName: deal.acquirerName,
      announcedDate: deal.announcedDate,
      dealValue: deal.dealValue,
    });
  }

  const addressableInSample = sectorIds.size;
  const portfolioCoveragePct = addressableInSample > 0
    ? Math.round((linkedCompanies.length / addressableInSample) * 100)
    : 0;

  return {
    metric,
    linkedCompanies,
    linkedDeals,
    addressableInSample,
    portfolioCoveragePct,
    isPortfolioGap: linkedCompanies.length === 0 && addressableInSample > 0,
    curatedLinkCount: linkedCompanies.filter((c) => c.matchTier === "curated")
      .length,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length,
  );
}

/** Build full empowerment × portfolio snapshot for UI and API. */
export function buildPatientEmpowermentSnapshot(
  dataset: VerifiedDataset,
  metrics: readonly PatientEmpowermentMetric[] = PATIENT_EMPOWERMENT_METRICS,
): PatientEmpowermentSnapshot {
  const dimensions = metrics.map((m) => scoreGapDimension(m, dataset));

  const prerequisiteMatrix: PrerequisiteGapRow[] =
    EMPOWERMENT_PREREQUISITE_ORDER.map((prerequisiteId) => {
      const rows = dimensions.filter(
        (d) => d.metric.prerequisiteId === prerequisiteId,
      );
      const companyIds = new Set<string>();
      const dealIds = new Set<string>();
      for (const row of rows) {
        for (const c of row.linkedCompanies) companyIds.add(c.id);
        for (const d of row.linkedDeals) dealIds.add(d.id);
      }
      const gapIndices = rows.map((r) => r.metric.gapIndexPct);
      return {
        prerequisiteId,
        label: EMPOWERMENT_PREREQUISITE_LABELS[prerequisiteId],
        metricCount: rows.length,
        meanGapIndexPct: mean(gapIndices),
        maxGapIndexPct: gapIndices.length > 0 ? Math.max(...gapIndices) : 0,
        linkedCompanyCount: companyIds.size,
        linkedDealCount: dealIds.size,
        dimensions: rows,
      };
    });

  const phaseSummary: PhaseGapRow[] = EMPOWERMENT_PHASE_ORDER.map((phase) => {
    const inPhase = dimensions.filter((d) => d.metric.phase === phase);
    return {
      phase,
      label: EMPOWERMENT_PHASE_LABELS[phase],
      meanGapIndexPct: mean(inPhase.map((d) => d.metric.gapIndexPct)),
      metricCount: inPhase.length,
    };
  });

  const allCompanyIds = new Set<string>();
  const allDealIds = new Set<string>();
  let portfolioGapCount = 0;
  let curatedLinkCount = 0;
  for (const d of dimensions) {
    for (const c of d.linkedCompanies) {
      allCompanyIds.add(c.id);
      if (c.matchTier === "curated") curatedLinkCount += 1;
    }
    for (const deal of d.linkedDeals) allDealIds.add(deal.id);
    if (d.isPortfolioGap) portfolioGapCount += 1;
  }

  const addressableCompaniesInSample = new Set(
    metrics.flatMap((m) => [...companiesInSectors(dataset, m.relatedSectors)]),
  ).size;

  const sortedByGap = [...dimensions].sort(
    (a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct,
  );
  const sortedPrereq = [...prerequisiteMatrix].sort(
    (a, b) => b.meanGapIndexPct - a.meanGapIndexPct,
  );

  return {
    headline: PATIENT_EMPOWERMENT_HEADLINE,
    dimensions,
    prerequisiteMatrix,
    phaseSummary,
    summary: {
      surveyRespondents: PATIENT_EMPOWERMENT_HEADLINE.surveyRespondents,
      metricCount: metrics.length,
      meanGapIndexPct: mean(dimensions.map((d) => d.metric.gapIndexPct)),
      addressableCompaniesInSample,
      linkedCompanyCount: allCompanyIds.size,
      linkedDealCount: allDealIds.size,
      portfolioGapCount,
      curatedLinkCount,
      highestGapMetricId: sortedByGap[0]?.metric.id ?? "",
      highestGapPrerequisiteId:
        sortedPrereq[0]?.prerequisiteId ?? "evidence-standards",
    },
    disclaimer:
      "HLTH Foundation / Outcomes4Me 2022 breast cancer empowerment baseline crosswalked to Lacuna's verified M&A sample using curated analyst mappings (preferred), sector overlap, and description keyword affinity. Gap indices are cited static rates — not live patient outcomes, clinical benchmarks, or investment advice.",
  };
}

/** CSV export for diligence workflows. */
export function exportEmpowermentCrosswalkCsv(
  snapshot: PatientEmpowermentSnapshot,
): string {
  const header =
    "metric_id,metric_label,gap_index_pct,cited_value,company_id,company_name,sector,match_tier,match_note,deal_count";
  const rows = [header];
  for (const dim of snapshot.dimensions) {
    if (dim.linkedCompanies.length === 0) {
      rows.push(
        [
          dim.metric.id,
          csvEscape(dim.metric.label),
          String(dim.metric.gapIndexPct),
          csvEscape(dim.metric.citedValue),
          "",
          "",
          "",
          "",
          "",
          String(dim.linkedDeals.length),
        ].join(","),
      );
      continue;
    }
    for (const company of dim.linkedCompanies) {
      const dealCount = dim.linkedDeals.filter(
        (d) => d.targetName === company.name,
      ).length;
      rows.push(
        [
          dim.metric.id,
          csvEscape(dim.metric.label),
          String(dim.metric.gapIndexPct),
          csvEscape(dim.metric.citedValue),
          company.id,
          csvEscape(company.name),
          csvEscape(company.sector),
          company.matchTier,
          csvEscape(company.matchNote ?? ""),
          String(dealCount),
        ].join(","),
      );
    }
  }
  return `${rows.join("\n")}\n`;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Token-efficient JSON for LLM grounding. */
export function empowermentSnapshotForLlm(
  snapshot: PatientEmpowermentSnapshot,
): string {
  const payload = {
    disclaimer: snapshot.disclaimer,
    summary: snapshot.summary,
    prerequisites: snapshot.prerequisiteMatrix.map((row) => ({
      id: row.prerequisiteId,
      label: row.label,
      meanGapIndexPct: row.meanGapIndexPct,
      companies: row.linkedCompanyCount,
      deals: row.linkedDealCount,
    })),
    topGaps: [...snapshot.dimensions]
      .sort((a, b) => b.metric.gapIndexPct - a.metric.gapIndexPct)
      .slice(0, 8)
      .map((d) => ({
        id: d.metric.id,
        citedValue: d.metric.citedValue,
        gapIndexPct: d.metric.gapIndexPct,
        portfolioGap: d.isPortfolioGap,
        curatedLinks: d.curatedLinkCount,
        companies: d.linkedCompanies.map((c) => ({
          name: c.name,
          tier: c.matchTier,
        })),
        deals: d.linkedDeals.map((x) => `${x.acquirerName} ← ${x.targetName}`),
      })),
  };
  return JSON.stringify(payload, null, 2);
}
