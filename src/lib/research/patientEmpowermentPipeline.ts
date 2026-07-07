/**
 * Patient empowerment gap pipeline: join HLTH/Outcomes4Me cited gaps to Lacuna
 * verified companies by curated mapping, sector, and keyword affinity (tiered).
 */

import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  type CuratedEmpowermentLink,
  curatedLinksByMetricId,
} from "@/data/patientEmpowermentCrosswalk";
import {
  PATIENT_EMPOWERMENT_HEADLINE,
  PATIENT_EMPOWERMENT_METRICS,
  type PatientEmpowermentMetric,
} from "@/data/patientEmpowermentReport";
import {
  computeGapPriorityScore,
  computeGapSeverityDistribution,
  computeWeightedBurdenIndex,
  type GapSeverityDistribution,
  meanRounded,
  median,
} from "@/lib/research/patientEmpowermentScoring";
import {
  bestMatchTier,
  EMPOWERMENT_PHASE_LABELS,
  EMPOWERMENT_PHASE_ORDER,
  EMPOWERMENT_PREREQUISITE_LABELS,
  EMPOWERMENT_PREREQUISITE_ORDER,
  type EmpowermentCarePhase,
  type EmpowermentMatchTier,
  type EmpowermentPrerequisiteId,
  type EmpowermentSourceTier,
  isEvidenceBackedLink,
} from "@/lib/research/patientEmpowermentTaxonomy";

export interface LinkedCompany {
  id: string;
  name: string;
  sector: string;
  matchTier: EmpowermentMatchTier;
  matchNote?: string;
  /** Curated links only — public citation for gap affinity. */
  sourceUrl?: string;
  sourceTier?: EmpowermentSourceTier;
  rationale?: string;
  reviewedAt?: string;
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
  /** Heuristic linked-in-sector / addressable (capped at 100). */
  portfolioCoveragePct: number;
  /** Curated analyst links in sector / addressable. */
  curatedCoveragePct: number;
  /** Sector/keyword links in sector (excludes curated) / addressable. */
  heuristicCoveragePct: number;
  /** Curated links with sourceUrl in sector / addressable. */
  evidenceCoveragePct: number;
  isPortfolioGap: boolean;
  curatedLinkCount: number;
  /** gap index × (1 − curated coverage %) */
  priorityScore: number;
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
  medianGapIndexPct: number;
  meanHighSeverityGapIndexPct: number;
  weightedBurdenIndexPct: number;
  criticalMetricCount: number;
  highMetricCount: number;
  maxGapIndexPct: number;
  maxGapMetricLabel: string;
  addressableCompaniesInSample: number;
  linkedCompanyCount: number;
  linkedDealCount: number;
  portfolioGapCount: number;
  curatedLinkCount: number;
  evidenceBackedLinkCount: number;
  meanEvidenceCoveragePct: number;
  highestGapMetricId: string;
  highestGapPrerequisiteId: EmpowermentPrerequisiteId;
}

export interface PatientEmpowermentSnapshot {
  headline: typeof PATIENT_EMPOWERMENT_HEADLINE;
  dimensions: GapDimensionView[];
  priorityRankings: GapDimensionView[];
  gapDistribution: GapSeverityDistribution;
  prerequisiteMatrix: PrerequisiteGapRow[];
  phaseSummary: PhaseGapRow[];
  summary: EmpowermentPipelineSummary;
  disclaimer: string;
}

interface CompanyMatchState {
  tier: EmpowermentMatchTier;
  note?: string;
  sourceUrl?: string;
  sourceTier?: EmpowermentSourceTier;
  rationale?: string;
  reviewedAt?: string;
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
    if (tier !== "curated") {
      if (existing) matches.set(link.companyId, existing);
      continue;
    }
    matches.set(link.companyId, {
      tier,
      note: link.note,
      sourceUrl: link.sourceUrl,
      sourceTier: link.sourceTier,
      rationale: link.rationale,
      reviewedAt: link.reviewedAt,
    });
  }
}

