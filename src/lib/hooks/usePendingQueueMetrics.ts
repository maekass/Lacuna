import { useCallback, useEffect, useState } from "react";
import type { PendingQueueMetrics } from "@/lib/ingestion/pendingQueueMetrics";

export interface PendingQueueMetricsState {
  metrics: PendingQueueMetrics | null;
  unavailable: boolean;
  loading: boolean;
  refresh: () => void;
}

const METRICS_PATH = "/api/deals/pending/metrics";

/** Shared client fetch for public queue aggregates (one request per mount). */
export function usePendingQueueMetrics(
  refreshToken = 0,
): PendingQueueMetricsState {
  const [metrics, setMetrics] = useState<PendingQueueMetrics | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);

  const refresh = useCallback(() => {
    setLocalRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const response = await fetch(METRICS_PATH);
        const body = await response.json() as PendingQueueMetrics | {
          ok: false;
        };
        if (cancelled) return;
        if (!response.ok || !("ok" in body) || body.ok !== true) {
          setMetrics(null);
          setUnavailable(true);
          return;
        }
        setMetrics(body);
        setUnavailable(false);
      } catch {
        if (!cancelled) {
          setMetrics(null);
          setUnavailable(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, localRefresh]);

  return { metrics, unavailable, loading, refresh };
}
