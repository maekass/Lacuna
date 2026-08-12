import { NextResponse } from "next/server";
import benchmarks from "@/data/computed-benchmarks.json";
import premiums from "@/data/computed-acquirer-premiums.json";
import confidenceIntervals from "@/data/computed-confidence-intervals.json";
import correlations from "@/data/computed-sector-correlations.json";

interface MetricRecord {
  readonly metricId: string;
  readonly estimate?: { readonly lineage?: unknown };
  readonly lineage?: unknown;
}

function isMetricEstimate(
  value: unknown,
): value is { readonly lineage?: { readonly metricId?: string } } {
  return typeof value === "object" && value !== null;
}

function findMetric(metricId: string): MetricRecord | undefined {
  for (const row of benchmarks.benchmarks) {
    for (const value of Object.values(row)) {
      if (
        isMetricEstimate(value) &&
        value.lineage?.metricId === metricId
      ) return { metricId, estimate: value };
    }
  }
  const premium = (
    premiums.premiumMetrics as Record<string, {
      estimate: { readonly lineage?: unknown };
    }>
  )[metricId];
  if (premium) return { metricId, estimate: premium.estimate };
  const confidence = confidenceIntervals.results.find((result) =>
    result.metricId === metricId
  );
  if (confidence) return { metricId, estimate: confidence.estimate };
  const withheld = [
    ...benchmarks.withheld,
    ...premiums.withheld,
    ...confidenceIntervals.withheld,
    ...correlations.withheld,
  ].find((entry) => entry.metricId === metricId);
  return withheld ? { metricId, lineage: withheld.lineage } : undefined;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ metricId: string }> },
) {
  const { metricId } = await context.params;
  if (!/^[a-z0-9][a-z0-9.-]{1,127}$/i.test(metricId)) {
    return NextResponse.json({ error: "Invalid metric ID" }, { status: 400 });
  }
  const metric = findMetric(decodeURIComponent(metricId));
  if (!metric) {
    return NextResponse.json({ error: "Metric not found" }, { status: 404 });
  }
  return NextResponse.json(metric, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
