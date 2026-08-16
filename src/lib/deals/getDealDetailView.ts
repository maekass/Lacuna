import { formatDealDate } from "./formatDealDate";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import { formatDealBrief } from "@/lib/gamma/formatDealBrief";
import type { DealEmpowermentContext } from "./empowermentContextForDeal";
import { empowermentContextForDeal } from "./empowermentContextForDeal";
import { buildEvidenceLadder } from "./evidenceLadder";
import type { EvidenceLadderResult } from "./evidenceLadder";
import { getDealById } from "./getDealById";
import { listAcquirerDeals } from "./listAcquirerDeals";
import {
  type AdjacentNonPeer,
  listComparableDealSets,
} from "./listComparableDeals";
import type { ComparableDealSummary, DealDetail } from "./dealTypes";
import {
  closeDurationDays,
  premiumMultiple,
  premiumPercent,
} from "./dealTiming";
import {
  sourcedDistinctLastKnownValuation,
  type SourcedLastKnownValuation,
} from "./sourcedLastKnownValuation";
import {
  type KeyedRegulatoryCitation,
  keyedRegulatoryCitationsForTarget,
} from "./keyedRegulatoryCitations";

export interface DealDetailView {
  deal: DealDetail;
  ladder: EvidenceLadderResult;
  comparables: ComparableDealSummary[];
  adjacencyNotPeers: AdjacentNonPeer[];
  acquirerDeals: ComparableDealSummary[];
  empowerment: DealEmpowermentContext;
  closeDays: number | null;
  announcedLabel: string;
  closedLabel: string | null;
  premiumMultiple: number | null;
  premiumPercent: number | null;
  /** Distinct sourced company valuation — null when it duplicates deal price. */
  targetLastKnownValuation: SourcedLastKnownValuation | null;
  /**
   * ClinicalTrials/FDA/CMS rows keyed to `targetId` with a public NCT/CPT
   * citation. Empty until curated — never a live company-name search.
   */
  regulatoryCitations: KeyedRegulatoryCitation[];
  briefMarkdown: string;
  provenanceLine: string;
}

/**
 * Server-side dossier model for a verified deal page. Returns null when the
 * id is missing or target/acquirer links are broken.
 */
export function getDealDetailView(
  dataset: VerifiedDataset,
  dealId: string,
): DealDetailView | null {
  const deal = getDealById(dataset, dealId);
  if (!deal) return null;

  const { peers, adjacencyNotPeers } = listComparableDealSets(dataset, dealId);
  const shownIds = new Set([
    ...peers.map((row) => row.id),
    ...adjacencyNotPeers.map((row) => row.id),
  ]);
  const acquirerDeals = listAcquirerDeals(dataset, dealId, 5, shownIds);
  const ladder = buildEvidenceLadder(deal);
  const closeDays = closeDurationDays(
    deal.acquisition.announcedDate,
    deal.acquisition.closedDate,
  );
  const multiple = premiumMultiple(deal.acquisition);
  const empowerment = empowermentContextForDeal(deal, dataset);
  const targetLastKnownValuation = sourcedDistinctLastKnownValuation({
    lastKnownValuation: deal.target.lastKnownValuation,
    valuationSource: deal.target.valuationSource,
    dealValue: deal.acquisition.dealValue,
    preDealValuation: deal.acquisition.preDealValuation,
  });

  return {
    deal,
    ladder,
    comparables: peers,
    adjacencyNotPeers,
    acquirerDeals,
    empowerment,
    closeDays,
    announcedLabel: formatDealDate(deal.acquisition.announcedDate),
    closedLabel: deal.acquisition.closedDate
      ? formatDealDate(deal.acquisition.closedDate)
      : null,
    premiumMultiple: multiple,
    premiumPercent: multiple === null ? null : premiumPercent(multiple),
    targetLastKnownValuation,
    regulatoryCitations: keyedRegulatoryCitationsForTarget(deal.target.id),
    briefMarkdown: formatDealBrief(deal, peers, {
      adjacencyNotPeers,
      closeDays,
      premiumMultiple: multiple,
      targetLastKnownValuation,
      targetSources: deal.target.sources,
      empowerment,
      disclaimer: dataset.provenance.disclaimer,
    }),
    provenanceLine: [
      `Curated verified dataset${
        dataset.provenance.datasetVersion
          ? ` ${dataset.provenance.datasetVersion}`
          : ""
      }`,
      `updated ${dataset.provenance.lastUpdated}`,
      `${ladder.runs.length} citations on this deal`,
      dataset.provenance.disclaimer,
    ].join(" · "),
  };
}