function enrichDimension(
  view: Omit<GapDimensionView, "priorityScore">,
): GapDimensionView {
  return {
    ...view,
    priorityScore: computeGapPriorityScore(
      view.metric.gapIndexPct,
      view.curatedCoveragePct,
    ),
  };
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
      const tier = bestMatchTier(existing?.tier ?? null, "sector");
      matches.set(company.id, {
        ...existing,
        tier,
      });
    }
    if (descriptionMatches(company.description ?? "", metric.matchKeywords)) {
      const existing = matches.get(company.id);
      const tier = bestMatchTier(existing?.tier ?? null, "keyword");
      matches.set(company.id, {
        ...existing,
        tier,
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
      ...(state.tier === "curated"
        ? {
          sourceUrl: state.sourceUrl,
          sourceTier: state.sourceTier,
          rationale: state.rationale,
          reviewedAt: state.reviewedAt,
        }
        : {}),
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
  const linkedInSectorCount =
    linkedCompanies.filter((c) => sectorIds.has(c.id)).length;
  const portfolioCoveragePct = addressableInSample > 0
    ? Math.min(
      100,
      Math.round((linkedInSectorCount / addressableInSample) * 100),
    )
    : 0;
  const curatedInSectorCount = linkedCompanies.filter(
    (c) => sectorIds.has(c.id) && c.matchTier === "curated",
  ).length;
  const curatedCoveragePct = addressableInSample > 0
    ? Math.round((curatedInSectorCount / addressableInSample) * 100)
    : 0;
  const heuristicInSectorCount = linkedCompanies.filter(
    (c) => sectorIds.has(c.id) && c.matchTier !== "curated",
  ).length;
  const heuristicCoveragePct = addressableInSample > 0
    ? Math.round((heuristicInSectorCount / addressableInSample) * 100)
    : 0;
  const evidenceInSectorCount = linkedCompanies.filter(
    (c) =>
      sectorIds.has(c.id) && c.matchTier === "curated" &&
      isEvidenceBackedLink(c),
  ).length;
  const evidenceCoveragePct = addressableInSample > 0
    ? Math.round((evidenceInSectorCount / addressableInSample) * 100)
    : 0;

  return enrichDimension({
    metric,
    linkedCompanies,
    linkedDeals,
    addressableInSample,
    portfolioCoveragePct,
    curatedCoveragePct,
    heuristicCoveragePct,
    evidenceCoveragePct,
    isPortfolioGap: linkedCompanies.length === 0 && addressableInSample > 0,
    curatedLinkCount: linkedCompanies.filter((c) => c.matchTier === "curated")
      .length,
  });
}

/** Build full empowerment × portfolio snapshot for UI and API. */
export function buildPatientEmpowermentSnapshot(
  dataset: VerifiedDataset,
  metrics: readonly PatientEmpowermentMetric[] = PATIENT_EMPOWERMENT_METRICS,
): PatientEmpowermentSnapshot {
  const dimensions = metrics.map((m) => scoreGapDimension(m, dataset));
  const gapIndices = dimensions.map((d) => d.metric.gapIndexPct);
  const highSeverityGaps = dimensions
    .filter((d) => d.metric.gapSeverity !== "moderate")
    .map((d) => d.metric.gapIndexPct);

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
      const indices = rows.map((r) => r.metric.gapIndexPct);
      return {
        prerequisiteId,
        label: EMPOWERMENT_PREREQUISITE_LABELS[prerequisiteId],
        metricCount: rows.length,
        meanGapIndexPct: meanRounded(indices),
        maxGapIndexPct: indices.length > 0 ? Math.max(...indices) : 0,
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
      meanGapIndexPct: meanRounded(inPhase.map((d) => d.metric.gapIndexPct)),
      metricCount: inPhase.length,
    };
  });

  const allCompanyIds = new Set<string>();
  const allDealIds = new Set<string>();
  let portfolioGapCount = 0;
  let curatedLinkCount = 0;
  let evidenceBackedLinkCount = 0;
  for (const d of dimensions) {
    for (const c of d.linkedCompanies) {
      allCompanyIds.add(c.id);
      if (c.matchTier === "curated") {
        curatedLinkCount += 1;
        if (isEvidenceBackedLink(c)) evidenceBackedLinkCount += 1;
      }
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
  const sortedByPriority = [...dimensions].sort(
    (a, b) => b.priorityScore - a.priorityScore,
  );
  const sortedPrereq = [...prerequisiteMatrix].sort(
    (a, b) => b.meanGapIndexPct - a.meanGapIndexPct,
  );
  const gapDistribution = computeGapSeverityDistribution(
    dimensions.map((d) => d.metric.gapSeverity),
  );

  return {
    headline: PATIENT_EMPOWERMENT_HEADLINE,
    dimensions,
    priorityRankings: sortedByPriority,
    gapDistribution,
    prerequisiteMatrix,
    phaseSummary,
    summary: {
      surveyRespondents: PATIENT_EMPOWERMENT_HEADLINE.surveyRespondents,
      metricCount: metrics.length,
      meanGapIndexPct: meanRounded(gapIndices),
      medianGapIndexPct: median(gapIndices),
      meanHighSeverityGapIndexPct: meanRounded(highSeverityGaps),
      weightedBurdenIndexPct: computeWeightedBurdenIndex(
        dimensions.map((d) => ({
          gapIndexPct: d.metric.gapIndexPct,
          phase: d.metric.phase,
          prerequisiteId: d.metric.prerequisiteId,
          gapSeverity: d.metric.gapSeverity,
        })),
      ),
      criticalMetricCount: gapDistribution.critical,
      highMetricCount: gapDistribution.high,
      maxGapIndexPct: sortedByGap[0]?.metric.gapIndexPct ?? 0,
      maxGapMetricLabel: sortedByGap[0]?.metric.label ?? "",
      addressableCompaniesInSample,
      linkedCompanyCount: allCompanyIds.size,
      linkedDealCount: allDealIds.size,
      portfolioGapCount,
      curatedLinkCount,
      evidenceBackedLinkCount,
      meanEvidenceCoveragePct: meanRounded(
        dimensions.map((d) => d.evidenceCoveragePct),
      ),
      highestGapMetricId: sortedByGap[0]?.metric.id ?? "",
      highestGapPrerequisiteId: sortedPrereq[0]?.prerequisiteId ??
        "evidence-standards",
    },
    disclaimer:
      "HLTH Foundation / Outcomes4Me 2022 breast cancer empowerment baseline crosswalked to Lacuna's verified M&A sample using curated analyst mappings (preferred), sector overlap, and description keyword affinity. Gap indices are cited static rates — not live patient outcomes, clinical benchmarks, or investment advice.",
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV with summary block + crosswalk rows for diligence export. */
export function exportEmpowermentCrosswalkCsv(
  snapshot: PatientEmpowermentSnapshot,
): string {
  const { summary, phaseSummary, prerequisiteMatrix } = snapshot;
  const summaryRows = [
    "section,key,value",
    `summary,mean_gap_index,${summary.meanGapIndexPct}`,
    `summary,median_gap_index,${summary.medianGapIndexPct}`,
    `summary,mean_high_severity_gap,${summary.meanHighSeverityGapIndexPct}`,
    `summary,weighted_burden_index,${summary.weightedBurdenIndexPct}`,
    `summary,critical_metrics,${summary.criticalMetricCount}`,
    `summary,high_metrics,${summary.highMetricCount}`,
    `summary,max_gap_label,${csvEscape(summary.maxGapMetricLabel)}`,
    `summary,curated_links,${summary.curatedLinkCount}`,
    `summary,portfolio_gaps,${summary.portfolioGapCount}`,
    "",
    "phase,label,mean_gap_index,metric_count",
    ...phaseSummary.map((p) =>
      `phase,${csvEscape(p.label)},${p.meanGapIndexPct},${p.metricCount}`
    ),
    "",
    "prerequisite,label,mean_gap_index,companies,deals",
    ...prerequisiteMatrix.map((p) =>
      `prerequisite,${
        csvEscape(p.label)
      },${p.meanGapIndexPct},${p.linkedCompanyCount},${p.linkedDealCount}`
    ),
    "",
    "metric_id,metric_label,gap_index,priority_score,cited_value,evidence_coverage_pct,company_id,company_name,sector,match_tier,match_note,source_tier,source_url,deal_count",
  ];

  const crosswalkRows: string[] = [];
  for (const dim of snapshot.dimensions) {
    if (dim.linkedCompanies.length === 0) {
      crosswalkRows.push(
        [
          dim.metric.id,
          csvEscape(dim.metric.label),
          String(dim.metric.gapIndexPct),
          String(dim.priorityScore),
          csvEscape(dim.metric.citedValue),
          String(dim.evidenceCoveragePct),
          "",
          "",
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
      crosswalkRows.push(
        [
          dim.metric.id,
          csvEscape(dim.metric.label),
          String(dim.metric.gapIndexPct),
          String(dim.priorityScore),
          csvEscape(dim.metric.citedValue),
          String(dim.evidenceCoveragePct),
          company.id,
          csvEscape(company.name),
          csvEscape(company.sector),
          company.matchTier,
          csvEscape(company.matchNote ?? ""),
          company.sourceTier ?? "",
          csvEscape(company.sourceUrl ?? ""),
          String(dealCount),
        ].join(","),
      );
    }
  }

  return `${[...summaryRows, ...crosswalkRows].join("\n")}\n`;
}

/** Token-efficient JSON for LLM grounding — priority gaps first. */
export function empowermentSnapshotForLlm(
  snapshot: PatientEmpowermentSnapshot,
): string {
  const highPriority = snapshot.priorityRankings
    .filter((d) => d.isPortfolioGap || d.priorityScore >= 40)
    .slice(0, 8);

  const payload = {
    disclaimer: snapshot.disclaimer,
    summary: snapshot.summary,
    gapDistribution: snapshot.gapDistribution,
    prerequisites: snapshot.prerequisiteMatrix.map((row) => ({
      id: row.prerequisiteId,
      label: row.label,
      meanGapIndexPct: row.meanGapIndexPct,
      companies: row.linkedCompanyCount,
      deals: row.linkedDealCount,
    })),
    highPriorityGaps: highPriority.map((d) => ({
      id: d.metric.id,
      citedValue: d.metric.citedValue,
      gapIndexPct: d.metric.gapIndexPct,
      priorityScore: d.priorityScore,
      portfolioGap: d.isPortfolioGap,
      portfolioCoveragePct: d.portfolioCoveragePct,
      curatedCoveragePct: d.curatedCoveragePct,
      heuristicCoveragePct: d.heuristicCoveragePct,
      evidenceCoveragePct: d.evidenceCoveragePct,
      curatedLinks: d.curatedLinkCount,
      companies: d.linkedCompanies.map((c) => ({
        name: c.name,
        tier: c.matchTier,
        sourceTier: c.sourceTier,
        hasSourceUrl: isEvidenceBackedLink(c),
      })),
      deals: d.linkedDeals.map((x) => `${x.acquirerName} ← ${x.targetName}`),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/** Companies sharing curated empowerment tags with a target (deal comparables). */
export function listEmpowermentComparableCompanyIds(
  snapshot: PatientEmpowermentSnapshot,
  targetCompanyId: string,
): string[] {
  const targetDims = snapshot.dimensions.filter((d) =>
    d.linkedCompanies.some((c) => c.id === targetCompanyId)
  );
  const targetCuratedMetrics = new Set(
    targetDims
      .filter((d) =>
        d.linkedCompanies.find((c) =>
          c.id === targetCompanyId && c.matchTier === "curated"
        )
      )
      .map((d) => d.metric.id),
  );

  const scores = new Map<string, number>();
  for (const dim of snapshot.dimensions) {
    if (!targetCuratedMetrics.has(dim.metric.id)) continue;
    for (const c of dim.linkedCompanies) {
      if (c.id === targetCompanyId) continue;
      if (c.matchTier !== "curated") continue;
      scores.set(c.id, (scores.get(c.id) ?? 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
