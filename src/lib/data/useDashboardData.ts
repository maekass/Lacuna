"use client";

import { useMemo } from "react";
import {
  computeHeadlineStats,
  headlineStatsToTiles,
} from "@/lib/data/computeHeadlineStats";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { getValuationDisparity } from "@/lib/fairness/headlineStat";

/**
 * Shared derived dataset fields for workspace dashboard pages.
 */
export function useDashboardData() {
  const ctx = useVerifiedDataset();
  const {
    verifiedCompanies,
    verifiedAcquirers,
    verifiedAcquisitions,
    dataProvenance,
    getVerifiedNetworkNodes,
    getVerifiedNetworkLinks,
    getVerifiedDealsByYear,
    getVerifiedTotalDealValue,
  } = ctx;

  const networkNodes = getVerifiedNetworkNodes();
  const networkLinks = getVerifiedNetworkLinks();
  const dealsByYear = getVerifiedDealsByYear();
  const totalDealValue = getVerifiedTotalDealValue();

  const valuationDisparity = useMemo(
    () => getValuationDisparity(verifiedCompanies),
    [verifiedCompanies],
  );

  const headlineStats = useMemo(() => {
    const stats = computeHeadlineStats({
      companies: verifiedCompanies,
      acquirers: verifiedAcquirers,
      acquisitions: verifiedAcquisitions,
      provenance: dataProvenance,
    });
    return headlineStatsToTiles(stats);
  }, [
    verifiedCompanies,
    verifiedAcquirers,
    verifiedAcquisitions,
    dataProvenance,
  ]);

  return {
    ...ctx,
    networkNodes,
    networkLinks,
    dealsByYear,
    totalDealValue,
    valuationDisparity,
    headlineStats,
  };
}
