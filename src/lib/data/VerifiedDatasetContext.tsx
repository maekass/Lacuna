'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { VerifiedDataset } from '@/lib/data/datasetTypes';
import { getStaticVerifiedDataset } from '@/lib/data/staticDataset';
import {
  buildVerifiedDerivedData,
  type VerifiedDerivedData,
} from '@/lib/data/verifiedDataHelpers';

const staticDataset = getStaticVerifiedDataset();
const staticDerived = buildVerifiedDerivedData(staticDataset);

const VerifiedDatasetContext = createContext<VerifiedDerivedData>(staticDerived);

interface VerifiedDatasetProviderProps {
  dataset: VerifiedDataset;
  children: ReactNode;
}

export function VerifiedDatasetProvider({ dataset, children }: VerifiedDatasetProviderProps) {
  const value = useMemo(() => buildVerifiedDerivedData(dataset), [dataset]);
  return (
    <VerifiedDatasetContext.Provider value={value}>{children}</VerifiedDatasetContext.Provider>
  );
}

/** Access verified companies, deals, and derived helpers (static or DB-backed). */
export function useVerifiedDataset(): VerifiedDerivedData {
  return useContext(VerifiedDatasetContext);
}

/** Static fallback for modules that cannot use hooks (e.g. lib adapters at import time). */
export function getDefaultVerifiedDerivedData(): VerifiedDerivedData {
  return staticDerived;
}
