export {
  type ComparableDealSummary,
  CONSUMER_FEATURED_DEAL_ID,
  type DealAcquirer,
  type DealAcquisitionDetail,
  type DealAcquisitionExtras,
  type DealDetail,
  type DealTarget,
  FEATURED_DEAL_ID,
} from "./dealTypes";
export { getDealById } from "./getDealById";
export { getFeaturedDeal } from "./getFeaturedDeal";
export {
  listComparableDeals,
  listComparableDealSets,
} from "./listComparableDeals";
export type {
  AdjacentNonPeer,
  ComparableDealSets,
} from "./listComparableDeals";
export { listAcquirerDeals } from "./listAcquirerDeals";
export {
  buildEvidenceLadder,
  hasPrimaryAndIndependent,
} from "./evidenceLadder";
export type { EvidenceLadderResult, EvidenceTier } from "./evidenceLadder";
export { getDealDetailView } from "./getDealDetailView";
export type { DealDetailView } from "./getDealDetailView";
export { empowermentContextForDeal } from "./empowermentContextForDeal";
export type {
  DealEmpowermentContext,
  DealEmpowermentDimensionMatch,
  DealEmpowermentScopeAlignment,
} from "./empowermentContextForDeal";
