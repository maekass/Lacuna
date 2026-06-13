import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { FreeApiDownloadManifest } from "./types";

const EXPORTS_ROOT = join(process.cwd(), "data/exports/free-apis");

export interface FreeApiExportSummary {
  directory: string;
  manifest: FreeApiDownloadManifest;
  entityFileCount: number;
}

/**
 * Returns the newest batch export under data/exports/free-apis/, if any.
 * Export folders are ISO timestamps (sortable lexicographically).
 */
export function readLatestFreeApiExport(): FreeApiExportSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(EXPORTS_ROOT).filter((name) => {
      if (name === "README.md") return false;
      try {
        return statSync(join(EXPORTS_ROOT, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return null;
  }

  if (entries.length === 0) return null;

  const latestDir = entries.sort().at(-1);
  if (!latestDir) return null;

  const directory = join(EXPORTS_ROOT, latestDir);
  const manifestPath = join(directory, "manifest.json");

  let manifest: FreeApiDownloadManifest;
  try {
    manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as FreeApiDownloadManifest;
  } catch {
    return null;
  }

  let entityFileCount = 0;
  try {
    const entitiesDir = join(directory, "entities");
    entityFileCount = readdirSync(entitiesDir).filter((f) =>
      f.endsWith(".json")
    ).length;
  } catch {
    entityFileCount = 0;
  }

  return { directory, manifest, entityFileCount };
}
