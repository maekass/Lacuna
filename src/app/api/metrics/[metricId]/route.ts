import { NextResponse } from "next/server";
import benchmarks from "@/data/computed-benchmarks.json";
import premiums from "@/data/computed-acquirer-premiums.json";

interface MetricRecord {
  readonly metricId: string;
  readonly estimate?: { readonly lineage?: unknown };
  readonly lineage?: unknown;
}

function findMetric(metricId: string): MetricRecord | undefined {
  const benchmark = benchmarks.benchmarks.find((row) =>
    row.medianMoic?.lineage?.metricId === metricId
  );
  if (benchmark) {
    return { metricId, estimate: benchmark.medianMoic };
  }
  const premium = (
    premiums.premiumMetrics as Record<string, {
      estimate: { readonly lineage?: unknown };
    }>
  )[metricId];
  if (premium) return { metricId, estimate: premium.estimate };
  const withheld = [
    ...benchmarks.withheld,
    ...premiums.withheld,
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
