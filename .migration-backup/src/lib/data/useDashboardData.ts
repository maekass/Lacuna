"use client";

import { useMemo } from "react";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { getValuationDisparity } from "@/lib/fairness/headlineStat";

/**
 * Shared derived dataset fields for workspace dashboard pages.
 */
export function useDashboardData() {
  const ctx = useVerifiedDataset();
  const {
    verifiedCompanies,
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

  const headlineStats = useMemo(
    () => [
      {
        label: "Companies in our network",
        value: verifiedCompanies.length.toString(),
      },
      {
        label: "Verified deals",
        value: verifiedAcquisitions.length.toString(),
      },
      {
        label: "In disclosed value",
        value: `$${(totalDealValue / 1000).toFixed(1)}B`,
      },
      {
        label: "Public sources cited",
        value: dataProvenance.sources.length.toString(),
      },
    ],
    [
      verifiedCompanies.length,
      verifiedAcquisitions.length,
      totalDealValue,
      dataProvenance.sources.length,
    ],
  );

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
