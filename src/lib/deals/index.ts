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
export { listComparableDeals } from "./listComparableDeals";
export { listAcquirerDeals } from "./listAcquirerDeals";
export { buildEvidenceLadder } from "./evidenceLadder";
export type { EvidenceLadderResult, EvidenceTier } from "./evidenceLadder";
export { empowermentContextForDeal } from "./empowermentContextForDeal";
export type {
  DealEmpowermentContext,
  DealEmpowermentDimensionMatch,
  DealEmpowermentScopeAlignment,
} from "./empowermentContextForDeal";
