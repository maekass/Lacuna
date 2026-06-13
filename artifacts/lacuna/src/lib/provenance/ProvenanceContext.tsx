"use client";

import { createContext, useContext } from "react";

interface ProvenanceContextValue {
  /** When true, panel-level CuratedDatasetBanner strips hide (global bar shown). */
  globalBarActive: boolean;
}

const ProvenanceContext = createContext<ProvenanceContextValue>({
  globalBarActive: false,
});

export function ProvenanceProvider({
  children,
  globalBarActive = true,
}: {
  children: React.ReactNode;
  globalBarActive?: boolean;
}) {
  return (
    <ProvenanceContext.Provider value={{ globalBarActive }}>
      {children}
    </ProvenanceContext.Provider>
  );
}

export function useProvenanceContext(): ProvenanceContextValue {
  return useContext(ProvenanceContext);
}
