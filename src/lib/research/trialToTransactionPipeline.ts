/**
 * Trial→transaction pipeline: join space WH research assets to verified dataset.
 * Pure functions — no network. Earth-trial stage uses search terms / known NCTs as signals.
 */

import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  SPACE_WH_RESEARCH_ASSETS,
  type SpaceWhResearchAsset,
} from "@/data/spaceWhResearchAssets";
import {
  furthestStage,
  missingStages,
  PIPELINE_STAGE_ORDER,
  type SpaceWhTherapeuticArea,
  THERAPEUTIC_AREA_LABELS,
  type TrialToTransactionStage,
} from "@/lib/research/spaceWhTaxonomy";

export interface LinkedEntity {
  id: string;
  name: string;
  kind: "company" | "acquirer";
}

export interface LinkedAcquisition {
  id: string;
  targetName: string;
  acquirerName: string;
  dealValue?: number;
}

export interface PipelineAssetView {
  asset: SpaceWhResearchAsset;
  stagesReached: TrialToTransactionStage[];
  furthestStage: TrialToTransactionStage;
  missingStages: TrialToTransactionStage[];
  linkedCompanies: LinkedEntity[];
  linkedAcquisitions: LinkedAcquisition[];
  earthTrial: {
    knownNctIds: string[];
    searchTerms: string[];
    hasSearchSignal: boolean;
  };
  isCommercialGap: boolean;
}

export interface AreaGapRow {
  area: SpaceWhTherapeuticArea;
  label: string;
  assetCount: number;
  furthestStage: TrialToTransactionStage;
  commercialGapCount: number;
  /** Count of assets that reach each stage (inclusive). */
  stageReachCounts: Record<TrialToTransactionStage, number>;
}

export interface PipelineSummary {
  assetCount: number;
  commercialGapCount: number;
  transactionCount: number;
  stageCounts: Record<TrialToTransactionStage, number>;
  provenanceCounts: Record<string, number>;
}

