"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { VerifiedDataset } from "@/lib/data/datasetTypes";
import {
  buildVerifiedDerivedData,
  type VerifiedDerivedData,
} from "@/lib/data/verifiedDataHelpers";

const VerifiedDatasetContext = createContext<VerifiedDerivedData | null>(null);

interface VerifiedDatasetProviderProps {
  dataset: VerifiedDataset;
  children: ReactNode;
}

export function VerifiedDatasetProvider(
  { dataset, children }: VerifiedDatasetProviderProps,
) {
  const value = useMemo(() => buildVerifiedDerivedData(dataset), [dataset]);
  return (
    <VerifiedDatasetContext.Provider value={value}>
      {children}
    </VerifiedDatasetContext.Provider>
  );
}

/** Access verified companies, deals, and derived helpers (from server-provided dataset only). */
export function useVerifiedDataset(): VerifiedDerivedData {
  const value = useContext(VerifiedDatasetContext);
  if (!value) {
    throw new Error(
      "useVerifiedDataset requires VerifiedDatasetProvider with a dataset prop",
    );
  }
  return value;
}
