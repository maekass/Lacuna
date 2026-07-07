export {
  FEATURED_DEAL_ID,
  type ComparableDealSummary,
  type DealAcquisitionDetail,
  type DealAcquisitionExtras,
  type DealAcquirer,
  type DealDetail,
  type DealTarget,
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
