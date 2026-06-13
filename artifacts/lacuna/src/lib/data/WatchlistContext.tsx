"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { VerifiedCompanyView } from "./verifiedDataHelpers";

interface WatchlistItem {
  companyId: string;
  companyName: string;
  sector: string;
  addedAt: string; // ISO date
  notes?: string;
  tags: string[]; // e.g., "maternal-health", "high-evidence", "nih-relevant"
}

interface WatchlistContextValue {
  items: WatchlistItem[];
  isInWatchlist: (companyId: string) => boolean;
  addToWatchlist: (
    company: VerifiedCompanyView,
    notes?: string,
    tags?: string[],
  ) => void;
  removeFromWatchlist: (companyId: string) => void;
  toggleWatchlist: (company: VerifiedCompanyView) => void;
  updateNotes: (companyId: string, notes: string) => void;
  updateTags: (companyId: string, tags: string[]) => void;
  clearWatchlist: () => void;
  exportWatchlist: () => string; // CSV
  maternalHealthItems: WatchlistItem[];
  highEvidenceItems: WatchlistItem[];
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

const STORAGE_KEY = "lacuna-watchlist-v1";

function loadFromStorage(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>(loadFromStorage);

  const isInWatchlist = useCallback(
    (companyId: string) => items.some((i) => i.companyId === companyId),
    [items],
  );

  const addToWatchlist = useCallback(
    (company: VerifiedCompanyView, notes?: string, tags?: string[]) => {
      setItems((prev) => {
        if (prev.some((i) => i.companyId === company.id)) return prev;
        const next: WatchlistItem = {
          companyId: company.id,
          companyName: company.name,
          sector: company.sector,
          addedAt: new Date().toISOString(),
          notes,
          tags: tags ?? [],
        };
        const updated = [...prev, next];
        saveToStorage(updated);
        return updated;
      });
    },
    [],
  );

  const removeFromWatchlist = useCallback((companyId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.companyId !== companyId);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const toggleWatchlist = useCallback(
    (company: VerifiedCompanyView) => {
      if (isInWatchlist(company.id)) {
        removeFromWatchlist(company.id);
      } else {
        addToWatchlist(company);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist],
  );

  const updateNotes = useCallback((companyId: string, notes: string) => {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.companyId === companyId ? { ...i, notes } : i
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const updateTags = useCallback((companyId: string, tags: string[]) => {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.companyId === companyId ? { ...i, tags } : i
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearWatchlist = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  const exportWatchlist = useCallback(() => {
    const header = "company_id,company_name,sector,added_at,notes,tags";
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = items.map((i) =>
      [
        i.companyId,
        escapeCsv(i.companyName),
        i.sector,
        i.addedAt,
        i.notes ? escapeCsv(i.notes) : "",
        i.tags.join(";"),
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }, [items]);

  const maternalHealthItems = useMemo(
    () => items.filter((i) => i.tags.includes("maternal-health")),
    [items],
  );

  const highEvidenceItems = useMemo(
    () => items.filter((i) => i.tags.includes("high-evidence")),
    [items],
  );

  const value: WatchlistContextValue = {
    items,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    updateNotes,
    updateTags,
    clearWatchlist,
    exportWatchlist,
    maternalHealthItems,
    highEvidenceItems,
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
