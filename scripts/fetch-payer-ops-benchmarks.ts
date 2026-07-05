#!/usr/bin/env npx tsx
/**
 * Verify public payer-ops benchmark source URLs are reachable and write a snapshot manifest.
 *
 * Usage: npm run payer-ops:benchmarks:fetch
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PAYER_OPS_PUBLIC_BENCHMARKS } from "../src/data/payerOpsBenchmarks";

interface SourceProbe {
  key: string;
  source: string;
  sourceUrl: string;
  value: number | string;
  unit: string;
  httpStatus: number | null;
  ok: boolean;
  contentType: string | null;
  error?: string;
}

function collectBenchmarks(): Array<{
  key: string;
  benchmark: {
    value: number | string;
    unit: string;
    source: string;
    sourceUrl: string;
  };
}> {
  const rows: Array<{
    key: string;
    benchmark: {
      value: number | string;
      unit: string;
      source: string;
      sourceUrl: string;
    };
  }> = [];

  for (const [group, block] of Object.entries(PAYER_OPS_PUBLIC_BENCHMARKS)) {
    if (group === "segmentBindings") continue;
    for (const [name, benchmark] of Object.entries(block)) {
      if (!("sourceUrl" in benchmark)) continue;
      rows.push({ key: `${group}.${name}`, benchmark });
    }
  }

  return rows;
}

async function probeUrl(
  key: string,
  benchmark: {
    value: number | string;
    unit: string;
    source: string;
    sourceUrl: string;
  },
): Promise<SourceProbe> {
  try {
    const res = await fetch(benchmark.sourceUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    return {
      key,
      source: benchmark.source,
      sourceUrl: benchmark.sourceUrl,
      value: benchmark.value,
      unit: benchmark.unit,
      httpStatus: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
    };
  } catch (error) {
    return {
      key,
      source: benchmark.source,
      sourceUrl: benchmark.sourceUrl,
      value: benchmark.value,
      unit: benchmark.unit,
      httpStatus: null,
      ok: false,
      contentType: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const benchmarks = collectBenchmarks();
  const uniqueUrls = new Map<string, SourceProbe>();

  for (const { key, benchmark } of benchmarks) {
    if (uniqueUrls.has(benchmark.sourceUrl)) continue;
    const probe = await probeUrl(key, benchmark);
    uniqueUrls.set(benchmark.sourceUrl, probe);
    const label = probe.ok ? "ok" : "fail";
    console.log(`[${label}] ${probe.httpStatus ?? "ERR"} ${benchmark.sourceUrl}`);
  }

  const outDir = join(process.cwd(), "src/data");
  mkdirSync(outDir, { recursive: true });
  const snapshot = {
    fetchedAt: new Date().toISOString(),
    benchmarkCount: benchmarks.length,
    uniqueSourceUrls: [...uniqueUrls.values()],
  };
  const outPath = join(outDir, "payer-ops-benchmarks.snapshot.json");
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);

  const failed = [...uniqueUrls.values()].filter((row) => !row.ok);
  if (failed.length > 0) {
    console.error(`${failed.length} source URL(s) unreachable — check snapshot.`);
    process.exitCode = 1;
  }
}

main();
