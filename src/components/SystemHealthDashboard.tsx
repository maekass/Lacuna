"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

interface HealthCheck {
  name: string;
  endpoint: string;
  status: "healthy" | "degraded" | "down" | "checking";
  latencyMs: number | null;
  lastChecked: Date | null;
  error?: string;
}

interface RateLimitStatus {
  service: string;
  limit: number;
  remaining: number;
  resetAt: Date | null;
  window: string;
}

const INITIAL_CHECKS: HealthCheck[] = [
  {
    name: "Dataset API",
    endpoint: "/api/dataset/verified",
    status: "checking",
    latencyMs: null,
    lastChecked: null,
  },
  {
    name: "Gamma API",
    endpoint: "/api/gamma/generate",
    status: "checking",
    latencyMs: null,
    lastChecked: null,
  },
  {
    name: "ClinicalTrials.gov",
    endpoint: "https://clinicaltrials.gov/api/v2/version",
    status: "checking",
    latencyMs: null,
    lastChecked: null,
  },
  {
    name: "Build Status",
    endpoint: "__build_check__",
    status: "checking",
    latencyMs: null,
    lastChecked: null,
  },
];

function useHealthChecks() {
  const [checks, setChecks] = useState<HealthCheck[]>(INITIAL_CHECKS);
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = useCallback(
    async (check: HealthCheck): Promise<HealthCheck> => {
      const start = performance.now();

      try {
        if (check.endpoint === "__build_check__") {
          // Simulated build check - in production this would check deployment status
          await new Promise((r) => setTimeout(r, 100));
          return {
            ...check,
            status: "healthy",
            latencyMs: Math.round(performance.now() - start),
            lastChecked: new Date(),
          };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(check.endpoint, {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeout);
        const latency = Math.round(performance.now() - start);

        if (response.ok || response.status === 405) {
          return {
            ...check,
            status: latency > 1000 ? "degraded" : "healthy",
            latencyMs: latency,
            lastChecked: new Date(),
          };
        }

        return {
          ...check,
          status: response.status >= 500 ? "down" : "degraded",
          latencyMs: latency,
          lastChecked: new Date(),
          error: `HTTP ${response.status}`,
        };
      } catch (err) {
        return {
          ...check,
          status: "down",
          latencyMs: null,
          lastChecked: new Date(),
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [],
  );

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);
    const results = await Promise.all(INITIAL_CHECKS.map(runCheck));
    setChecks(results);
    setIsRunning(false);
  }, [runCheck]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runAllChecks();
    }, 0);
    const interval = setInterval(() => void runAllChecks(), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [runAllChecks]);

  return { checks, isRunning, runAllChecks };
}

function StatusBadge({ status }: { status: HealthCheck["status"] }) {
  const styles = {
    healthy: "bg-emerald-100 text-emerald-800 border-emerald-200",
    degraded: "bg-amber-100 text-amber-800 border-amber-200",
    down: "bg-red-100 text-red-800 border-red-200",
    checking: "bg-slate-100 text-slate-600 border-slate-200 animate-pulse",
  };

  const labels = {
    healthy: "Healthy",
    degraded: "Degraded",
    down: "Down",
    checking: "Checking...",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium border ${
        styles[status]
      }`}
    >
      {labels[status]}
    </span>
  );
}

export default function SystemHealthDashboard() {
  const { checks, isRunning, runAllChecks } = useHealthChecks();

  const stats = useMemo(() => {
    const total = checks.length;
    const healthy = checks.filter((c) => c.status === "healthy").length;
    const degraded = checks.filter((c) => c.status === "degraded").length;
    const down = checks.filter((c) => c.status === "down").length;
    const avgLatency = checks
          .filter((c) => c.latencyMs !== null)
          .reduce((sum, c) => sum + (c.latencyMs || 0), 0) /
        checks.filter((c) => c.latencyMs !== null).length || 0;

    return { total, healthy, degraded, down, avgLatency };
  }, [checks]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-lacuna-plum">
              System Health
            </h3>
            <p className="text-sm text-lacuna-blue">
              API endpoint monitoring and latency tracking
            </p>
          </div>
          <button
            onClick={runAllChecks}
            disabled={isRunning}
            className="px-3 py-1.5 text-sm font-medium bg-lacuna-lavender/25 text-lacuna-plum rounded-lg hover:bg-lacuna-lavender/40 disabled:opacity-50 transition-colors"
          >
            {isRunning ? "Checking..." : "Refresh"}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-700">
              {stats.healthy}
            </div>
            <div className="text-xs text-emerald-600">Healthy</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <div className="text-2xl font-bold text-amber-700">
              {stats.degraded}
            </div>
            <div className="text-xs text-amber-600">Degraded</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <div className="text-2xl font-bold text-red-700">{stats.down}</div>
            <div className="text-xs text-red-600">Down</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-2xl font-bold text-slate-700">
              {stats.avgLatency > 0 ? `${Math.round(stats.avgLatency)}ms` : "-"}
            </div>
            <div className="text-xs text-slate-600">Avg Latency</div>
          </div>
        </div>

        {/* Health Check Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-lacuna-lavender/10">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Service
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-lacuna-plum uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-lacuna-plum uppercase">
                  Latency
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-lacuna-plum uppercase">
                  Last Check
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lacuna-lavender/20">
              {checks.map((check) => (
                <motion.tr
                  key={check.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-lacuna-lavender/5"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-lacuna-plum">
                      {check.name}
                    </div>
                    {check.error && (
                      <div className="text-xs text-red-600">{check.error}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={check.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-lacuna-blue">
                    {check.latencyMs !== null ? `${check.latencyMs}ms` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-lacuna-blue">
                    {check.lastChecked
                      ? new Date(check.lastChecked).toLocaleTimeString()
                      : "-"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <strong>Developer Note:</strong>{" "}
            Health checks run automatically every 60 seconds. ClinicalTrials.gov
            has a rate limit of 10 requests/second. Gamma API requires valid API
            key.
          </p>
        </div>
      </Card>
    </div>
  );
}