export interface TrialToTransactionSnapshot {
  assets: PipelineAssetView[];
  areaMatrix: AreaGapRow[];
  summary: PipelineSummary;
  disclaimer: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function aliasMatches(alias: string, entityName: string): boolean {
  const a = normalizeName(alias);
  const e = normalizeName(entityName);
  if (!a || !e) return false;
  return e === a || e.includes(a) || a.includes(e);
}

function linkEntities(
  asset: SpaceWhResearchAsset,
  dataset: VerifiedDataset,
): { companies: LinkedEntity[]; acquisitions: LinkedAcquisition[] } {
  if (asset.entityAliases.length === 0) {
    return { companies: [], acquisitions: [] };
  }

  const companies: LinkedEntity[] = [];
  for (const c of dataset.companies) {
    if (asset.entityAliases.some((alias) => aliasMatches(alias, c.name))) {
      companies.push({ id: c.id, name: c.name, kind: "company" });
    }
  }
  for (const a of dataset.acquirers) {
    if (asset.entityAliases.some((alias) => aliasMatches(alias, a.name))) {
      companies.push({ id: a.id, name: a.name, kind: "acquirer" });
    }
  }

  const acquisitions: LinkedAcquisition[] = [];
  for (const deal of dataset.acquisitions) {
    const hit = asset.entityAliases.some(
      (alias) =>
        aliasMatches(alias, deal.targetName) ||
        aliasMatches(alias, deal.acquirerName),
    );
    if (hit) {
      acquisitions.push({
        id: deal.id,
        targetName: deal.targetName,
        acquirerName: deal.acquirerName,
        dealValue: deal.dealValue,
      });
    }
  }

  return { companies, acquisitions };
}

/**
 * Score one asset against the verified dataset.
 * Operational pharma does not auto-advance to company/transaction unless aliases match.
 */
export function scoreAssetPipeline(
  asset: SpaceWhResearchAsset,
  dataset: VerifiedDataset,
): PipelineAssetView {
  const { companies, acquisitions } = linkEntities(asset, dataset);
  const hasEarthSignal = Boolean(
    (asset.knownNctIds?.length ?? 0) > 0 || asset.ctgovSearchTerms.length > 0,
  );

  const reached = new Set<TrialToTransactionStage>(["research_signal"]);

  if (asset.provenanceTag !== "space_physiology_only") {
    reached.add("space_validation");
  }

  if (hasEarthSignal) {
    reached.add("earth_trial");
  }

  if (companies.length > 0) {
    reached.add("company");
  }

  if (acquisitions.length > 0) {
    reached.add("transaction");
  }

  const stagesReached = PIPELINE_STAGE_ORDER.filter((s) => reached.has(s));
  const furthest = furthestStage(stagesReached);

  return {
    asset,
    stagesReached,
    furthestStage: furthest,
    missingStages: missingStages(furthest),
    linkedCompanies: companies,
    linkedAcquisitions: acquisitions,
    earthTrial: {
      knownNctIds: asset.knownNctIds ?? [],
      searchTerms: asset.ctgovSearchTerms,
      hasSearchSignal: hasEarthSignal,
    },
    isCommercialGap: companies.length === 0 && acquisitions.length === 0,
  };
}

function emptyStageCounts(): Record<TrialToTransactionStage, number> {
  return {
    research_signal: 0,
    space_validation: 0,
    earth_trial: 0,
    company: 0,
    transaction: 0,
  };
}

/** Build full pipeline snapshot for UI, API, and LLM grounding. */
export function buildTrialToTransactionSnapshot(
  dataset: VerifiedDataset,
  assets: readonly SpaceWhResearchAsset[] = SPACE_WH_RESEARCH_ASSETS,
): TrialToTransactionSnapshot {
  const views = assets.map((a) => scoreAssetPipeline(a, dataset));

  const stageCounts = emptyStageCounts();
  const provenanceCounts: Record<string, number> = {};
  let commercialGapCount = 0;
  let transactionCount = 0;

  for (const view of views) {
    stageCounts[view.furthestStage] += 1;
    provenanceCounts[view.asset.provenanceTag] =
      (provenanceCounts[view.asset.provenanceTag] ?? 0) + 1;
    if (view.isCommercialGap) commercialGapCount += 1;
    if (view.linkedAcquisitions.length > 0) transactionCount += 1;
  }

  const areas = new Set<SpaceWhTherapeuticArea>();
  for (const view of views) {
    for (const area of view.asset.therapeuticAreas) areas.add(area);
  }

  const areaMatrix: AreaGapRow[] = [...areas].map((area) => {
    const inArea = views.filter((v) => v.asset.therapeuticAreas.includes(area));
    const stageReachCounts = emptyStageCounts();
    for (const view of inArea) {
      for (const stage of view.stagesReached) {
        stageReachCounts[stage] += 1;
      }
    }
    const furthest = furthestStage(inArea.map((v) => v.furthestStage));
    return {
      area,
      label: THERAPEUTIC_AREA_LABELS[area],
      assetCount: inArea.length,
      furthestStage: furthest,
      commercialGapCount: inArea.filter((v) => v.isCommercialGap).length,
      stageReachCounts,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));

  return {
    assets: views,
    areaMatrix,
    summary: {
      assetCount: views.length,
      commercialGapCount,
      transactionCount,
      stageCounts,
      provenanceCounts,
    },
    disclaimer:
      "Curated public citations of space-linked women's health research joined to Lacuna's verified M&A dataset. Pipeline stages are descriptive evidence flags — not investment advice, clinical recommendations, or forecasts.",
  };
}

/** Compact JSON context for LLM prompts (token-efficient). */
export function pipelineSnapshotForLlm(
  snapshot: TrialToTransactionSnapshot,
): string {
  const payload = {
    disclaimer: snapshot.disclaimer,
    summary: snapshot.summary,
    areaGaps: snapshot.areaMatrix.map((row) => ({
      area: row.label,
      assets: row.assetCount,
      furthestStage: row.furthestStage,
      commercialGaps: row.commercialGapCount,
    })),
    assets: snapshot.assets.map((view) => ({
      id: view.asset.id,
      name: view.asset.name,
      provenance: view.asset.provenanceTag,
      areas: view.asset.therapeuticAreas,
      furthestStage: view.furthestStage,
      missingStages: view.missingStages,
      commercialGap: view.isCommercialGap,
      companies: view.linkedCompanies.map((c) => c.name),
      deals: view.linkedAcquisitions.map(
        (d) => `${d.acquirerName} ← ${d.targetName}`,
      ),
      ctgovTerms: view.earthTrial.searchTerms,
      gapNotes: view.asset.gapNotes,
    })),
  };
  return JSON.stringify(payload, null, 2);
}
