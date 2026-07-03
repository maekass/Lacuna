#!/usr/bin/env npx tsx
/**
 * Tier 2 — CMS bulk metadata download (Physician Fee Schedule catalog).
 * Full utilization per CPT is in scripts/fetch-cms-utilization.ts.
 *
 * Usage: npm run download:cms-bulk
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CMS_CATALOG = "https://data.cms.gov/data-api/v1/dataset";
const PFS_DATASETS = [
  {
    id: "5fr2-m4x3",
    label: "Medicare Physician & Other Practitioners by Provider and Service",
  },
  {
    id: "ee48eab1-83e3-4f23-9f27-ef5c7e4c7c0f",
    label: "Medicare Provider Utilization and Payment Data (alt)",
  },
] as const;

async function probeDataset(id: string): Promise<{
  id: string;
  ok: boolean;
  status: number;
  sampleUrl: string;
}> {
  const sampleUrl = `${CMS_CATALOG}/${id}/data?size=1`;
  try {
    const res = await fetch(sampleUrl, {
      headers: { "User-Agent": "Lacuna-Research/1.0 (educational)" },
    });
    return { id, ok: res.ok, status: res.status, sampleUrl };
  } catch {
    return { id, ok: false, status: 0, sampleUrl };
  }
}

async function main() {
  const results = await Promise.all(
    PFS_DATASETS.map((d) => probeDataset(d.id)),
  );

  const outDir = join(process.cwd(), "data/exports/cms-bulk");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const manifest = {
    downloadedAt: new Date().toISOString(),
    catalogBase: CMS_CATALOG,
    datasets: PFS_DATASETS.map((d, i) => ({
      ...d,
      probe: results[i],
    })),
    notes: [
      "Run npm run fetch:cms-utilization for women's-health CPT utilization JSON.",
      "Attribution: CMS open data — cite data.cms.gov.",
    ],
  };

  const outPath = join(outDir, `manifest-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath}`);
  for (const r of results) {
    console.log(`  ${r.id}: HTTP ${r.status} ${r.ok ? "OK" : "FAIL"}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
